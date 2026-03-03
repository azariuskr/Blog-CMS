/**
 * Billing Hooks
 *
 * React hooks for billing operations using the useAction pattern.
 * Includes query hooks for data fetching and mutation hooks for actions.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction } from "./use-action";
import { QUERY_KEYS, MUTATION_KEYS, MESSAGES } from "@/constants";
import {
  $getPlans,
  $getSubscription,
  $createSubscriptionCheckout,
  $cancelSubscription,
  $getPortalUrl,
  $getCredits,
  $getCreditPackages,
  $purchaseCredits,
  $useCredits,
  $checkCredits,
  $grantBonusCredits,
  $getBillingConfig,
  // Payment & Subscription History
  $getPaymentHistory,
  $getSubscriptionHistory,
  // Upgrade/Downgrade
  $previewProration,
  $changeSubscription,
  // Admin functions
  $getAllSubscriptions,
  $getAllCustomers,
  $getAllCreditTransactions,
  $getBillingStats,
  $getCreditTransactionFacets,
  $createCustomerForUser,
  $getUserPaymentHistory,
  $adminChangeSubscription,
  // Payment methods
  $getPaymentMethods,
  $createSetupIntent,
  $setDefaultPaymentMethod,
  $deletePaymentMethod,
  $verifyCreditPurchase,
} from "@/lib/billing/functions";
import type { CreditAction } from "@/lib/billing/credits.shared";

// =============================================================================
// Query Hooks (Data Fetching)
// =============================================================================

/**
 * Get billing configuration
 */
export function useBillingConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.CONFIG,
    queryFn: () => $getBillingConfig(),
    staleTime: 1000 * 60 * 60, // 1 hour - config rarely changes
  });
}

/**
 * Get available subscription plans
 */
export function usePlans() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.PLANS,
    queryFn: () => $getPlans(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Get current user's subscription status
 */
export function useSubscription() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.SUBSCRIPTION,
    queryFn: () => $getSubscription(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get user's credit balance and recent transactions
 */
export function useCredits() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.CREDITS,
    queryFn: () => $getCredits(),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Get available credit packages
 */
export function useCreditPackages() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.CREDIT_PACKAGES,
    queryFn: () => $getCreditPackages(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Get user's payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.PAYMENT_METHODS,
    queryFn: () => $getPaymentMethods(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// Mutation Hooks (Actions)
// =============================================================================

/**
 * Create subscription checkout session
 */
export function useCreateCheckout(options?: {
  onSuccess?: (data: { checkoutUrl: string | null; sessionId: string }) => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { planId: string; interval: "month" | "year" }) => {
      try {
        const result = await $createSubscriptionCheckout({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: "Redirecting to checkout...",
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.CHECKOUT_FAILED,
          },
          message: MESSAGES.ERROR.CHECKOUT_FAILED,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.CREATE_CHECKOUT,
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Cancel subscription
 */
export function useCancelSubscription(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { subscriptionId: string; cancelAtPeriodEnd?: boolean }) => {
      try {
        const result = await $cancelSubscription({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: MESSAGES.SUCCESS.SUBSCRIPTION_CANCELED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : "Failed to cancel subscription",
          },
          message: "Failed to cancel subscription",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.CANCEL_SUBSCRIPTION,
      invalidate: [QUERY_KEYS.BILLING.SUBSCRIPTION],
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Get customer portal URL and redirect
 */
export function useOpenPortal(options?: {
  onSuccess?: (url: string) => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async () => {
      try {
        const result = await $getPortalUrl();
        return {
          ok: true as const,
          data: result.url,
          message: "Opening billing portal...",
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.PORTAL_FAILED,
          },
          message: MESSAGES.ERROR.PORTAL_FAILED,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.GET_PORTAL_URL,
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Create setup intent for adding a new payment method
 */
export function useCreateSetupIntent(options?: {
  onSuccess?: (data: { clientSecret: string | null; customerId: string }) => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async () => {
      try {
        const result = await $createSetupIntent();
        return {
          ok: true as const,
          data: result,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
          },
          message: MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.CREATE_SETUP_INTENT,
      showToast: false,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Set default payment method
 */
export function useSetDefaultPaymentMethod(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useAction(
    async (vars: { paymentMethodId: string }) => {
      try {
        await $setDefaultPaymentMethod({ data: vars });
        return {
          ok: true as const,
          data: undefined,
          message: MESSAGES.SUCCESS.DEFAULT_PAYMENT_METHOD_SET,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
          },
          message: MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.SET_DEFAULT_PAYMENT_METHOD,
      showToast: true,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.PAYMENT_METHODS });
        options?.onSuccess?.();
      },
      onError: options?.onError,
    }
  );
}

/**
 * Delete payment method
 */
export function useDeletePaymentMethod(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useAction(
    async (vars: { paymentMethodId: string }) => {
      try {
        await $deletePaymentMethod({ data: vars });
        return {
          ok: true as const,
          data: undefined,
          message: MESSAGES.SUCCESS.PAYMENT_METHOD_REMOVED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
          },
          message: MESSAGES.ERROR.PAYMENT_METHOD_FAILED,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.DELETE_PAYMENT_METHOD,
      showToast: true,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.PAYMENT_METHODS });
        options?.onSuccess?.();
      },
      onError: options?.onError,
    }
  );
}

/**
 * Purchase credits
 */
export function usePurchaseCredits(options?: {
  onSuccess?: (data: { checkoutUrl: string | null; sessionId: string }) => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { packageId: string }) => {
      try {
        const result = await $purchaseCredits({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: "Redirecting to checkout...",
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : "Failed to create checkout",
          },
          message: "Failed to create checkout",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.PURCHASE_CREDITS,
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Use credits for an action
 */
export function useConsumeCredits(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { action: CreditAction; quantity?: number; description?: string }) => {
      try {
        const result = await $useCredits({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: MESSAGES.SUCCESS.CREDITS_USED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : MESSAGES.ERROR.CREDITS_INSUFFICIENT,
          },
          message: MESSAGES.ERROR.CREDITS_INSUFFICIENT,
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.USE_CREDITS,
      invalidate: [QUERY_KEYS.BILLING.CREDITS],
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Check if user has enough credits for an action
 */
export function useCheckCredits() {
  const queryClient = useQueryClient();

  return async (action: CreditAction, quantity?: number) => {
    const result = await $checkCredits({ data: { action, quantity } });
    // Optionally update credits cache with latest balance
    queryClient.setQueryData(QUERY_KEYS.BILLING.CREDITS, (old: any) => {
      if (old) {
        return { ...old, balance: result.balance };
      }
      return old;
    });
    return result;
  };
}

/**
 * Admin: Grant bonus credits to a user
 */
export function useGrantCredits(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { userId: string; amount: number; description: string }) => {
      try {
        const result = await $grantBonusCredits({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: MESSAGES.SUCCESS.CREDITS_GRANTED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : "Failed to grant credits",
          },
          message: "Failed to grant credits",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.GRANT_CREDITS,
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Verify and fulfill a credit purchase after checkout success
 * Call this when the user returns from checkout with success=true
 */
export function useVerifyCreditPurchase(options?: {
  onSuccess?: (data: { credits: number; newBalance: number }) => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useAction(
    async (vars: { sessionId?: string; packageId: string }) => {
      try {
        const result = await $verifyCreditPurchase({ data: vars });
        if (result.ok) {
          return {
            ok: true as const,
            data: { credits: result.credits, newBalance: result.newBalance },
            message: `${result.credits} credits added to your account!`,
          };
        }
        return {
          ok: false as const,
          error: {
            status: 400,
            message: result.error || "Failed to verify purchase",
          },
          message: result.error || "Failed to verify purchase",
        };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            status: 500,
            message: error instanceof Error ? error.message : "Failed to verify purchase",
          },
          message: "Failed to verify purchase",
        };
      }
    },
    {
      mutationKey: ["billing", "verify-credit-purchase"],
      showToast: false, // We'll handle the toast in the component
      onSuccess: (data) => {
        // Invalidate credits query to refresh balance
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.CREDITS });
        options?.onSuccess?.(data);
      },
      onError: options?.onError,
    }
  );
}

// =============================================================================
// Combined Hooks (Convenience)
// =============================================================================

/**
 * Combined billing state hook for common use cases
 */
export function useBilling() {
  const config = useBillingConfig();
  const subscription = useSubscription();
  const credits = useCredits();
  const plans = usePlans();

  return {
    // Data
    config: config.data,
    subscription: subscription.data,
    credits: credits.data,
    plans: plans.data,

    // Loading states
    isLoading: config.isLoading || subscription.isLoading,
    isLoadingPlans: plans.isLoading,
    isLoadingCredits: credits.isLoading,

    // Error states
    error: config.error || subscription.error,
    plansError: plans.error,
    creditsError: credits.error,

    // Convenience flags
    isBillingEnabled: config.data?.provider !== "none",
    hasSubscription: subscription.data?.hasSubscription ?? false,
    currentPlan: subscription.data?.plan,
    creditBalance: credits.data?.balance ?? 0,

    // Refetch functions
    refetchSubscription: subscription.refetch,
    refetchCredits: credits.refetch,
    refetchPlans: plans.refetch,
  };
}

/**
 * Hook for upgrade flow with checkout
 */
export function useUpgrade() {
  const { mutate: createCheckout, isPending } = useCreateCheckout({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  const upgrade = (planId: string, interval: "month" | "year" = "month") => {
    createCheckout({ planId, interval });
  };

  return {
    upgrade,
    isUpgrading: isPending,
  };
}

/**
 * Hook for managing billing portal access
 */
export function useBillingPortal() {
  const { mutate: openPortal, isPending } = useOpenPortal({
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  return {
    openPortal: () => openPortal(undefined as never),
    isOpening: isPending,
  };
}

// =============================================================================
// Admin Hooks
// =============================================================================

export interface AdminSubscriptionFilters extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  status?: Array<"active" | "trialing" | "past_due" | "canceled" | "incomplete">;
  plan?: string[];
  sortBy?: "createdAt" | "updatedAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface AdminCustomerFilters extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  hasSubscription?: boolean;
  sortBy?: "createdAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
}

export interface AdminCreditTransactionFilters extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  type?: Array<"purchase" | "usage" | "bonus" | "refund">;
  userId?: string;
  sortBy?: "createdAt" | "amount" | "type";
  sortOrder?: "asc" | "desc";
}

/**
 * Admin: Get all subscriptions with pagination and filters
 */
export function useAdminSubscriptions(filters: AdminSubscriptionFilters = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.SUBSCRIPTIONS_PAGINATED(filters),
    queryFn: () => $getAllSubscriptions({ data: filters }),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Admin: Get all billing customers with pagination and filters
 */
export function useAdminCustomers(filters: AdminCustomerFilters = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.CUSTOMERS_PAGINATED(filters),
    queryFn: () => $getAllCustomers({ data: filters }),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Admin: Get all credit transactions with pagination and filters
 */
export function useAdminCreditTransactions(filters: AdminCreditTransactionFilters = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.TRANSACTIONS_PAGINATED(filters),
    queryFn: () => $getAllCreditTransactions({ data: filters }),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Admin: Get billing statistics for dashboard
 */
export function useBillingStats() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.STATS,
    queryFn: () => $getBillingStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Admin: Get credit transaction facets for filtering
 */
export function useCreditTransactionFacets() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.TRANSACTION_FACETS,
    queryFn: () => $getCreditTransactionFacets(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// Payment & Subscription History Hooks
// =============================================================================

/**
 * Get user's payment history (invoices)
 */
export function usePaymentHistory() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.PAYMENT_HISTORY,
    queryFn: () => $getPaymentHistory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get user's subscription history
 */
export function useSubscriptionHistory() {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.SUBSCRIPTION_HISTORY,
    queryFn: () => $getSubscriptionHistory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// Subscription Change Hooks (Upgrade/Downgrade)
// =============================================================================

/**
 * Preview proration for subscription change
 */
export function usePreviewProration() {
  return useAction(
    async (vars: { targetPlanId: string; interval: "month" | "year" }) => {
      try {
        const result = await $previewProration({ data: vars });
        if (!result.ok) {
          return {
            ok: false as const,
            error: { status: 400, message: result.error },
            message: result.error,
          };
        }
        return {
          ok: true as const,
          data: result.data,
          message: "Proration preview generated",
        };
      } catch (error) {
        return {
          ok: false as const,
          error: { status: 500, message: error instanceof Error ? error.message : "Failed to preview proration" },
          message: "Failed to preview proration",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.PREVIEW_PRORATION,
      showToast: false, // Don't show toast for preview
    }
  );
}

/**
 * Change subscription (upgrade or downgrade)
 */
export function useChangeSubscription(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { targetPlanId: string; interval: "month" | "year"; prorationBehavior?: "create_prorations" | "always_invoice" | "none" }) => {
      try {
        const result = await $changeSubscription({ data: vars });
        return {
          ok: true as const,
          data: result,
          message: result.subscription.isUpgrade
            ? MESSAGES.SUCCESS.SUBSCRIPTION_UPGRADED
            : MESSAGES.SUCCESS.SUBSCRIPTION_DOWNGRADED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: { status: 500, message: error instanceof Error ? error.message : "Failed to change subscription" },
          message: "Failed to change subscription",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.CHANGE_SUBSCRIPTION,
      invalidate: [QUERY_KEYS.BILLING.SUBSCRIPTION, QUERY_KEYS.BILLING.SUBSCRIPTION_HISTORY],
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

// =============================================================================
// Admin: Customer Management Hooks
// =============================================================================

/**
 * Admin: Create a billing customer for an existing user
 */
export function useCreateCustomerForUser(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { userId: string }) => {
      try {
        const result = await $createCustomerForUser({ data: vars });
        if (!result.ok) {
          return {
            ok: false as const,
            error: { status: 500, message: result.error?.message || "Failed to create customer" },
            message: result.error?.message || "Failed to create customer",
          };
        }
        if (!result.data.success) {
          return {
            ok: false as const,
            error: { status: 400, message: result.data.message || "Customer already exists" },
            message: result.data.message || "Customer already exists",
          };
        }
        return {
          ok: true as const,
          data: result.data,
          message: MESSAGES.SUCCESS.CUSTOMER_CREATED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: { status: 500, message: error instanceof Error ? error.message : "Failed to create customer" },
          message: "Failed to create customer",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.CREATE_CUSTOMER,
      invalidate: [QUERY_KEYS.BILLING.CUSTOMERS_PAGINATED({})],
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}

/**
 * Admin: Get payment history for a specific user
 */
export function useUserPaymentHistory(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.BILLING.USER_PAYMENT_HISTORY(userId),
    queryFn: () => $getUserPaymentHistory({ data: { userId } }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false && !!userId,
  });
}

/**
 * Admin: Change a user's subscription
 */
export function useAdminChangeSubscription(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useAction(
    async (vars: { userId: string; targetPlanId: string; interval: "month" | "year" }) => {
      try {
        const result = await $adminChangeSubscription({ data: vars });
        if (!result.ok) {
          return {
            ok: false as const,
            error: { status: 500, message: result.error?.message || "Failed to change subscription" },
            message: result.error?.message || "Failed to change subscription",
          };
        }
        return {
          ok: true as const,
          data: result.data,
          message: MESSAGES.SUCCESS.SUBSCRIPTION_CHANGED,
        };
      } catch (error) {
        return {
          ok: false as const,
          error: { status: 500, message: error instanceof Error ? error.message : "Failed to change subscription" },
          message: "Failed to change subscription",
        };
      }
    },
    {
      mutationKey: MUTATION_KEYS.BILLING.ADMIN_CHANGE_SUBSCRIPTION,
      showToast: true,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    }
  );
}
