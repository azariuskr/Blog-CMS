/**
 * Shared Credit Types and Constants
 *
 * This file contains types and constants that can be safely imported
 * on both client and server. Database operations are in credits.ts.
 */

// =============================================================================
// Credit Packages
// =============================================================================

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
  currency: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 100,
    priceInCents: 999,
    currency: "usd",
    description: "Perfect for trying out AI features",
  },
  {
    id: "professional",
    name: "Professional Pack",
    credits: 500,
    priceInCents: 3999,
    currency: "usd",
    description: "Great for regular users",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    credits: 2000,
    priceInCents: 14999,
    currency: "usd",
    description: "Best value for power users",
  },
];

// =============================================================================
// Credit Costs per Action
// =============================================================================

export const CREDIT_COSTS = {
  AI_CHAT_MESSAGE: 1,
  AI_IMAGE_GENERATION: 5,
  AI_CODE_REVIEW: 3,
  FILE_PROCESSING_MB: 0.1,
  ADVANCED_ANALYTICS: 2,
  EXPORT_REPORT: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// =============================================================================
// Helper Functions (client-safe)
// =============================================================================

/**
 * Get credit package by ID
 */
export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

/**
 * Get the cost of an action
 */
export function getActionCost(action: CreditAction, quantity: number = 1): number {
  return CREDIT_COSTS[action] * quantity;
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  return new Intl.NumberFormat("en-US").format(credits);
}
