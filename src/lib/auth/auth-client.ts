import { createAuthClient } from "better-auth/react";
import { env } from "@/env/client";
import {
  inferAdditionalFields,
  adminClient,
  magicLinkClient,
  twoFactorClient,
  organizationClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import { polarClient } from "@polar-sh/better-auth/client";
import type { auth } from "./auth";
import { ac, roles } from "./permissions";
import { ROUTES } from "@/constants";

// Helpers to determine which billing provider is enabled on client
const isStripeEnabled = env.VITE_BILLING_PROVIDER === "stripe";
const isPolarEnabled = env.VITE_BILLING_PROVIDER === "polar";

const authClient = createAuthClient({
  baseURL: `${env.VITE_BASE_URL}/api/auth`,
  plugins: [
    inferAdditionalFields<typeof auth>(),
    magicLinkClient(),
    ...(env.VITE_ENABLE_2FA === "true" ? [twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.assign(ROUTES.AUTH.TWO_FACTOR);
      },
    })] : []),
    ...(env.VITE_ENABLE_PASSKEYS === "true" ? [passkeyClient()] : []),
    adminClient({
      ac,
      roles: {
        user: roles.user,
        moderator: roles.moderator,
        admin: roles.admin,
        superAdmin: roles.superAdmin,
      },
    }),
    // Stripe billing client plugin (only when Stripe is the provider)
    ...(isStripeEnabled ? [stripeClient({
      subscription: true,
    })] : []),
    // Polar billing client plugin (only when Polar is the provider)
    // Provides: checkout, customer.portal(), customer.state(), customer.subscriptions.list(), usage.ingest()
    ...(isPolarEnabled ? [polarClient()] : []),
    organizationClient(),
  ],
});

export default authClient;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  changeEmail,
  twoFactor,
  passkey,
  deleteUser,
  admin,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;

// Export subscription methods when Stripe is enabled
// These are type-safe and only available when the plugin is active
export const subscription = isStripeEnabled
  ? (authClient as any).subscription
  : undefined;

// Export Polar-specific methods when Polar is enabled
// Provides: checkout, customer (portal, state, subscriptions, benefits, orders), usage (ingest, meters)
export const checkout = isPolarEnabled
  ? (authClient as any).checkout
  : undefined;

export const customer = isPolarEnabled
  ? (authClient as any).customer
  : undefined;

export const usage = isPolarEnabled
  ? (authClient as any).usage
  : undefined;
