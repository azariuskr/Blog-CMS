/**
 * Billing Plans Configuration
 *
 * Code-based plan definitions that integrate with Better Auth plugins.
 * Plans are defined here and mapped to provider-specific product/price IDs.
 */

import { env } from "@/env/server";

export type BillingInterval = "month" | "year";
export type BillingProvider = "stripe" | "polar" | "none";

export interface PlanLimits {
  /** Maximum AI messages per month (null = unlimited) */
  aiMessagesPerMonth: number | null;
  /** Maximum file storage in bytes (null = unlimited) */
  storageBytes: number | null;
  /** Maximum team members (null = unlimited) */
  teamMembers: number | null;
  /** Access to priority support */
  prioritySupport: boolean;
  /** Access to API */
  apiAccess: boolean;
  /** Custom branding */
  customBranding: boolean;
}

export interface Plan {
  /** Internal plan identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Feature list for display */
  features: string[];
  /** Monthly price in cents (0 for free) */
  priceMonthly: number;
  /** Yearly price in cents (0 for free) */
  priceYearly: number;
  /** Currency code */
  currency: string;
  /** Plan limits and quotas */
  limits: PlanLimits;
  /** Trial period in days (0 = no trial) */
  trialDays: number;
  /** Whether this plan is highlighted as popular */
  isPopular: boolean;
  /** Sort order for display */
  sortOrder: number;
}

// =============================================================================
// Plan Definitions
// =============================================================================

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic features",
    features: [
      "5 AI messages per day",
      "100MB storage",
      "1 team member",
      "Community support",
    ],
    priceMonthly: 0,
    priceYearly: 0,
    currency: "usd",
    limits: {
      aiMessagesPerMonth: 150, // ~5/day
      storageBytes: 100 * 1024 * 1024, // 100MB
      teamMembers: 1,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
    },
    trialDays: 0,
    isPopular: false,
    sortOrder: 0,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals and small teams",
    features: [
      "Unlimited AI messages",
      "10GB storage",
      "5 team members",
      "Priority support",
      "API access",
    ],
    priceMonthly: 1900, // $19/month
    priceYearly: 19000, // $190/year (~17% discount)
    currency: "usd",
    limits: {
      aiMessagesPerMonth: null, // unlimited
      storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
      teamMembers: 5,
      prioritySupport: true,
      apiAccess: true,
      customBranding: false,
    },
    trialDays: 14,
    isPopular: true,
    sortOrder: 1,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Unlimited team members",
      "Custom branding",
      "Dedicated support",
      "SSO & advanced security",
    ],
    priceMonthly: 9900, // $99/month
    priceYearly: 99000, // $990/year (~17% discount)
    currency: "usd",
    limits: {
      aiMessagesPerMonth: null,
      storageBytes: null, // unlimited
      teamMembers: null, // unlimited
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
    },
    trialDays: 14,
    isPopular: false,
    sortOrder: 2,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the active billing provider from environment
 */
export function getBillingProvider(): BillingProvider {
  return env.BILLING_PROVIDER;
}

/**
 * Check if billing is enabled
 */
export function isBillingEnabled(): boolean {
  return env.BILLING_PROVIDER !== "none";
}

/**
 * Check if Stripe is the active provider
 */
export function isStripeEnabled(): boolean {
  return env.BILLING_PROVIDER === "stripe" && !!env.STRIPE_SECRET_KEY;
}

/**
 * Check if Polar is the active provider
 */
export function isPolarEnabled(): boolean {
  return env.BILLING_PROVIDER === "polar" && !!env.POLAR_ACCESS_TOKEN;
}

/**
 * Get a plan by its internal ID
 */
export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

/**
 * Get plan limits
 */
export function getPlanLimits(planId: string): PlanLimits | undefined {
  return getPlan(planId)?.limits;
}

/**
 * Get all active plans for display (sorted)
 */
export function getActivePlans(): Plan[] {
  return [...PLANS].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Check if a plan is free
 */
export function isFreePlan(planId: string): boolean {
  const plan = getPlan(planId);
  return plan?.priceMonthly === 0;
}

/**
 * Get the default plan ID (free plan)
 */
export function getDefaultPlanId(): string {
  return "free";
}

/**
 * Get Stripe price ID for a plan
 */
export function getStripePriceId(planId: string, interval: BillingInterval): string | undefined {
  if (planId === "pro") {
    return interval === "month"
      ? env.STRIPE_PRO_MONTHLY_PRICE_ID
      : env.STRIPE_PRO_YEARLY_PRICE_ID;
  }
  if (planId === "enterprise") {
    return interval === "month"
      ? env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
      : env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID;
  }
  return undefined;
}

/**
 * Get Polar product ID for a plan
 */
export function getPolarProductId(planId: string): string | undefined {
  if (planId === "pro") {
    return env.POLAR_PRO_PRODUCT_ID;
  }
  if (planId === "enterprise") {
    return env.POLAR_ENTERPRISE_PRODUCT_ID;
  }
  return undefined;
}

/**
 * Format price for display
 */
export function formatPrice(amountCents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

/**
 * Get the Better Auth Stripe plugin plan configuration
 */
export function getStripePluginPlans() {
  return PLANS.filter(p => p.priceMonthly > 0).map(plan => {
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
      priceId: getStripePriceId(plan.id, "month") || "",
      annualDiscountPriceId: getStripePriceId(plan.id, "year"),
      limits: limitsRecord,
      freeTrial: plan.trialDays > 0 ? { days: plan.trialDays } : undefined,
    };
  });
}
