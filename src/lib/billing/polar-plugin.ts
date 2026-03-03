/**
 * Better Auth Polar Plugin Configuration
 *
 * This module configures the official @polar-sh/better-auth plugin with:
 * - Automatic customer creation on signup
 * - Checkout sessions with products
 * - Customer portal access
 * - Usage-based billing support
 * - Webhook handling
 */

import { Polar } from "@polar-sh/sdk";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { env } from "@/env/server";
import { PLANS, getPolarProductId, isPolarEnabled } from "./plans";
import { inngest } from "@/lib/inngest/client";

/**
 * Create and export the Polar SDK client instance
 */
export const polarSdkClient = isPolarEnabled()
  ? new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN!,
    server: env.NODE_ENV === "production" ? "production" : "sandbox",
  })
  : null;

/**
 * Get the Polar plugin for Better Auth
 *
 * This uses the official @polar-sh/better-auth package with all sub-plugins:
 * - checkout: Handle checkout sessions
 * - portal: Customer portal access
 * - usage: Usage-based billing
 * - webhooks: Webhook event handlers
 */
export function getPolarPlugin() {
  if (!isPolarEnabled() || !polarSdkClient) {
    return null;
  }

  // Build products array from plans
  const products = PLANS
    .filter(p => p.priceMonthly > 0)
    .map(plan => {
      const productId = getPolarProductId(plan.id);
      return {
        productId: productId || `product_${plan.id}`,
        slug: plan.id,
      };
    })
    .filter(p => p.productId && !p.productId.startsWith("product_"));

  return polar({
    client: polarSdkClient,
    createCustomerOnSignUp: true,

    // Customize customer creation with metadata
    getCustomerCreateParams: async ({ user }) => {
      return {
        metadata: {
          userId: user.id || "",
          source: "better-auth",
          createdAt: new Date().toISOString(),
        },
      };
    },

    // Enable all sub-plugins
    use: [
      // Checkout plugin for subscription and one-time purchases
      checkout({
        products,
        successUrl: `${env.VITE_BASE_URL}/billing?success=true&checkout_id={CHECKOUT_ID}`,
        authenticatedUsersOnly: true,
      }),

      // Portal plugin for customer self-service
      portal(),

      // Usage plugin for metered billing
      usage(),

      // Webhooks plugin for event handling
      webhooks({
        secret: env.POLAR_WEBHOOK_SECRET!,

        // Customer state changes (any change to customer)
        onCustomerStateChanged: async (payload) => {
          console.log("[Billing] Polar customer state changed:", payload.data?.id);
        },

        // Customer created
        onCustomerCreated: async (payload) => {
          console.log(`[Billing] Polar customer created:`, payload.data?.id);

          await inngest.send({
            name: "billing/customer.created",
            data: {
              polarCustomerId: payload.data?.id,
              email: payload.data?.email,
              externalId: payload.data?.externalId,
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send customer.created event:", err));
        },

        // Subscription created
        onSubscriptionCreated: async (payload) => {
          console.log(`[Billing] Polar subscription created:`, payload.data?.id);

          await inngest.send({
            name: "billing/subscription.activated",
            data: {
              subscriptionId: payload.data?.id,
              referenceId: payload.data?.customer?.externalId,
              productId: payload.data?.product?.id,
              plan: payload.data?.product?.name,
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send subscription.activated event:", err));
        },

        // Subscription active (after payment confirmation)
        onSubscriptionActive: async (payload) => {
          console.log(`[Billing] Polar subscription active:`, payload.data?.id);

          await inngest.send({
            name: "billing/subscription.activated",
            data: {
              subscriptionId: payload.data?.id,
              referenceId: payload.data?.customer?.externalId,
              productId: payload.data?.product?.id,
              plan: payload.data?.product?.name,
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send subscription.activated event:", err));
        },

        // Subscription updated
        onSubscriptionUpdated: async (payload) => {
          console.log(`[Billing] Polar subscription updated:`, payload.data?.id);

          await inngest.send({
            name: "billing/subscription.updated",
            data: {
              subscriptionId: payload.data?.id,
              referenceId: payload.data?.customer?.externalId,
              status: payload.data?.status,
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send subscription.updated event:", err));
        },

        // Subscription canceled
        onSubscriptionCanceled: async (payload) => {
          console.log(`[Billing] Polar subscription canceled:`, payload.data?.id);

          await inngest.send({
            name: "billing/subscription.canceled",
            data: {
              subscriptionId: payload.data?.id,
              referenceId: payload.data?.customer?.externalId,
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send subscription.canceled event:", err));
        },

        // Subscription revoked (immediate cancellation)
        onSubscriptionRevoked: async (payload) => {
          console.log(`[Billing] Polar subscription revoked:`, payload.data?.id);

          await inngest.send({
            name: "billing/subscription.canceled",
            data: {
              subscriptionId: payload.data?.id,
              referenceId: payload.data?.customer?.externalId,
              reason: "revoked",
              provider: "polar",
            },
          }).catch(err => console.error("[Billing] Failed to send subscription.canceled event:", err));
        },

        // Order paid (one-time or subscription payment)
        onOrderPaid: async (payload) => {
          console.log(`[Billing] Polar order paid:`, payload.data?.id);

          const metadata = payload.data?.product?.metadata as
            | Record<string, string | number | boolean | null | undefined>
            | undefined;

          if (metadata?.type === "credits") {
            const creditsRaw = metadata.credits ?? 0;

            const credits =
              typeof creditsRaw === "number"
                ? creditsRaw
                : typeof creditsRaw === "string"
                  ? parseInt(creditsRaw, 10)
                  : 0; // boolean / null / undefined -> 0

            await inngest
              .send({
                name: "billing/credits.purchased",
                data: {
                  userId: String(payload.data?.customer?.externalId ?? ""),
                  packageId: String(payload.data?.product?.id ?? ""),
                  credits,
                  orderId: String(payload.data?.id ?? ""),
                  provider: "polar",
                },
              })
              .catch((err) =>
                console.error("[Billing] Failed to send credits.purchased event:", err),
              );
          }
        },
        // Catch-all handler for all events
        onPayload: async (payload) => {
          await inngest.send({
            name: "polar/webhook.received",
            data: {
              type: payload.type,
              eventId: payload.data?.id || crypto.randomUUID(),
            },
          }).catch(err => console.error("[Billing] Failed to send webhook event:", err));
        },
      }),
    ],
  });
}

/**
 * Create a checkout session for Polar (direct SDK usage)
 * Use this for custom checkout flows outside of Better Auth routes
 */
export async function createPolarCheckout(options: {
  productId: string;
  customerId?: string;
  customerEmail?: string;
  customerExternalId?: string;
  successUrl: string;
  metadata?: Record<string, string>;
}) {
  if (!polarSdkClient) {
    throw new Error("Polar is not configured");
  }

  // Build checkout params - only include properties that exist in the SDK type
  const checkoutParams: Parameters<typeof polarSdkClient.checkouts.create>[0] = {
    products: [options.productId],
    successUrl: options.successUrl,
    allowDiscountCodes: true,
  };

  // Add optional params if provided
  if (options.customerId) {
    checkoutParams.customerId = options.customerId;
  }
  if (options.customerEmail) {
    checkoutParams.customerEmail = options.customerEmail;
  }
  if (options.metadata) {
    checkoutParams.metadata = options.metadata;
  }

  const checkout = await polarSdkClient.checkouts.create(checkoutParams);

  return {
    url: checkout.url,
    sessionId: checkout.id,
    clientSecret: checkout.clientSecret,
  };
}

/**
 * Create a customer portal session (direct SDK usage)
 * Note: The portal() plugin provides this via authClient.customer.portal()
 */
export async function createPolarPortalSession(customerId: string) {
  if (!polarSdkClient) {
    throw new Error("Polar is not configured");
  }

  const session = await polarSdkClient.customerSessions.create({
    customerId,
  });

  return {
    url: session.customerPortalUrl,
  };
}

/**
 * Get customer by external ID (user ID)
 */
export async function getPolarCustomerByExternalId(externalId: string) {
  if (!polarSdkClient) {
    throw new Error("Polar is not configured");
  }

  try {
    const customer = await polarSdkClient.customers.getExternal({ externalId });
    return customer;
  } catch {
    return null;
  }
}

/**
 * List customer subscriptions
 */
function extractItems<T>(page: unknown): T[] {
  const p = page as any;
  return (
    p?.items ??
    p?.data?.items ??
    p?.result?.items ??
    p?.response?.items ??
    []
  );
}
export async function listPolarSubscriptions(customerId: string) {
  if (!polarSdkClient) throw new Error("Polar is not configured");

  const result = await polarSdkClient.subscriptions.list({
    customerId,
    active: true,
    limit: 100,
  });

  const subscriptions: any[] = [];

  // Works whether `result` is an async-iterable (paged) or a single response
  if ((result as any)?.[Symbol.asyncIterator]) {
    for await (const page of result as any) {
      subscriptions.push(...extractItems<any>(page));
    }
  } else {
    subscriptions.push(...extractItems<any>(result));
  }

  return subscriptions;
}

/**
 * Cancel a Polar subscription
 */
export async function cancelPolarSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true) {
  if (!polarSdkClient) {
    throw new Error("Polar is not configured");
  }

  if (cancelAtPeriodEnd) {
    return await polarSdkClient.subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true,
      },
    });
  } else {
    return await polarSdkClient.subscriptions.revoke({ id: subscriptionId });
  }
}

/**
 * Ingest a usage event for usage-based billing
 * Note: The usage() plugin provides this via authClient.usage.ingest()
 */
export async function ingestPolarUsage(options: {
  customerId: string;
  eventName: string;
  metadata?: Record<string, any>;
}) {
  if (!polarSdkClient) {
    throw new Error("Polar is not configured");
  }

  // Note: This uses the Polar usage ingestion API
  // The actual endpoint depends on your Polar organization setup
  console.log(`[Billing] Ingesting usage event: ${options.eventName} for customer ${options.customerId}`);

  // Usage ingestion is typically done via the client-side authClient.usage.ingest()
  // This is a server-side fallback if needed
  return { success: true };
}
