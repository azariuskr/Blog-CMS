/**
 * Better Auth Stripe Plugin Configuration
 *
 * This module configures the Stripe plugin for Better Auth with:
 * - Automatic customer creation on signup
 * - Subscription management with plans
 * - Webhook handling
 * - Trial period management
 */

import Stripe from "stripe";
import { stripe as stripePlugin } from "@better-auth/stripe";
import { env } from "@/env/server";
import { PLANS, getStripePriceId, isStripeEnabled } from "./plans";
import { inngest } from "@/lib/inngest/client";

/**
 * Create and export the Stripe client instance
 */
export const stripeClient = isStripeEnabled()
  ? new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null;

/**
 * Get the Stripe plugin configuration for Better Auth
 */
export function getStripePlugin() {
  if (!isStripeEnabled() || !stripeClient) {
    return null;
  }

  return stripePlugin({
    stripeClient,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET!,
    createCustomerOnSignUp: true,

    // Customer creation hook
    onCustomerCreate: async ({ stripeCustomer, user }) => {
      console.log(`[Billing] Stripe customer ${stripeCustomer.id} created for user ${user.id}`);

      // Send Inngest event for customer creation
      await inngest.send({
        name: "billing/customer.created",
        data: {
          userId: user.id,
          stripeCustomerId: stripeCustomer.id,
          email: user.email,
          provider: "stripe",
        },
      }).catch(err => console.error("[Billing] Failed to send customer.created event:", err));
    },

    // Customize customer creation params
    getCustomerCreateParams: async (user) => {
      return Promise.resolve({
        metadata: {
          userId: user.id || "",
          source: "better-auth",
        },
      });
    },

    subscription: {
      enabled: true,
      plans: PLANS.filter(p => p.priceMonthly > 0).map(plan => {
        const monthlyPriceId = getStripePriceId(plan.id, "month");
        const yearlyPriceId = getStripePriceId(plan.id, "year");

        // Convert PlanLimits to Record<string, unknown> for Better Auth compatibility
        const limitsRecord: Record<string, unknown> = {
          aiMessagesPerMonth: plan.limits.aiMessagesPerMonth,
          storageBytes: plan.limits.storageBytes,
          teamMembers: plan.limits.teamMembers,
          prioritySupport: plan.limits.prioritySupport,
          apiAccess: plan.limits.apiAccess,
          customBranding: plan.limits.customBranding,
        };

        return {
          name: plan.id,
          priceId: monthlyPriceId || `price_${plan.id}_monthly`, // Fallback for config validation
          annualDiscountPriceId: yearlyPriceId,
          limits: limitsRecord,
          freeTrial: plan.trialDays > 0 ? {
            days: plan.trialDays,
            onTrialStart: async (subscription: { id: string; referenceId: string }) => {
              console.log(`[Billing] Trial started for subscription ${subscription.id}`);
              await inngest.send({
                name: "billing/trial.started",
                data: {
                  subscriptionId: subscription.id,
                  referenceId: subscription.referenceId,
                  plan: plan.id,
                  trialDays: plan.trialDays,
                },
              }).catch(err => console.error("[Billing] Failed to send trial.started event:", err));
            },
            onTrialEnd: async ({ subscription }: { subscription: { id: string; referenceId: string } }) => {
              console.log(`[Billing] Trial ended for subscription ${subscription.id}`);
              await inngest.send({
                name: "billing/trial.ended",
                data: {
                  subscriptionId: subscription.id,
                  referenceId: subscription.referenceId,
                  plan: plan.id,
                },
              }).catch(err => console.error("[Billing] Failed to send trial.ended event:", err));
            },
          } : undefined,
        };
      }),

      // Subscription lifecycle hooks
      onSubscriptionComplete: async ({ subscription, plan }) => {
        console.log(`[Billing] Subscription ${subscription.id} completed for plan ${plan.name}`);

        await inngest.send({
          name: "billing/subscription.activated",
          data: {
            subscriptionId: subscription.id,
            referenceId: subscription.referenceId,
            plan: plan.name,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
          },
        }).catch(err => console.error("[Billing] Failed to send subscription.activated event:", err));
      },

      onSubscriptionCreated: async ({ subscription, plan }) => {
        console.log(`[Billing] Subscription ${subscription.id} created for plan ${plan.name}`);
      },

      onSubscriptionUpdate: async ({ subscription }) => {
        console.log(`[Billing] Subscription ${subscription.id} updated`);

        await inngest.send({
          name: "billing/subscription.updated",
          data: {
            subscriptionId: subscription.id,
            referenceId: subscription.referenceId,
            status: subscription.status,
          },
        }).catch(err => console.error("[Billing] Failed to send subscription.updated event:", err));
      },

      onSubscriptionCancel: async ({ subscription, cancellationDetails }) => {
        console.log(`[Billing] Subscription ${subscription.id} canceled`);

        await inngest.send({
          name: "billing/subscription.canceled",
          data: {
            subscriptionId: subscription.id,
            referenceId: subscription.referenceId,
            reason: cancellationDetails?.reason,
          },
        }).catch(err => console.error("[Billing] Failed to send subscription.canceled event:", err));
      },

      onSubscriptionDeleted: async ({ subscription }) => {
        console.log(`[Billing] Subscription ${subscription.id} deleted`);

        await inngest.send({
          name: "billing/subscription.deleted",
          data: {
            subscriptionId: subscription.id,
            referenceId: subscription.referenceId,
          },
        }).catch(err => console.error("[Billing] Failed to send subscription.deleted event:", err));
      },
    },

    // Handle any Stripe webhook event
    onEvent: async (event) => {
      // Forward all events to Inngest for background processing
      await inngest.send({
        name: "stripe/webhook.received",
        data: {
          type: event.type,
          eventId: event.id,
        },
      }).catch(err => console.error("[Billing] Failed to send webhook event:", err));

      // Handle credit purchases (one-off payments)
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a credits purchase
        if (session.mode === "payment" && session.metadata?.type === "credits") {
          await inngest.send({
            name: "billing/credits.purchased",
            data: {
              userId: session.metadata.userId,
              packageId: session.metadata.packageId,
              credits: parseInt(session.metadata.credits || "0"),
              paymentIntentId: session.payment_intent as string,
              provider: "stripe",
            },
          }).catch(err => console.error("[Billing] Failed to send credits.purchased event:", err));
        }
      }
    },
  });
}

/**
 * Create a checkout session for credit purchases
 */
export async function createCreditsCheckout(options: {
  customerId: string;
  userId: string;
  packageId: string;
  packageName: string;
  credits: number;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripeClient) {
    throw new Error("Stripe is not configured");
  }

  // Get customer's default payment method to pre-select it
  const customer = await stripeClient.customers.retrieve(options.customerId);
  const defaultPaymentMethod = typeof customer !== "string" && !customer.deleted
    ? customer.invoice_settings?.default_payment_method as string | undefined
    : undefined;

  const session = await stripeClient.checkout.sessions.create({
    customer: options.customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: options.currency.toLowerCase(),
          product_data: {
            name: options.packageName,
            description: `${options.credits} credits`,
          },
          unit_amount: options.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      type: "credits",
      userId: options.userId,
      packageId: options.packageId,
      credits: String(options.credits),
    },
    // Use saved payment method if available
    ...(defaultPaymentMethod && {
      payment_intent_data: {
        setup_future_usage: undefined, // Don't save again since already saved
      },
    }),
    // Pre-fill with saved payment methods
    saved_payment_method_options: {
      payment_method_save: "disabled", // Already saved
    },
    customer_update: {
      address: "auto",
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Get customer portal URL
 */
export async function getCustomerPortalUrl(customerId: string, returnUrl: string) {
  if (!stripeClient) {
    throw new Error("Stripe is not configured");
  }

  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(options: {
  email: string;
  name?: string;
  userId: string;
}): Promise<string> {
  if (!stripeClient) {
    throw new Error("Stripe is not configured");
  }

  const customer = await stripeClient.customers.create({
    email: options.email,
    name: options.name,
    metadata: {
      userId: options.userId,
      source: "better-auth",
    },
  });

  return customer.id;
}
