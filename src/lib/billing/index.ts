/**
 * Billing Module - Unified Interface
 *
 * This module provides a provider-agnostic billing interface that works with
 * both Stripe and Polar through Better Auth plugins.
 *
 * Provider selection is based on the BILLING_PROVIDER environment variable.
 */

export * from "./plans";
export * from "./credits";

// Re-export provider-specific utilities
export { stripeClient, createCreditsCheckout as createStripeCreditsCheckout, getCustomerPortalUrl as getStripePortalUrl, createStripeCustomer } from "./stripe-plugin";
export { polarSdkClient, createPolarCheckout, createPolarPortalSession, getPolarCustomerByExternalId, listPolarSubscriptions, cancelPolarSubscription } from "./polar-plugin";

import { getBillingProvider, isStripeEnabled, isPolarEnabled } from "./plans";
import { getStripePlugin } from "./stripe-plugin";
import { getPolarPlugin } from "./polar-plugin";
import type { BetterAuthPlugin } from "better-auth";

/**
 * Get the billing plugin(s) for Better Auth based on the configured provider
 *
 * This function returns the appropriate plugin for the active billing provider.
 * Only one provider should be active at a time.
 */
export function getBillingPlugin(): BetterAuthPlugin | null {
  const provider = getBillingProvider();

  if (provider === "stripe" && isStripeEnabled()) {
    const plugin = getStripePlugin();
    if (plugin) {
      return plugin as unknown as BetterAuthPlugin;
    }
  }

  if (provider === "polar" && isPolarEnabled()) {
    const plugin = getPolarPlugin();
    if (plugin) {
      console.log("[Billing] Polar plugin loaded with checkout, portal, usage, and webhooks.");
      return plugin as unknown as BetterAuthPlugin;
    }
  }

  return null;
}

/**
 * Get billing configuration summary for debugging
 */
export function getBillingConfig() {
  return {
    provider: getBillingProvider(),
    stripeEnabled: isStripeEnabled(),
    polarEnabled: isPolarEnabled(),
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    polarConfigured: !!process.env.POLAR_ACCESS_TOKEN,
  };
}

/**
 * Log billing configuration (for debugging)
 */
export function logBillingConfig() {
  const config = getBillingConfig();
  console.log("[Billing] Configuration:", {
    provider: config.provider,
    stripeEnabled: config.stripeEnabled,
    polarEnabled: config.polarEnabled,
  });
}
