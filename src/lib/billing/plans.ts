/**
 * Billing Plans Configuration
 *
 * Blog-specific plans that map to Stripe price IDs.
 * Role plans (author, author_premium) grant writing access on the main blog.
 * Site plans (site_basic, site_pro) grant headless CMS API access — they stack
 * independently on top of any role.
 */

import { env } from "@/env/server";

export type BillingInterval = "month" | "year";
export type BillingProvider = "stripe" | "polar" | "none";

export interface PlanLimits {
  /** Can write posts on the main blog */
  canWriteMainBlog: boolean;
  /** Verified badge shown on author profile */
  isVerified: boolean;
  /** Number of sites allowed (0 = none) */
  sitesAllowed: number;
  /** API keys per site */
  apiKeysPerSite: number;
  /** Priority support */
  prioritySupport: boolean;
  /** Max file storage in bytes (null = unlimited) */
  storageBytes: number | null;
}

export interface Plan {
  /** Internal plan identifier — matches user.plan in DB */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Feature list for pricing page */
  features: string[];
  /** Monthly price in cents (0 for free) */
  priceMonthly: number;
  /** Yearly price in cents (0 for free) */
  priceYearly: number;
  /** Currency code */
  currency: string;
  /** Plan limits and capabilities */
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
    name: "Reader",
    description: "Read, comment, and follow your favourite authors",
    features: [
      "Read all public posts",
      "Leave comments",
      "Follow authors",
      "Bookmark posts",
    ],
    priceMonthly: 0,
    priceYearly: 0,
    currency: "usd",
    limits: {
      canWriteMainBlog: false,
      isVerified: false,
      sitesAllowed: 0,
      apiKeysPerSite: 0,
      prioritySupport: false,
      storageBytes: null,
    },
    trialDays: 0,
    isPopular: false,
    sortOrder: 0,
  },
  {
    id: "author",
    name: "Author",
    description: "Publish your own posts on the main blog",
    features: [
      "Write & publish posts",
      "Author profile page",
      "Post analytics",
      "Scheduled publishing",
      "Community support",
    ],
    priceMonthly: 500,   // $5/mo
    priceYearly: 5000,   // $50/yr
    currency: "usd",
    limits: {
      canWriteMainBlog: true,
      isVerified: false,
      sitesAllowed: 0,
      apiKeysPerSite: 0,
      prioritySupport: false,
      storageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    },
    trialDays: 0,
    isPopular: false,
    sortOrder: 1,
  },
  {
    id: "author_premium",
    name: "Author Premium",
    description: "Everything in Author plus a verified badge and featured placement",
    features: [
      "Everything in Author",
      "Verified badge",
      "Featured placement",
      "Priority support",
      "5 GB storage",
    ],
    priceMonthly: 1000,   // $10/mo
    priceYearly: 10000,   // $100/yr
    currency: "usd",
    limits: {
      canWriteMainBlog: true,
      isVerified: true,
      sitesAllowed: 0,
      apiKeysPerSite: 0,
      prioritySupport: true,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    },
    trialDays: 0,
    isPopular: true,
    sortOrder: 2,
  },
  {
    id: "site_basic",
    name: "Site Basic",
    description: "Power one external website with headless blog content",
    features: [
      "1 site",
      "2 API keys per site",
      "Full REST API access",
      "Site dashboard",
      "Webhook support",
      "Community support",
    ],
    priceMonthly: 1000,   // $10/mo
    priceYearly: 10000,   // $100/yr
    currency: "usd",
    limits: {
      canWriteMainBlog: false,
      isVerified: false,
      sitesAllowed: 1,
      apiKeysPerSite: 2,
      prioritySupport: false,
      storageBytes: null,
    },
    trialDays: 0,
    isPopular: false,
    sortOrder: 3,
  },
  {
    id: "site_pro",
    name: "Site Pro",
    description: "Run up to 5 sites with priority support",
    features: [
      "5 sites",
      "10 API keys per site",
      "Full REST API access",
      "Site dashboard",
      "Webhook support",
      "Priority support",
    ],
    priceMonthly: 3000,   // $30/mo
    priceYearly: 30000,   // $300/yr
    currency: "usd",
    limits: {
      canWriteMainBlog: false,
      isVerified: false,
      sitesAllowed: 5,
      apiKeysPerSite: 10,
      prioritySupport: true,
      storageBytes: null,
    },
    trialDays: 0,
    isPopular: false,
    sortOrder: 4,
  },
];

// =============================================================================
// Helpers
// =============================================================================

export function getBillingProvider(): BillingProvider {
  return env.BILLING_PROVIDER as BillingProvider;
}

export function isStripeEnabled(): boolean {
  return getBillingProvider() === "stripe" && !!env.STRIPE_SECRET_KEY;
}

export function isPolarEnabled(): boolean {
  return getBillingProvider() === "polar" && !!env.POLAR_ACCESS_TOKEN;
}

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getActivePlans(): Plan[] {
  return PLANS.filter((p) => p.priceMonthly > 0);
}

export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

/** Map plan ID + interval to a Stripe price ID from env vars */
export function getStripePriceId(
  planId: string,
  interval: BillingInterval
): string | undefined {
  const suffix = interval === "month" ? "MONTHLY" : "YEARLY";
  const key = `STRIPE_${planId.toUpperCase()}_${suffix}_PRICE_ID` as keyof typeof env;
  return env[key] as string | undefined;
}

/**
 * Determine what role a plan grants.
 * Returns null if the plan doesn't change the role.
 */
export function getPlanRole(planId: string): "author" | null {
  if (planId === "author" || planId === "author_premium") return "author";
  return null;
}

/**
 * Determine how many sites a plan grants.
 */
export function getPlanSitesLimit(planId: string): number {
  return getPlan(planId)?.limits.sitesAllowed ?? 0;
}
