import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UserBillingView } from "@/components/billing/views/user-billing-view";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import { useVerifyCreditPurchase } from "@/hooks/use-billing";

const billingSearchSchema = z.object({
  credits_success: z.boolean().optional(),
  credits_canceled: z.boolean().optional(),
  package: z.string().optional(),
  success: z.boolean().optional(),
  checkout_id: z.string().optional(),
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/(authenticated)/billing/")({
  component: BillingPage,
  validateSearch: billingSearchSchema,
});

function BillingPage() {
  const search: z.infer<typeof billingSearchSchema> = Route.useSearch();
  const queryClient = useQueryClient();
  const verifyMutation = useVerifyCreditPurchase();
  const hasVerified = useRef(false);

  useEffect(() => {
    // Verify and fulfill credit purchase when returning from successful checkout
    if (search.credits_success && search.package && !hasVerified.current) {
      hasVerified.current = true;

      // Call the verification endpoint to grant credits
      verifyMutation.mutate(
        {
          packageId: search.package,
          sessionId: search.session_id,
        },
        {
          onSuccess: (result) => {
            if (result.ok && result.data) {
              toast.success("Credits purchased successfully!", {
                description: `${result.data.credits} credits added. New balance: ${result.data.newBalance}`,
              });
            } else {
              // Credits may have already been granted via webhook
              toast.success("Credits purchased successfully!", {
                description: `You purchased the ${search.package} package.`,
              });
            }
            // Invalidate credits query to refresh balance
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.CREDITS });
            // Clean up URL
            window.history.replaceState({}, "", "/billing");
          },
          onError: () => {
            // Even if verification fails, the webhook may have already processed
            toast.success("Credits purchased successfully!", {
              description: "Your credits will appear shortly.",
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.CREDITS });
            window.history.replaceState({}, "", "/billing");
          },
        }
      );
    } else if (search.credits_canceled) {
      toast.info("Credit purchase was canceled.");
      window.history.replaceState({}, "", "/billing");
    } else if (search.success) {
      toast.success("Subscription updated successfully!");
      // Invalidate subscription query
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING.SUBSCRIPTION });
      window.history.replaceState({}, "", "/billing");
    }
  }, [search, queryClient, verifyMutation]);

  return <UserBillingView />;
}
