/**
 * Billing Inngest Functions
 *
 * Background job handlers for billing events including:
 * - Customer creation
 * - Subscription lifecycle (created, updated, canceled)
 * - Credit purchases
 * - Trial management
 * - Webhook processing
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvent, user } from "@/lib/db/schema";
import { grantCredits } from "@/lib/billing/credits";
import { sendEmail } from "@/lib/email";
import { inngest } from "./client";

// =============================================================================
// Customer Events
// =============================================================================

export const billingCustomerCreated = inngest.createFunction(
  { id: "billing-customer-created" },
  { event: "billing/customer.created" },
  async ({ event, step }) => {
    const data = event.data as {
      userId?: string;
      stripeCustomerId?: string;
      polarCustomerId?: string;
      email?: string;
      provider: "stripe" | "polar";
    };

    // Log analytics
    await step.run("log-analytics", async () => {
      if (data.userId) {
        await db.insert(analyticsEvent).values({
          userId: data.userId,
          eventName: "billing.customer_created",
          eventProperties: JSON.stringify({
            provider: data.provider,
            customerId: data.stripeCustomerId || data.polarCustomerId,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true };
  }
);

// =============================================================================
// Subscription Events
// =============================================================================

export const billingSubscriptionActivated = inngest.createFunction(
  { id: "billing-subscription-activated" },
  { event: "billing/subscription.activated" },
  async ({ event, step }) => {
    const data = event.data as {
      subscriptionId: string;
      referenceId?: string;
      plan: string;
      stripeSubscriptionId?: string;
      provider?: "stripe" | "polar";
    };

    // Get user from referenceId
    const userId = data.referenceId;

    // Grant welcome credits for paid plans
    if (userId && data.plan !== "free") {
      await step.run("grant-welcome-credits", async () => {
        await grantCredits({
          userId,
          amount: 100,
          type: "bonus",
          description: `Welcome bonus for ${data.plan} plan`,
          metadata: {
            reason: "subscription_welcome",
            plan: data.plan,
            subscriptionId: data.subscriptionId,
          },
        });
      });
    }

    // Send confirmation email
    if (userId) {
      await step.run("send-subscription-email", async () => {
        const [userRecord] = await db
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (userRecord) {
          await sendEmail({
            to: userRecord.email,
            subject: `Welcome to ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}!`,
            template: "subscription-activated",
            data: {
              userName: userRecord.name || "there",
              planName: data.plan,
            },
            userId,
            context: "billing",
            eventProperties: { kind: "subscription-activated", plan: data.plan },
          });
        }
      });
    }

    // Log analytics
    await step.run("log-analytics", async () => {
      if (userId) {
        await db.insert(analyticsEvent).values({
          userId,
          eventName: "subscription.activated",
          eventProperties: JSON.stringify({
            plan: data.plan,
            subscriptionId: data.subscriptionId,
            provider: data.provider,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true, plan: data.plan };
  }
);

export const billingSubscriptionUpdated = inngest.createFunction(
  { id: "billing-subscription-updated" },
  { event: "billing/subscription.updated" },
  async ({ event, step }) => {
    const data = event.data as {
      subscriptionId: string;
      referenceId?: string;
      status: string;
      provider?: "stripe" | "polar";
    };

    // Log analytics
    await step.run("log-analytics", async () => {
      if (data.referenceId) {
        await db.insert(analyticsEvent).values({
          userId: data.referenceId,
          eventName: "subscription.updated",
          eventProperties: JSON.stringify({
            subscriptionId: data.subscriptionId,
            status: data.status,
            provider: data.provider,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true };
  }
);

export const billingSubscriptionCanceled = inngest.createFunction(
  { id: "billing-subscription-canceled" },
  { event: "billing/subscription.canceled" },
  async ({ event, step }) => {
    const data = event.data as {
      subscriptionId: string;
      referenceId?: string;
      reason?: string;
      provider?: "stripe" | "polar";
    };

    const userId = data.referenceId;

    // Send cancellation email
    if (userId) {
      await step.run("send-cancellation-email", async () => {
        const [userRecord] = await db
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (userRecord) {
          await sendEmail({
            to: userRecord.email,
            subject: "Sorry to see you go",
            template: "subscription-canceled",
            data: {
              userName: userRecord.name || "there",
              reason: data.reason,
            },
            userId,
            context: "billing",
            eventProperties: { kind: "subscription-canceled" },
          });
        }
      });
    }

    // Log analytics
    await step.run("log-analytics", async () => {
      if (userId) {
        await db.insert(analyticsEvent).values({
          userId,
          eventName: "subscription.canceled",
          eventProperties: JSON.stringify({
            subscriptionId: data.subscriptionId,
            reason: data.reason,
            provider: data.provider,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true };
  }
);

// =============================================================================
// Trial Events
// =============================================================================

export const billingTrialStarted = inngest.createFunction(
  { id: "billing-trial-started" },
  { event: "billing/trial.started" },
  async ({ event, step }) => {
    const data = event.data as {
      subscriptionId: string;
      referenceId?: string;
      plan: string;
      trialDays: number;
    };

    const userId = data.referenceId;

    // Log analytics
    await step.run("log-analytics", async () => {
      if (userId) {
        await db.insert(analyticsEvent).values({
          userId,
          eventName: "trial.started",
          eventProperties: JSON.stringify({
            plan: data.plan,
            trialDays: data.trialDays,
            subscriptionId: data.subscriptionId,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true };
  }
);

export const billingTrialEnded = inngest.createFunction(
  { id: "billing-trial-ended" },
  { event: "billing/trial.ended" },
  async ({ event, step }) => {
    const data = event.data as {
      subscriptionId: string;
      referenceId?: string;
      plan: string;
    };

    const userId = data.referenceId;

    // Send trial ending email
    if (userId) {
      await step.run("send-trial-ending-email", async () => {
        const [userRecord] = await db
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (userRecord) {
          await sendEmail({
            to: userRecord.email,
            subject: "Your trial has ended",
            template: "trial-ended",
            data: {
              userName: userRecord.name || "there",
              planName: data.plan,
            },
            userId,
            context: "billing",
            eventProperties: { kind: "trial-ended", plan: data.plan },
          });
        }
      });
    }

    // Log analytics
    await step.run("log-analytics", async () => {
      if (userId) {
        await db.insert(analyticsEvent).values({
          userId,
          eventName: "trial.ended",
          eventProperties: JSON.stringify({
            plan: data.plan,
            subscriptionId: data.subscriptionId,
          }),
          context: "billing",
        });
      }
    });

    return { ok: true };
  }
);

// =============================================================================
// Credits Events
// =============================================================================

export const billingCreditsPurchased = inngest.createFunction(
  { id: "billing-credits-purchased" },
  { event: "billing/credits.purchased" },
  async ({ event, step }) => {
    const data = event.data as {
      userId: string;
      packageId: string;
      credits: number;
      paymentIntentId?: string;
      orderId?: string;
      provider: "stripe" | "polar";
    };

    // Grant the purchased credits
    const result = await step.run("grant-credits", async () => {
      return await grantCredits({
        userId: data.userId,
        amount: data.credits,
        type: "purchase",
        description: `Purchased ${data.credits} credits`,
        provider: data.provider,
        providerPaymentId: data.paymentIntentId || data.orderId,
        metadata: {
          packageId: data.packageId,
        },
      });
    });

    // Send confirmation email
    await step.run("send-confirmation-email", async () => {
      const [userRecord] = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, data.userId))
        .limit(1);

      if (userRecord) {
        await sendEmail({
          to: userRecord.email,
          subject: `${data.credits} credits added to your account`,
          template: "credits-purchased",
          data: {
            userName: userRecord.name || "there",
            credits: data.credits,
            newBalance: result.newBalance,
          },
          userId: data.userId,
          context: "billing",
          eventProperties: { kind: "credits-purchased", credits: data.credits },
        });
      }
    });

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        userId: data.userId,
        eventName: "credits.purchased",
        eventProperties: JSON.stringify({
          credits: data.credits,
          packageId: data.packageId,
          provider: data.provider,
          newBalance: result.newBalance,
        }),
        context: "billing",
      });
    });

    return { ok: true, credits: data.credits, transactionId: result.transactionId };
  }
);

// =============================================================================
// Webhook Events (catch-all for logging)
// =============================================================================

export const stripeWebhookReceived = inngest.createFunction(
  { id: "stripe-webhook-received" },
  { event: "stripe/webhook.received" },
  async ({ event, step }) => {
    const data = event.data as {
      type: string;
      eventId: string;
    };

    // Log for debugging/audit
    console.log(`[Inngest] Stripe webhook: ${data.type} (${data.eventId})`);

    return { ok: true, type: data.type };
  }
);

export const polarWebhookReceived = inngest.createFunction(
  { id: "polar-webhook-received" },
  { event: "polar/webhook.received" },
  async ({ event, step }) => {
    const data = event.data as {
      type: string;
      eventId: string;
    };

    // Log for debugging/audit
    console.log(`[Inngest] Polar webhook: ${data.type} (${data.eventId})`);

    return { ok: true, type: data.type };
  }
);

// =============================================================================
// Export all billing functions
// =============================================================================

export const billingFunctions = [
  billingCustomerCreated,
  billingSubscriptionActivated,
  billingSubscriptionUpdated,
  billingSubscriptionCanceled,
  billingTrialStarted,
  billingTrialEnded,
  billingCreditsPurchased,
  stripeWebhookReceived,
  polarWebhookReceived,
] as const;
