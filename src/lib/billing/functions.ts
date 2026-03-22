/**
 * Billing Server Functions
 *
 * TanStack Start server functions for billing operations including:
 * - Subscription management
 * - Credit purchases and usage
 * - Plan information
 * - Customer portal access
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import z from "zod";
import { auth } from "@/lib/auth/auth";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { creditBalance, creditTransaction, user } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate } from "@/lib/validation";
import {
  getBillingProvider,
  isStripeEnabled,
  isPolarEnabled,
  getActivePlans,
  getPlan,
  getStripePriceId,
  formatPrice,
  PLANS,
  type BillingProvider,
} from "./plans";
import {
  CREDIT_PACKAGES,
  getCreditBalance,
  getCreditTransactions,
  grantCredits,
  spendCredits,
  hasEnoughCredits,
  getActionCost,
  getCreditPackage,
  type CreditAction,
} from "./credits";
import {
  stripeClient,
  createCreditsCheckout as createStripeCreditsCheckout,
  getCustomerPortalUrl as getStripePortalUrl,
  createStripeCustomer,
} from "./stripe-plugin";
import {
  polarSdkClient,
  createPolarCheckout,
  createPolarPortalSession,
  getPolarCustomerByExternalId,
  listPolarSubscriptions,
  cancelPolarSubscription,
} from "./polar-plugin";
import Stripe from "stripe";

// =============================================================================
// Helper: Get authenticated user
// =============================================================================

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
    returnHeaders: true,
  });

  const cookies = session.headers?.getSetCookie();
  if (cookies?.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  if (!session.response?.user) {
    throw new Error("Unauthorized");
  }

  return session.response.user;
}

// =============================================================================
// Plan & Subscription Functions
// =============================================================================

/**
 * Get available subscription plans
 */
export const $getPlans = createServerFn({ method: "GET" }).handler(async () => {
  const provider = getBillingProvider();
  const plans = getActivePlans();

  return {
    provider,
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      features: plan.features,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      priceMonthlyFormatted: formatPrice(plan.priceMonthly, plan.currency),
      priceYearlyFormatted: formatPrice(plan.priceYearly, plan.currency),
      currency: plan.currency,
      limits: plan.limits,
      trialDays: plan.trialDays,
      isPopular: plan.isPopular,
      isFree: plan.priceMonthly === 0,
    })),
  };
});

/**
 * Get the current user's subscription status
 * Works with both Stripe and Polar
 */
export const $getSubscription = createServerFn({ method: "GET" }).handler(async () => {
  const authUser = await getAuthenticatedUser();
  const provider = getBillingProvider();

  if (provider === "none") {
    return {
      provider: "none" as const,
      hasSubscription: false,
      plan: getPlan("free"),
      subscription: null,
    };
  }

  // For Stripe, the subscription data is managed by Better Auth plugin
  // We can query it through the session or database
  if (provider === "stripe" && isStripeEnabled()) {
    // Get user's Stripe customer ID from user record
    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (!userRecord?.stripeCustomerId || !stripeClient) {
      return {
        provider: "stripe" as const,
        hasSubscription: false,
        plan: getPlan("free"),
        subscription: null,
      };
    }

    try {
      // Fetch subscriptions from Stripe - include both active and trialing
      // Trial subscriptions are still valid subscriptions
      const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
        stripeClient.subscriptions.list({
          customer: userRecord.stripeCustomerId,
          status: "active",
          limit: 1,
        }),
        stripeClient.subscriptions.list({
          customer: userRecord.stripeCustomerId,
          status: "trialing",
          limit: 1,
        }),
      ]);

      // Prefer active over trialing
      const subscriptionData = activeSubscriptions.data[0] || trialingSubscriptions.data[0];

      if (!subscriptionData) {
        return {
          provider: "stripe" as const,
          hasSubscription: false,
          plan: getPlan("free"),
          subscription: null,
        };
      }

      const sub = subscriptionData as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const starts = sub.items.data.map(i => i.current_period_start).filter(Boolean) as number[];
      const ends = sub.items.data.map(i => i.current_period_end).filter(Boolean) as number[];

      const currentPeriodStart = starts.length ? Math.max(...starts) : null; // “max start”
      const currentPeriodEnd = ends.length ? Math.min(...ends) : null;       // “min end”
      // Find matching plan
      const matchedPlan = PLANS.find(p => {
        // Check against env price IDs
        const monthlyId = process.env[`STRIPE_${p.id.toUpperCase()}_MONTHLY_PRICE_ID`];
        const yearlyId = process.env[`STRIPE_${p.id.toUpperCase()}_YEARLY_PRICE_ID`];
        return monthlyId === priceId || yearlyId === priceId;
      });

      return {
        provider: "stripe" as const,
        hasSubscription: true,
        plan: matchedPlan || getPlan("pro"),
        subscription: {
          id: sub.id,
          status: sub.status,
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
      };
    } catch (error) {
      console.error("[Billing] Error fetching Stripe subscription:", error);
      return {
        provider: "stripe" as const,
        hasSubscription: false,
        plan: getPlan("free"),
        subscription: null,
        error: "Failed to fetch subscription",
      };
    }
  }

  // For Polar
  if (provider === "polar" && isPolarEnabled()) {
    try {
      const customer = await getPolarCustomerByExternalId(authUser.id);
      if (!customer) {
        return {
          provider: "polar" as const,
          hasSubscription: false,
          plan: getPlan("free"),
          subscription: null,
        };
      }

      const subscriptions = await listPolarSubscriptions(customer.id);
      const activeSub = subscriptions.find((s: any) => s.status === "active");

      if (!activeSub) {
        return {
          provider: "polar" as const,
          hasSubscription: false,
          plan: getPlan("free"),
          subscription: null,
        };
      }

      // Find matching plan by product ID
      const matchedPlan = PLANS.find(p => {
        const productId = process.env[`POLAR_${p.id.toUpperCase()}_PRODUCT_ID`];
        return productId === activeSub.productId;
      });

      return {
        provider: "polar" as const,
        hasSubscription: true,
        plan: matchedPlan || getPlan("pro"),
        subscription: {
          id: activeSub.id,
          status: activeSub.status,
          currentPeriodStart: new Date(activeSub.currentPeriodStart),
          currentPeriodEnd: new Date(activeSub.currentPeriodEnd),
          cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
        },
      };
    } catch (error) {
      console.error("[Billing] Error fetching Polar subscription:", error);
      return {
        provider: "polar" as const,
        hasSubscription: false,
        plan: getPlan("free"),
        subscription: null,
        error: "Failed to fetch subscription",
      };
    }
  }

  return {
    provider: "none" as const,
    hasSubscription: false,
    plan: getPlan("free"),
    subscription: null,
  };
});

/**
 * Create a checkout session for subscription
 */
const CreateSubscriptionCheckoutSchema = z.object({
  planId: z.string(),
  interval: z.enum(["month", "year"]),
});

export const $createSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateSubscriptionCheckoutSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider === "none") {
      throw new Error("Billing is not configured");
    }

    const plan = getPlan(data.planId);
    if (!plan || plan.priceMonthly === 0) {
      throw new Error("Invalid plan");
    }

    const baseUrl = process.env.VITE_BASE_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/billing?success=true&plan=${data.planId}`;
    const cancelUrl = `${baseUrl}/billing?canceled=true`;

    // Stripe checkout uses Better Auth's built-in subscription.upgrade method
    // This is just a fallback/manual checkout creator
    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      const priceId = getStripePriceId(data.planId, data.interval);

      if (!priceId) {
        throw new Error(`Price ID not configured for plan: ${data.planId}. Please add STRIPE_${data.planId.toUpperCase()}_${data.interval.toUpperCase()}LY_PRICE_ID to your environment variables.`);
      }

      // Get or create customer
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      let customerId = userRecord?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: authUser.email,
          name: authUser.name || undefined,
          metadata: { userId: authUser.id },
        });
        customerId = customer.id;

        // Update user with customer ID
        await db
          .update(user)
          .set({ stripeCustomerId: customerId })
          .where(eq(user.id, authUser.id));
      }

      // Get customer's default payment method to pre-select it
      const customer = await stripeClient.customers.retrieve(customerId);
      const defaultPaymentMethod = typeof customer !== "string" && !customer.deleted
        ? customer.invoice_settings?.default_payment_method as string | undefined
        : undefined;

      const session = await stripeClient.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
          metadata: {
            userId: authUser.id,
            planId: data.planId,
          },
          // Use existing default payment method if available
          ...(defaultPaymentMethod && { default_payment_method: defaultPaymentMethod }),
        },
        metadata: {
          userId: authUser.id,
          planId: data.planId,
        },
        // Allow using saved payment methods - don't force new card entry
        payment_method_collection: defaultPaymentMethod ? "if_required" : "always",
        // Prevent saving duplicate cards
        saved_payment_method_options: {
          payment_method_save: "disabled",
        },
        // Update customer address if needed
        customer_update: {
          address: "auto",
        },
      });

      return {
        provider: "stripe" as const,
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }

    // Polar checkout
    if (provider === "polar" && isPolarEnabled()) {
      const productId = process.env[`POLAR_${data.planId.toUpperCase()}_PRODUCT_ID`];
      if (!productId) {
        throw new Error(`Product ID not configured for plan: ${data.planId}`);
      }

      const checkout = await createPolarCheckout({
        productId,
        customerEmail: authUser.email,
        customerExternalId: authUser.id,
        successUrl,
        metadata: {
          userId: authUser.id,
          planId: data.planId,
          interval: data.interval,
        },
      });

      return {
        provider: "polar" as const,
        checkoutUrl: checkout.url,
        sessionId: checkout.sessionId,
      };
    }

    throw new Error("No billing provider configured");
  }
  );

/**
 * Cancel subscription
 */
const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const $cancelSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CancelSubscriptionSchema.parse(data))
  .handler(async ({ data }) => {
    await getAuthenticatedUser();
    const provider = getBillingProvider();
    const cancelAtEnd = data.cancelAtPeriodEnd ?? true;

    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      const subscription = await stripeClient.subscriptions.update(data.subscriptionId, {
        cancel_at_period_end: cancelAtEnd,
      });

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      };
    }

    if (provider === "polar" && isPolarEnabled()) {
      const result = await cancelPolarSubscription(data.subscriptionId, cancelAtEnd);
      return {
        success: true,
        subscription: result,
      };
    }

    throw new Error("No billing provider configured");
  }
  );

/**
 * Get customer portal URL
 * Creates a Stripe customer if one doesn't exist
 */
export const $getPortalUrl = createServerFn({ method: "GET" }).handler(async () => {
  const authUser = await getAuthenticatedUser();
  const provider = getBillingProvider();
  const returnUrl = `${process.env.VITE_BASE_URL}/billing`;

  if (provider === "stripe" && isStripeEnabled()) {
    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    let customerId = userRecord?.stripeCustomerId;

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      customerId = await createStripeCustomer({
        email: userRecord?.email || authUser.email,
        name: userRecord?.name || undefined,
        userId: authUser.id,
      });

      // Save the customer ID to the user record
      await db
        .update(user)
        .set({ stripeCustomerId: customerId })
        .where(eq(user.id, authUser.id));

      console.log(`[Billing] Created Stripe customer ${customerId} for user ${authUser.id}`);
    }

    const url = await getStripePortalUrl(customerId, returnUrl);
    return { provider: "stripe" as const, url };
  }

  if (provider === "polar" && isPolarEnabled()) {
    const customer = await getPolarCustomerByExternalId(authUser.id);
    if (!customer) {
      throw new Error("No billing account found");
    }

    const session = await createPolarPortalSession(customer.id);
    return { provider: "polar" as const, url: session.url };
  }

  throw new Error("No billing provider configured");
});

/**
 * Get user's payment methods
 * Creates a Stripe customer if one doesn't exist
 */
export const $getPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const authUser = await getAuthenticatedUser();
  const provider = getBillingProvider();

  if (provider === "stripe" && isStripeEnabled() && stripeClient) {
    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    let customerId = userRecord?.stripeCustomerId;

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      customerId = await createStripeCustomer({
        email: userRecord?.email || authUser.email,
        name: userRecord?.name || undefined,
        userId: authUser.id,
      });

      // Save the customer ID to the user record
      await db
        .update(user)
        .set({ stripeCustomerId: customerId })
        .where(eq(user.id, authUser.id));

      console.log(`[Billing] Created Stripe customer ${customerId} for user ${authUser.id}`);

      // New customer has no payment methods yet
      return {
        provider: "stripe" as const,
        hasPaymentMethod: false,
        paymentMethods: [],
        defaultPaymentMethodId: null,
      };
    }

    try {
      // Get customer to check default payment method
      const customer = await stripeClient.customers.retrieve(customerId);
      const defaultPaymentMethodId = !("deleted" in customer)
        ? (customer.invoice_settings?.default_payment_method as string | null)
        : null;

      // Get all payment methods
      const paymentMethods = await stripeClient.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      return {
        provider: "stripe" as const,
        hasPaymentMethod: paymentMethods.data.length > 0,
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          } : null,
          isDefault: pm.id === defaultPaymentMethodId,
        })),
        defaultPaymentMethodId,
      };
    } catch (error) {
      console.error("[Billing] Error fetching payment methods:", error);
      return {
        provider: "stripe" as const,
        hasPaymentMethod: false,
        paymentMethods: [],
        defaultPaymentMethodId: null,
        error: "Failed to fetch payment methods",
      };
    }
  }

  if (provider === "polar" && isPolarEnabled()) {
    // Polar handles payment methods through their checkout flow
    return {
      provider: "polar" as const,
      hasPaymentMethod: true, // Polar manages this internally
      paymentMethods: [],
      defaultPaymentMethodId: null,
    };
  }

  return {
    provider: "none" as const,
    hasPaymentMethod: false,
    paymentMethods: [],
    defaultPaymentMethodId: null,
  };
});

/**
 * Create a setup intent for adding a new payment method
 */
export const $createSetupIntent = createServerFn({ method: "POST" }).handler(async () => {
  const authUser = await getAuthenticatedUser();
  const provider = getBillingProvider();

  if (provider !== "stripe" || !isStripeEnabled() || !stripeClient) {
    throw new Error("Stripe is not configured");
  }

  // Get or create customer
  const [userRecord] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, authUser.id))
    .limit(1);

  let customerId = userRecord?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripeClient.customers.create({
      email: authUser.email,
      name: authUser.name || undefined,
      metadata: { userId: authUser.id },
    });
    customerId = customer.id;

    await db
      .update(user)
      .set({ stripeCustomerId: customerId })
      .where(eq(user.id, authUser.id));
  }

  const setupIntent = await stripeClient.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { userId: authUser.id },
  });

  return {
    clientSecret: setupIntent.client_secret,
    customerId,
  };
});

/**
 * Set default payment method
 */
const SetDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

export const $setDefaultPaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SetDefaultPaymentMethodSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider !== "stripe" || !isStripeEnabled() || !stripeClient) {
      throw new Error("Stripe is not configured");
    }

    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (!userRecord?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    await stripeClient.customers.update(userRecord.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: data.paymentMethodId,
      },
    });

    return { success: true };
  });

/**
 * Delete a payment method
 */
const DeletePaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

export const $deletePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeletePaymentMethodSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider !== "stripe" || !isStripeEnabled() || !stripeClient) {
      throw new Error("Stripe is not configured");
    }

    // Verify the payment method belongs to this user
    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (!userRecord?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const paymentMethod = await stripeClient.paymentMethods.retrieve(data.paymentMethodId);
    if (paymentMethod.customer !== userRecord.stripeCustomerId) {
      throw new Error("Payment method not found");
    }

    await stripeClient.paymentMethods.detach(data.paymentMethodId);

    return { success: true };
  });

// =============================================================================
// Credit Functions
// =============================================================================

/**
 * Get user's credit balance and recent transactions
 */

type CreditTxType = "purchase" | "bonus" | "usage" | "refund";
export const $getCredits = createServerFn({ method: "GET" }).handler(async () => {
  const authUser = await getAuthenticatedUser();

  const [balance, transactions] = await Promise.all([
    getCreditBalance(authUser.id),
    getCreditTransactions(authUser.id, 20),
  ]);

  return {
    balance,
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type as CreditTxType,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt,
    })),
  };
});

/**
 * Get available credit packages
 */
export const $getCreditPackages = createServerFn({ method: "GET" }).handler(async () => {
  return {
    packages: CREDIT_PACKAGES.map(pkg => ({
      ...pkg,
      priceFormatted: formatPrice(pkg.priceInCents, pkg.currency),
    })),
  };
});

/**
 * Create checkout for credit purchase
 */
const PurchaseCreditsSchema = z.object({
  packageId: z.string(),
});

export const $purchaseCredits = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PurchaseCreditsSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    const pkg = getCreditPackage(data.packageId);
    if (!pkg) {
      throw new Error("Invalid credit package");
    }

    const baseUrl = process.env.VITE_BASE_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/billing?credits_success=true&package=${data.packageId}`;
    const cancelUrl = `${baseUrl}/billing?credits_canceled=true`;

    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      // Get or create customer
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      let customerId = userRecord?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: authUser.email,
          name: authUser.name || undefined,
          metadata: { userId: authUser.id },
        });
        customerId = customer.id;

        await db
          .update(user)
          .set({ stripeCustomerId: customerId })
          .where(eq(user.id, authUser.id));
      }

      const checkout = await createStripeCreditsCheckout({
        customerId,
        userId: authUser.id,
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        amountCents: pkg.priceInCents,
        currency: pkg.currency,
        successUrl,
        cancelUrl,
      });

      return {
        provider: "stripe" as const,
        checkoutUrl: checkout.url,
        sessionId: checkout.sessionId,
      };
    }

    if (provider === "polar" && isPolarEnabled()) {
      // For Polar, we need a product ID for credit packages
      // This would need to be configured in env
      const productId = process.env[`POLAR_CREDITS_${data.packageId.toUpperCase()}_PRODUCT_ID`];
      if (!productId) {
        throw new Error("Credit package not configured for Polar. Create products in Polar dashboard.");
      }

      const checkout = await createPolarCheckout({
        productId,
        customerEmail: authUser.email,
        customerExternalId: authUser.id,
        successUrl,
        metadata: {
          type: "credits",
          userId: authUser.id,
          packageId: pkg.id,
          credits: String(pkg.credits),
        },
      });

      return {
        provider: "polar" as const,
        checkoutUrl: checkout.url,
        sessionId: checkout.sessionId,
      };
    }

    throw new Error("No billing provider configured");
  }
  );

/**
 * Verify and fulfill a credit purchase after successful checkout
 * This is called when the user returns from checkout with success=true
 * It verifies the payment was successful and grants credits if not already done
 */
const VerifyCreditPurchaseSchema = z.object({
  sessionId: z.string().optional(),
  packageId: z.string(),
});

export const $verifyCreditPurchase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => VerifyCreditPurchaseSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    const pkg = getCreditPackage(data.packageId);
    if (!pkg) {
      return { ok: false, error: "Invalid credit package" };
    }

    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      // If we have a session ID, verify it
      if (data.sessionId) {
        try {
          const session = await stripeClient.checkout.sessions.retrieve(data.sessionId);

          // Verify the session belongs to this user and is completed
          if (session.status !== "complete") {
            return { ok: false, error: "Payment not completed" };
          }

          // Check metadata matches
          if (session.metadata?.userId !== authUser.id || session.metadata?.type !== "credits") {
            return { ok: false, error: "Invalid session" };
          }

          // Grant credits (grantCredits handles deduplication via providerPaymentId)
          const result = await grantCredits({
            userId: authUser.id,
            amount: pkg.credits,
            type: "purchase",
            description: `Purchased ${pkg.name}`,
            provider: "stripe",
            providerPaymentId: session.payment_intent as string,
            metadata: {
              packageId: pkg.id,
              sessionId: data.sessionId,
            },
          });

          return {
            ok: true,
            credits: pkg.credits,
            newBalance: result.newBalance,
            alreadyProcessed: false,
          };
        } catch (error) {
          console.error("[Billing] Error verifying credit purchase:", error);
          return { ok: false, error: "Failed to verify payment" };
        }
      }

      // If no session ID, try to find recent completed checkout for this user and package
      // This handles the case where the session ID wasn't passed in the URL
      try {
        const [userRecord] = await db
          .select({ stripeCustomerId: user.stripeCustomerId })
          .from(user)
          .where(eq(user.id, authUser.id))
          .limit(1);

        if (userRecord?.stripeCustomerId) {
          const sessions = await stripeClient.checkout.sessions.list({
            customer: userRecord.stripeCustomerId,
            limit: 5,
          });

          // Find a recent completed credits session for this package
          const matchingSession = sessions.data.find(
            s => s.status === "complete" &&
                 s.metadata?.type === "credits" &&
                 s.metadata?.packageId === data.packageId &&
                 s.metadata?.userId === authUser.id
          );

          if (matchingSession) {
            const result = await grantCredits({
              userId: authUser.id,
              amount: pkg.credits,
              type: "purchase",
              description: `Purchased ${pkg.name}`,
              provider: "stripe",
              providerPaymentId: matchingSession.payment_intent as string,
              metadata: {
                packageId: pkg.id,
                sessionId: matchingSession.id,
              },
            });

            return {
              ok: true,
              credits: pkg.credits,
              newBalance: result.newBalance,
            };
          }
        }
      } catch (error) {
        console.error("[Billing] Error finding credit purchase session:", error);
      }

      return { ok: false, error: "No matching payment found" };
    }

    // For Polar, similar logic would go here
    if (provider === "polar" && isPolarEnabled()) {
      // Polar webhook should handle this, but we could add verification here
      return { ok: false, error: "Polar verification not implemented - credits granted via webhook" };
    }

    return { ok: false, error: "No billing provider configured" };
  });

/**
 * Use credits for an action
 */
const UseCreditsSchema = z.object({
  action: z.string(),
  quantity: z.number().optional(),
  description: z.string().optional(),
});

export const $useCredits = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UseCreditsSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();

    const result = await spendCredits({
      userId: authUser.id,
      amount: getActionCost(data.action as CreditAction, data.quantity || 1),
      action: data.action as CreditAction,
      description: data.description,
    });

    return result;
  });

/**
 * Check if user has enough credits for an action
 */
const CheckCreditsSchema = z.object({
  action: z.string(),
  quantity: z.number().optional(),
});

export const $checkCredits = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CheckCreditsSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();

    const hasCredits = await hasEnoughCredits(authUser.id, data.action as CreditAction, data.quantity || 1);
    const balance = await getCreditBalance(authUser.id);
    const required = getActionCost(data.action as CreditAction, data.quantity || 1);

    return {
      hasCredits,
      balance,
      required,
      shortfall: hasCredits ? 0 : required - balance,
    };
  });

/**
 * Admin: Grant bonus credits to a user
 */
const GrantBonusCreditsSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  description: z.string(),
});

export const $grantBonusCredits = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => GrantBonusCreditsSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();

    // Check if admin (you'd implement proper RBAC check here)
    if (authUser.role !== "admin" && authUser.role !== "superAdmin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const result = await grantCredits({
      userId: data.userId,
      amount: data.amount,
      type: "bonus",
      description: data.description,
    });

    return result;
  });

// =============================================================================
// Billing Configuration
// =============================================================================

/**
 * Get billing configuration for the app
 */
export const $getBillingConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    provider: getBillingProvider(),
    stripeEnabled: isStripeEnabled(),
    polarEnabled: isPolarEnabled(),
    trialDays: parseInt(process.env.BILLING_TRIAL_DAYS || "14"),
    currency: process.env.BILLING_DEFAULT_CURRENCY || "usd",
  };
});

// =============================================================================
// Admin Functions
// =============================================================================

const AdminSubscriptionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.array(z.enum(["active", "trialing", "past_due", "canceled", "incomplete"])).optional(),
  plan: z.array(z.string()).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const AdminCustomersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  hasSubscription: z.boolean().optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const AdminCreditTransactionsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  type: z.array(z.enum(["purchase", "usage", "bonus", "refund"])).optional(),
  userId: z.string().optional(),
  sortBy: z.enum(["createdAt", "amount", "type"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/**
 * Admin: Get all subscriptions (paginated)
 * Lists subscriptions from Stripe or Polar with filtering and pagination
 */
export const $getAllSubscriptions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(AdminSubscriptionsSchema, data))
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const provider = getBillingProvider();
      const params = normalizePagination({
        page: data.data.page,
        limit: data.data.limit,
        search: data.data.search,
        sortBy: data.data.sortBy,
        sortOrder: data.data.sortOrder,
      });

      if (provider === "none") {
        return paginatedResult([], 0, params);
      }

      // For Stripe
      if (provider === "stripe" && isStripeEnabled() && stripeClient) {
        try {
          const queryParams: any = {
            limit: params.limit,
          };

          // Filter by status if provided
          if (data.data.status && data.data.status.length === 1) {
            queryParams.status = data.data.status[0];
          }

          const subscriptions = await stripeClient.subscriptions.list(queryParams);

          // Map subscriptions to a normalized format
          const items = await Promise.all(
            subscriptions.data.map(async (sub) => {
              // Try to get user info from metadata or customer
              let userEmail = "";
              let userName = "";
              let userId = sub.metadata?.userId;

              if (sub.customer && typeof sub.customer === "string") {
                try {
                  const customer = await stripeClient!.customers.retrieve(sub.customer);
                  if (!("deleted" in customer)) {
                    userEmail = customer.email || "";
                    userName = customer.name || "";
                    userId = userId || customer.metadata?.userId;
                  }
                } catch { }
              }

              // Find matching plan
              const priceId = sub.items.data[0]?.price.id;
              const matchedPlan = PLANS.find(p => {
                const monthlyId = process.env[`STRIPE_${p.id.toUpperCase()}_MONTHLY_PRICE_ID`];
                const yearlyId = process.env[`STRIPE_${p.id.toUpperCase()}_YEARLY_PRICE_ID`];
                return monthlyId === priceId || yearlyId === priceId;
              });

              const starts = sub.items.data
                .map(i => i.current_period_start)
                .filter((v): v is number => typeof v === "number");

              const ends = sub.items.data
                .map(i => i.current_period_end)
                .filter((v): v is number => typeof v === "number");

              const currentPeriodStart = starts.length ? Math.max(...starts) : null;
              const currentPeriodEnd = ends.length ? Math.min(...ends) : null;

              return {
                id: sub.id,
                userId,
                userEmail,
                userName,
                status: sub.status,
                plan: matchedPlan?.name || "Unknown",
                planId: matchedPlan?.id,
                interval: sub.items.data[0]?.price.recurring?.interval || "month",
                currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
                currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
                createdAt: new Date(sub.created * 1000),
                amount: sub.items.data[0]?.price.unit_amount || 0,
                currency: sub.currency,
              };
            })
          );

          // Filter by search if provided
          let filteredItems = items;
          if (params.search) {
            const query = params.search.toLowerCase();
            filteredItems = items.filter(
              item =>
                item.userEmail.toLowerCase().includes(query) ||
                item.userName.toLowerCase().includes(query) ||
                item.plan.toLowerCase().includes(query)
            );
          }

          // Filter by plan if provided
          if (data.data.plan && data.data.plan.length > 0) {
            filteredItems = filteredItems.filter(
              item => item.planId && data.data.plan!.includes(item.planId)
            );
          }

          // Filter by multiple statuses if provided
          if (data.data.status && data.data.status.length > 1) {
            filteredItems = filteredItems.filter(
              item => data.data.status!.includes(item.status as any)
            );
          }

          return paginatedResult(filteredItems, subscriptions.data.length, params);
        } catch (error) {
          console.error("[Admin Billing] Error fetching Stripe subscriptions:", error);
          return paginatedResult([], 0, params);
        }
      }

      // For Polar
      if (provider === "polar" && isPolarEnabled() && polarSdkClient) {
        try {
          // Polar doesn't have a direct list subscriptions API for admins
          // We'd need to iterate through customers or use webhooks to store locally
          // For now, return empty - implement based on Polar's actual admin API
          console.log("[Admin Billing] Polar admin subscriptions not yet implemented");
          return paginatedResult([], 0, params);
        } catch (error) {
          console.error("[Admin Billing] Error fetching Polar subscriptions:", error);
          return paginatedResult([], 0, params);
        }
      }

      return paginatedResult([], 0, params);
    });
  });

/**
 * Admin: Get all billing customers (paginated)
 * Lists users with their billing information
 */
export const $getAllCustomers = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(AdminCustomersSchema, data))
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const params = normalizePagination({
        page: data.data.page,
        limit: data.data.limit,
        search: data.data.search,
        sortBy: data.data.sortBy,
        sortOrder: data.data.sortOrder,
      });

      const provider = getBillingProvider();
      const offset = (params.page - 1) * params.limit;

      // Build where clause for users with/without billing info
      const conditions = [];

      // Filter by billing customer status if explicitly requested
      if (data.data.hasSubscription === true) {
        // Only users WITH billing customer IDs
        if (provider === "stripe") {
          conditions.push(sql`${user.stripeCustomerId} IS NOT NULL`);
        } else if (provider === "polar") {
          conditions.push(sql`${user.polarCustomerId} IS NOT NULL`);
        }
      } else if (data.data.hasSubscription === false) {
        // Only users WITHOUT billing customer IDs
        if (provider === "stripe") {
          conditions.push(sql`${user.stripeCustomerId} IS NULL`);
        } else if (provider === "polar") {
          conditions.push(sql`${user.polarCustomerId} IS NULL`);
        }
      }
      // If hasSubscription is undefined, show ALL users (both with and without billing)

      // Search filter
      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(or(ilike(user.email, query), ilike(user.name, query)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(user).where(whereClause)
        : await db.select({ total: count() }).from(user);

      // Get sorting
      const sortBy = params.sortBy ?? "createdAt";
      const sortOrder = params.sortOrder ?? "desc";
      const orderColumn = sortBy === "name" ? user.name : sortBy === "email" ? user.email : user.createdAt;
      const orderDirection = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

      // Get customers
      const customers = await (whereClause
        ? db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt,
            stripeCustomerId: user.stripeCustomerId,
            polarCustomerId: user.polarCustomerId,
          })
          .from(user)
          .where(whereClause)
        : db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt,
            stripeCustomerId: user.stripeCustomerId,
            polarCustomerId: user.polarCustomerId,
          })
          .from(user))
        .orderBy(orderDirection)
        .limit(params.limit)
        .offset(offset);

      // Get credit balances for these users
      const userIds = customers.map(c => c.id);
      const balances = userIds.length > 0
        ? await db
          .select({ userId: creditBalance.userId, available: creditBalance.available })
          .from(creditBalance)
          .where(inArray(creditBalance.userId, userIds))
        : [];

      const balanceMap = new Map(balances.map(b => [b.userId, b.available]));

      // Map customers with their billing info
      const items = customers.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        image: c.image,
        createdAt: c.createdAt,
        customerId: provider === "stripe" ? c.stripeCustomerId : c.polarCustomerId,
        provider,
        creditBalance: balanceMap.get(c.id) ?? 0,
      }));

      return paginatedResult(items, total, params);
    });
  });

/**
 * Admin: Get all credit transactions (paginated)
 */
export const $getAllCreditTransactions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(AdminCreditTransactionsSchema, data))
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const params = normalizePagination({
        page: data.data.page,
        limit: data.data.limit,
        search: data.data.search,
        sortBy: data.data.sortBy,
        sortOrder: data.data.sortOrder,
      });

      const offset = (params.page - 1) * params.limit;

      // Build where clause
      const conditions = [];

      // Filter by type
      if (data.data.type && data.data.type.length > 0) {
        conditions.push(inArray(creditTransaction.type, data.data.type));
      }

      // Filter by user ID
      if (data.data.userId) {
        conditions.push(eq(creditTransaction.userId, data.data.userId));
      }

      // Search in description
      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(ilike(creditTransaction.description, query));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(creditTransaction).where(whereClause)
        : await db.select({ total: count() }).from(creditTransaction);

      // Get sorting
      const sortBy = params.sortBy ?? "createdAt";
      const sortOrder = params.sortOrder ?? "desc";
      const orderColumn = sortBy === "amount" ? creditTransaction.amount : sortBy === "type" ? creditTransaction.type : creditTransaction.createdAt;
      const orderDirection = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

      // Get transactions with user info
      const transactions = await (whereClause
        ? db
          .select({
            id: creditTransaction.id,
            userId: creditTransaction.userId,
            type: creditTransaction.type,
            amount: creditTransaction.amount,
            description: creditTransaction.description,
            provider: creditTransaction.provider,
            providerPaymentId: creditTransaction.providerPaymentId,
            metadata: creditTransaction.metadata,
            createdAt: creditTransaction.createdAt,
            userName: user.name,
            userEmail: user.email,
          })
          .from(creditTransaction)
          .leftJoin(user, eq(creditTransaction.userId, user.id))
          .where(whereClause)
        : db
          .select({
            id: creditTransaction.id,
            userId: creditTransaction.userId,
            type: creditTransaction.type,
            amount: creditTransaction.amount,
            description: creditTransaction.description,
            provider: creditTransaction.provider,
            providerPaymentId: creditTransaction.providerPaymentId,
            metadata: creditTransaction.metadata,
            createdAt: creditTransaction.createdAt,
            userName: user.name,
            userEmail: user.email,
          })
          .from(creditTransaction)
          .leftJoin(user, eq(creditTransaction.userId, user.id)))
        .orderBy(orderDirection)
        .limit(params.limit)
        .offset(offset);

      return paginatedResult(transactions, total, params);
    });
  });

/**
 * Admin: Get billing statistics for dashboard
 */
export const $getBillingStats = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      const provider = getBillingProvider();

      // Get credit statistics from database
      const [{ totalCreditsInCirculation = 0 } = {}] = await db
        .select({ totalCreditsInCirculation: sql<number>`COALESCE(SUM(${creditBalance.available}), 0)` })
        .from(creditBalance);

      // Get total credits used (negative transactions)
      const [{ totalCreditsUsed = 0 } = {}] = await db
        .select({ totalCreditsUsed: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${creditTransaction.amount} < 0 THEN ${creditTransaction.amount} ELSE 0 END)), 0)` })
        .from(creditTransaction);

      // Get total credits purchased
      const [{ totalCreditsPurchased = 0 } = {}] = await db
        .select({ totalCreditsPurchased: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransaction.type} = 'purchase' THEN ${creditTransaction.amount} ELSE 0 END), 0)` })
        .from(creditTransaction);

      // Get total credits granted (bonus)
      const [{ totalCreditsGranted = 0 } = {}] = await db
        .select({ totalCreditsGranted: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransaction.type} = 'bonus' THEN ${creditTransaction.amount} ELSE 0 END), 0)` })
        .from(creditTransaction);

      // Get billing customer count
      let totalCustomers = 0;
      let activeSubscriptions = 0;
      let monthlyRevenue = 0;

      if (provider === "stripe" && isStripeEnabled() && stripeClient) {
        try {
          // Get customer count from Stripe
          await stripeClient.customers.list({ limit: 1 });
          // Note: This is just the first page count, for accurate total use customers.total_count if available
          // or implement proper pagination/webhooks

          // Get active subscriptions
          const activeSubs = await stripeClient.subscriptions.list({
            status: "active",
            limit: 100,
          });
          activeSubscriptions = activeSubs.data.length;

          // Calculate MRR from active subscriptions
          monthlyRevenue = activeSubs.data.reduce((total, sub) => {
            const item = sub.items.data[0];
            if (!item?.price) return total;

            const amount = item.price.unit_amount || 0;
            const interval = item.price.recurring?.interval;

            // Convert to monthly
            if (interval === "year") {
              return total + Math.round(amount / 12);
            }
            return total + amount;
          }, 0);

          // Get customer count from database (more reliable)
          const [{ dbCustomers = 0 } = {}] = await db
            .select({ dbCustomers: count() })
            .from(user)
            .where(sql`${user.stripeCustomerId} IS NOT NULL`);
          totalCustomers = dbCustomers;
        } catch (error) {
          console.error("[Admin Billing] Error fetching Stripe stats:", error);
        }
      } else if (provider === "polar" && isPolarEnabled()) {
        try {
          // Get customer count from database
          const [{ dbCustomers = 0 } = {}] = await db
            .select({ dbCustomers: count() })
            .from(user)
            .where(sql`${user.polarCustomerId} IS NOT NULL`);
          totalCustomers = dbCustomers;

          // For Polar, subscription stats would need to be fetched via their API
          // or stored locally via webhooks
        } catch (error) {
          console.error("[Admin Billing] Error fetching Polar stats:", error);
        }
      }

      return {
        provider,
        totalCustomers,
        activeSubscriptions,
        monthlyRevenue,
        monthlyRevenueFormatted: formatPrice(monthlyRevenue, process.env.BILLING_DEFAULT_CURRENCY || "usd"),
        credits: {
          inCirculation: Number(totalCreditsInCirculation),
          used: Number(totalCreditsUsed),
          purchased: Number(totalCreditsPurchased),
          granted: Number(totalCreditsGranted),
        },
      };
    });
  });

/**
 * Admin: Get credit transaction facets for filtering
 */
export const $getCreditTransactionFacets = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      // Get counts by type
      const typeCounts = await db
        .select({
          type: creditTransaction.type,
          count: count(),
        })
        .from(creditTransaction)
        .groupBy(creditTransaction.type);

      const typeCountsMap: Record<string, number> = {
        purchase: 0,
        usage: 0,
        bonus: 0,
        refund: 0,
      };

      for (const row of typeCounts) {
        typeCountsMap[row.type] = Number(row.count);
      }

      return { typeCounts: typeCountsMap };
    });
  });

// =============================================================================
// Payment History & Invoice Functions
// =============================================================================

/**
 * Get user's payment history (invoices and charges)
 */
export const $getPaymentHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider === "none") {
      return { provider: "none" as const, payments: [], hasMore: false };
    }

    // Stripe payment history
    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      const [userRecord] = await db
        .select({ stripeCustomerId: user.stripeCustomerId })
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      if (!userRecord?.stripeCustomerId) {
        return { provider: "stripe" as const, payments: [], hasMore: false };
      }

      try {
        // Get invoices
        const invoices = await stripeClient.invoices.list({
          customer: userRecord.stripeCustomerId,
          limit: 50,
        });

        const payments = invoices.data.map(invoice => ({
          id: invoice.id,
          type: "invoice" as const,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          description: invoice.lines.data[0]?.description || "Subscription",
          invoicePdf: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          createdAt: new Date(invoice.created * 1000),
          paidAt: invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : null,
        }));

        return {
          provider: "stripe" as const,
          payments,
          hasMore: invoices.has_more,
        };
      } catch (error) {
        console.error("[Billing] Error fetching payment history:", error);
        return { provider: "stripe" as const, payments: [], hasMore: false, error: "Failed to fetch payment history" };
      }
    }

    // Polar payment history
    if (provider === "polar" && isPolarEnabled()) {
      try {
        const customer = await getPolarCustomerByExternalId(authUser.id);
        if (!customer) {
          return { provider: "polar" as const, payments: [], hasMore: false };
        }

        // Polar uses orders for payment history
        // For now, return empty as Polar's order API requires different handling
        // This would need to be implemented based on Polar's SDK
        return { provider: "polar" as const, payments: [], hasMore: false };
      } catch (error) {
        console.error("[Billing] Error fetching Polar payment history:", error);
        return { provider: "polar" as const, payments: [], hasMore: false, error: "Failed to fetch payment history" };
      }
    }

    return { provider: "none" as const, payments: [], hasMore: false };
  });

/**
 * Get subscription history (past subscriptions)
 */
export const $getSubscriptionHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider === "none") {
      return { provider: "none" as const, subscriptions: [] };
    }

    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      const [userRecord] = await db
        .select({ stripeCustomerId: user.stripeCustomerId })
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      if (!userRecord?.stripeCustomerId) {
        return { provider: "stripe" as const, subscriptions: [] };
      }

      try {
        // Get all subscriptions including canceled ones
        const subscriptions = await stripeClient.subscriptions.list({
          customer: userRecord.stripeCustomerId,
          limit: 50,
          expand: ["data.items.data.price"],
        });

        const history = subscriptions.data.map(sub => {
          const priceId = sub.items.data[0]?.price.id;
          const matchedPlan = PLANS.find(p => {
            const monthlyId = process.env[`STRIPE_${p.id.toUpperCase()}_MONTHLY_PRICE_ID`];
            const yearlyId = process.env[`STRIPE_${p.id.toUpperCase()}_YEARLY_PRICE_ID`];
            return monthlyId === priceId || yearlyId === priceId;
          });

          const starts = sub.items.data.map(i => i.current_period_start).filter((v): v is number => typeof v === "number");
          const ends = sub.items.data.map(i => i.current_period_end).filter((v): v is number => typeof v === "number");

          return {
            id: sub.id,
            plan: matchedPlan?.name || "Unknown",
            planId: matchedPlan?.id,
            status: sub.status,
            interval: sub.items.data[0]?.price.recurring?.interval || "month",
            amount: sub.items.data[0]?.price.unit_amount || 0,
            currency: sub.currency,
            currentPeriodStart: starts.length ? new Date(Math.max(...starts) * 1000) : null,
            currentPeriodEnd: ends.length ? new Date(Math.min(...ends) * 1000) : null,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            createdAt: new Date(sub.created * 1000),
          };
        });

        return { provider: "stripe" as const, subscriptions: history };
      } catch (error) {
        console.error("[Billing] Error fetching subscription history:", error);
        return { provider: "stripe" as const, subscriptions: [], error: "Failed to fetch subscription history" };
      }
    }

    if (provider === "polar" && isPolarEnabled()) {
      try {
        const customer = await getPolarCustomerByExternalId(authUser.id);
        if (!customer) {
          return { provider: "polar" as const, subscriptions: [] };
        }

        const subscriptions = await listPolarSubscriptions(customer.id);
        const history = subscriptions.map((sub: any) => ({
          id: sub.id,
          plan: sub.product?.name || "Unknown",
          planId: sub.productId,
          status: sub.status,
          interval: sub.recurringInterval || "month",
          amount: sub.amount || sub.product?.prices?.[0]?.amountType === "fixed"
            ? sub.product?.prices?.[0]?.priceAmount || 0
            : 0,
          currency: sub.currency || sub.product?.prices?.[0]?.priceCurrency || "usd",
          currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
          canceledAt: sub.canceledAt ? new Date(sub.canceledAt) : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          createdAt: sub.createdAt ? new Date(sub.createdAt) : null,
        }));

        return { provider: "polar" as const, subscriptions: history };
      } catch (error) {
        console.error("[Billing] Error fetching Polar subscription history:", error);
        return { provider: "polar" as const, subscriptions: [], error: "Failed to fetch subscription history" };
      }
    }

    return { provider: "none" as const, subscriptions: [] };
  });

// =============================================================================
// Subscription Upgrade/Downgrade Functions
// =============================================================================

/**
 * Preview proration for subscription change
 */
const PreviewProrationSchema = z.object({
  targetPlanId: z.string(),
  interval: z.enum(["month", "year"]),
});

export const $previewProration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PreviewProrationSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider !== "stripe" || !isStripeEnabled() || !stripeClient) {
      return {
        ok: false as const,
        error: "Proration preview only available for Stripe",
      };
    }

    const [userRecord] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (!userRecord?.stripeCustomerId) {
      return { ok: false as const, error: "No billing account found" };
    }

    try {
      // Get current subscription
      const subscriptions = await stripeClient.subscriptions.list({
        customer: userRecord.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return { ok: false as const, error: "No active subscription found" };
      }

      const currentSub = subscriptions.data[0];
      const currentItem = currentSub.items.data[0];

      // Get target price ID
      const targetPriceId = data.interval === "month"
        ? process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_MONTHLY_PRICE_ID`]
        : process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_YEARLY_PRICE_ID`];

      if (!targetPriceId) {
        return { ok: false as const, error: "Target plan not configured" };
      }

      // Create proration preview
      const preview = await stripeClient.invoices.createPreview({
        customer: userRecord.stripeCustomerId,
        subscription: currentSub.id,
        subscription_details: {
          items: [{
            id: currentItem.id,
            price: targetPriceId,
          }],
          proration_behavior: "create_prorations",
        },
      });

      // Calculate proration details
      // Filter for proration line items - using amount to identify credits vs charges
      const prorationItems = preview.lines.data.filter(line => {
        // Proration items are marked with proration: true in newer Stripe API
        const lineAny = line as any;
        return lineAny.proration === true;
      });

      const creditAmount = prorationItems
        .filter(item => item.amount < 0)
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);

      const chargeAmount = prorationItems
        .filter(item => item.amount > 0)
        .reduce((sum, item) => sum + item.amount, 0);

      const targetPlan = getPlan(data.targetPlanId);
      const currentPriceId = currentItem.price.id;
      const currentPlan = PLANS.find(p => {
        const monthlyId = process.env[`STRIPE_${p.id.toUpperCase()}_MONTHLY_PRICE_ID`];
        const yearlyId = process.env[`STRIPE_${p.id.toUpperCase()}_YEARLY_PRICE_ID`];
        return monthlyId === currentPriceId || yearlyId === currentPriceId;
      });

      return {
        ok: true as const,
        data: {
          currentPlan: currentPlan?.name || "Unknown",
          targetPlan: targetPlan?.name || "Unknown",
          interval: data.interval,
          immediateCharge: chargeAmount - creditAmount,
          immediateChargeFormatted: formatPrice(chargeAmount - creditAmount, preview.currency),
          creditAmount,
          creditAmountFormatted: formatPrice(creditAmount, preview.currency),
          newMonthlyAmount: targetPlan?.priceMonthly || 0,
          newMonthlyAmountFormatted: formatPrice(targetPlan?.priceMonthly || 0, preview.currency),
          effectiveDate: new Date(),
          isUpgrade: (targetPlan?.sortOrder || 0) > (currentPlan?.sortOrder || 0),
        },
      };
    } catch (error) {
      console.error("[Billing] Error creating proration preview:", error);
      return { ok: false as const, error: "Failed to create proration preview" };
    }
  });

/**
 * Change subscription (upgrade or downgrade)
 */
const ChangeSubscriptionSchema = z.object({
  targetPlanId: z.string(),
  interval: z.enum(["month", "year"]),
  prorationBehavior: z.enum(["create_prorations", "always_invoice", "none"]).optional(),
});

export const $changeSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChangeSubscriptionSchema.parse(data))
  .handler(async ({ data }) => {
    const authUser = await getAuthenticatedUser();
    const provider = getBillingProvider();

    if (provider === "none") {
      throw new Error("Billing is not configured");
    }

    const targetPlan = getPlan(data.targetPlanId);
    if (!targetPlan) {
      throw new Error("Invalid target plan");
    }

    // Stripe subscription change
    if (provider === "stripe" && isStripeEnabled() && stripeClient) {
      const [userRecord] = await db
        .select({ stripeCustomerId: user.stripeCustomerId })
        .from(user)
        .where(eq(user.id, authUser.id))
        .limit(1);

      if (!userRecord?.stripeCustomerId) {
        throw new Error("No billing account found");
      }

      // Get current subscription
      const subscriptions = await stripeClient.subscriptions.list({
        customer: userRecord.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        throw new Error("No active subscription found");
      }

      const currentSub = subscriptions.data[0];
      const currentItem = currentSub.items.data[0];

      // Get target price ID
      const targetPriceId = data.interval === "month"
        ? process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_MONTHLY_PRICE_ID`]
        : process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_YEARLY_PRICE_ID`];

      if (!targetPriceId) {
        throw new Error("Target plan price not configured");
      }

      // Determine if upgrade or downgrade
      const currentPriceId = currentItem.price.id;
      const currentPlan = PLANS.find(p => {
        const monthlyId = process.env[`STRIPE_${p.id.toUpperCase()}_MONTHLY_PRICE_ID`];
        const yearlyId = process.env[`STRIPE_${p.id.toUpperCase()}_YEARLY_PRICE_ID`];
        return monthlyId === currentPriceId || yearlyId === currentPriceId;
      });

      const isUpgrade = (targetPlan.sortOrder || 0) > (currentPlan?.sortOrder || 0);

      // Update subscription
      const updatedSub = await stripeClient.subscriptions.update(currentSub.id, {
        items: [{
          id: currentItem.id,
          price: targetPriceId,
        }],
        proration_behavior: data.prorationBehavior || "create_prorations",
        // For downgrades, we could schedule the change for period end instead
        // billing_cycle_anchor: isUpgrade ? undefined : 'unchanged',
      });

      return {
        success: true,
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          plan: targetPlan.name,
          isUpgrade,
        },
      };
    }

    // Polar subscription change
    if (provider === "polar" && isPolarEnabled() && polarSdkClient) {
      const customer = await getPolarCustomerByExternalId(authUser.id);
      if (!customer) {
        throw new Error("No billing account found");
      }

      const subscriptions = await listPolarSubscriptions(customer.id);
      const activeSub = subscriptions.find((s: any) => s.status === "active");

      if (!activeSub) {
        throw new Error("No active subscription found");
      }

      // Get target product ID
      const targetProductId = process.env[`POLAR_${data.targetPlanId.toUpperCase()}_PRODUCT_ID`];
      if (!targetProductId) {
        throw new Error("Target plan not configured for Polar");
      }

      // Polar subscription update
      // Note: Polar's SDK uses { id, subscriptionUpdate } format
      const updated = await polarSdkClient.subscriptions.update({
        id: activeSub.id,
        subscriptionUpdate: {
          productId: targetProductId,
        },
      });

      return {
        success: true,
        subscription: {
          id: updated.id,
          status: updated.status,
          plan: targetPlan.name,
        },
      };
    }

    throw new Error("No billing provider configured");
  });

// =============================================================================
// Admin: Customer Management Functions
// =============================================================================

/**
 * Admin: Create a billing customer for an existing user
 */
const CreateCustomerForUserSchema = z.object({
  userId: z.string(),
});

export const $createCustomerForUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateCustomerForUserSchema.parse(data))
  .middleware([accessMiddleware({ permissions: { billing: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const provider = getBillingProvider();

      if (provider === "none") {
        throw new Error("Billing is not configured");
      }

      // Get the target user
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, data.userId))
        .limit(1);

      if (!targetUser) {
        throw new Error("User not found");
      }

      // Check if already has a customer
      if (provider === "stripe" && targetUser.stripeCustomerId) {
        return {
          success: false,
          message: "User already has a Stripe customer",
          customerId: targetUser.stripeCustomerId,
        };
      }

      if (provider === "polar" && targetUser.polarCustomerId) {
        return {
          success: false,
          message: "User already has a Polar customer",
          customerId: targetUser.polarCustomerId,
        };
      }

      // Create Stripe customer
      if (provider === "stripe" && isStripeEnabled() && stripeClient) {
        const customer = await stripeClient.customers.create({
          email: targetUser.email,
          name: targetUser.name || undefined,
          metadata: {
            userId: targetUser.id,
            source: "admin-manual",
          },
        });

        // Update user with customer ID
        await db
          .update(user)
          .set({ stripeCustomerId: customer.id })
          .where(eq(user.id, targetUser.id));

        return {
          success: true,
          customerId: customer.id,
          provider: "stripe",
        };
      }

      // Create Polar customer
      if (provider === "polar" && isPolarEnabled() && polarSdkClient) {
        const customer = await polarSdkClient.customers.create({
          email: targetUser.email,
          name: targetUser.name || undefined,
          externalId: targetUser.id,
        });

        // Update user with customer ID
        await db
          .update(user)
          .set({ polarCustomerId: customer.id })
          .where(eq(user.id, targetUser.id));

        return {
          success: true,
          customerId: customer.id,
          provider: "polar",
        };
      }

      throw new Error("No billing provider configured");
    });
  });

/**
 * Admin: Get payment history for a specific user
 */
const GetUserPaymentHistorySchema = z.object({
  userId: z.string(),
  limit: z.number().optional(),
});

export const $getUserPaymentHistory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(GetUserPaymentHistorySchema, data))
  .middleware([accessMiddleware({ permissions: { billing: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const provider = getBillingProvider();
      const limit = data.data.limit || 50;

      // Get the target user
      const [targetUser] = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          stripeCustomerId: user.stripeCustomerId,
          polarCustomerId: user.polarCustomerId,
        })
        .from(user)
        .where(eq(user.id, data.data.userId))
        .limit(1);

      if (!targetUser) {
        throw new Error("User not found");
      }

      // Stripe payment history
      if (provider === "stripe" && isStripeEnabled() && stripeClient && targetUser.stripeCustomerId) {
        const invoices = await stripeClient.invoices.list({
          customer: targetUser.stripeCustomerId,
          limit,
        });

        const charges = await stripeClient.charges.list({
          customer: targetUser.stripeCustomerId,
          limit,
        });

        return {
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            customerId: targetUser.stripeCustomerId,
          },
          invoices: invoices.data.map(inv => ({
            id: inv.id,
            number: inv.number,
            amount: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            description: inv.lines.data[0]?.description,
            invoicePdf: inv.invoice_pdf,
            hostedUrl: inv.hosted_invoice_url,
            createdAt: new Date(inv.created * 1000),
            paidAt: inv.status_transitions?.paid_at
              ? new Date(inv.status_transitions.paid_at * 1000)
              : null,
          })),
          charges: charges.data.map(ch => ({
            id: ch.id,
            amount: ch.amount,
            currency: ch.currency,
            status: ch.status,
            description: ch.description,
            receiptUrl: ch.receipt_url,
            createdAt: new Date(ch.created * 1000),
            refunded: ch.refunded,
            refundedAmount: ch.amount_refunded,
          })),
          provider: "stripe" as const,
        };
      }

      // Polar payment history
      if (provider === "polar" && isPolarEnabled() && targetUser.polarCustomerId) {
        // Polar order history would go here
        return {
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            customerId: targetUser.polarCustomerId,
          },
          invoices: [],
          charges: [],
          provider: "polar" as const,
        };
      }

      return {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          customerId: null,
        },
        invoices: [],
        charges: [],
        provider: provider as BillingProvider,
        error: "No billing customer found for user",
      };
    });
  });

/**
 * Admin: Change a user's subscription
 */
const AdminChangeSubscriptionSchema = z.object({
  userId: z.string(),
  targetPlanId: z.string(),
  interval: z.enum(["month", "year"]),
});

export const $adminChangeSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AdminChangeSubscriptionSchema.parse(data))
  .middleware([accessMiddleware({ permissions: { billing: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const provider = getBillingProvider();

      // Get target user
      const [targetUser] = await db
        .select({
          id: user.id,
          stripeCustomerId: user.stripeCustomerId,
          polarCustomerId: user.polarCustomerId,
        })
        .from(user)
        .where(eq(user.id, data.userId))
        .limit(1);

      if (!targetUser) {
        throw new Error("User not found");
      }

      const targetPlan = getPlan(data.targetPlanId);
      if (!targetPlan) {
        throw new Error("Invalid plan");
      }

      // Stripe
      if (provider === "stripe" && isStripeEnabled() && stripeClient && targetUser.stripeCustomerId) {
        const subscriptions = await stripeClient.subscriptions.list({
          customer: targetUser.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          throw new Error("No active subscription found for user");
        }

        const currentSub = subscriptions.data[0];
        const currentItem = currentSub.items.data[0];

        const targetPriceId = data.interval === "month"
          ? process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_MONTHLY_PRICE_ID`]
          : process.env[`STRIPE_${data.targetPlanId.toUpperCase()}_YEARLY_PRICE_ID`];

        if (!targetPriceId) {
          throw new Error("Target plan price not configured");
        }

        const updated = await stripeClient.subscriptions.update(currentSub.id, {
          items: [{
            id: currentItem.id,
            price: targetPriceId,
          }],
          proration_behavior: "create_prorations",
        });

        return {
          success: true,
          subscription: {
            id: updated.id,
            status: updated.status,
            plan: targetPlan.name,
          },
        };
      }

      // Polar
      if (provider === "polar" && isPolarEnabled() && polarSdkClient && targetUser.polarCustomerId) {
        const subscriptions = await listPolarSubscriptions(targetUser.polarCustomerId);
        const activeSub = subscriptions.find((s: any) => s.status === "active");

        if (!activeSub) {
          throw new Error("No active subscription found for user");
        }

        const targetProductId = process.env[`POLAR_${data.targetPlanId.toUpperCase()}_PRODUCT_ID`];
        if (!targetProductId) {
          throw new Error("Target plan not configured for Polar");
        }

        const updated = await polarSdkClient.subscriptions.update({
          id: activeSub.id,
          subscriptionUpdate: {
            productId: targetProductId,
          },
        });

        return {
          success: true,
          subscription: {
            id: updated.id,
            status: updated.status,
            plan: targetPlan.name,
          },
        };
      }

      throw new Error("No billing provider configured or user has no billing account");
    });
  });
