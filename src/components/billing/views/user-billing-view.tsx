import { useState, useEffect } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { PlanCard } from "@/components/billing/plan-card";
import { SubscriptionStatus } from "@/components/billing/subscription-status";
import { CreditBalance } from "@/components/billing/credit-balance";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { PaymentHistory } from "@/components/billing/payment-history";
import { SubscriptionHistory } from "@/components/billing/subscription-history";
import { PaymentMethods } from "@/components/billing/payment-methods";
import { ChangePlanDialog } from "@/components/billing/dialogs/change-plan-dialog";
import { AddPaymentMethodDialog } from "@/components/billing/dialogs/add-payment-method-dialog";
import { PurchaseCreditsDialog } from "@/components/billing/dialogs/purchase-credits-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling, usePlans, useCredits, useUpgrade, useCancelSubscription, usePaymentMethods } from "@/hooks/use-billing";
import { useOverlay } from "@/lib/store/overlay";
import { CancelSubscriptionDialog } from "../dialogs/cancel-subscription-dialog";

type BillingTab = "overview" | "history" | "invoices";

export function UserBillingView() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [activeTab, setActiveTab] = useState<BillingTab>("overview");
  const [isMounted, setIsMounted] = useState(false);
  const { open } = useOverlay();

  // Track when component is mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data hooks
  const { subscription, hasSubscription, currentPlan, isBillingEnabled, isLoading } = useBilling();
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const { data: creditsData, isLoading: isLoadingCredits } = useCredits();
  const { data: paymentMethodsData, isLoading: isLoadingPaymentMethods } = usePaymentMethods();

  // Action hooks
  const { upgrade, isUpgrading } = useUpgrade();
  const cancelMutation = useCancelSubscription();

  const handleSelectPlan = (planId: string, interval: "month" | "year") => {
    // Check if user has a payment method for subscription changes
    const hasPaymentMethod = paymentMethodsData?.hasPaymentMethod;

    // If user has a subscription and wants to change plans
    if (hasSubscription && currentPlan?.id !== "free" && currentPlan?.id !== planId) {
      // Require payment method for plan changes
      if (!hasPaymentMethod) {
        open("addPaymentMethod");
        return;
      }
      open("changePlan", { targetPlanId: planId, interval });
    } else {
      // For new subscriptions, Stripe checkout will handle payment collection
      upgrade(planId, interval);
    }
  };

  const handleCancelSubscription = () => {
    if (subscription?.subscription?.id) {
      open("cancelSubscription", subscription.subscription);
    }
  };

  // Use combined loading state that's consistent during hydration
  // Show loading skeleton until mounted AND data is loaded
  const showLoading = !isMounted || isLoading;

  // Not configured state
  if (isMounted && !isLoading && !isBillingEnabled) {
    return (
      <PageContainer
        title="Billing"
        description="Manage your subscription and billing"
      >
        <Card>
          <CardHeader>
            <CardTitle>Billing Not Configured</CardTitle>
            <CardDescription>
              Billing features are not currently available. Please contact the administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Billing"
      description="Manage your subscription and billing"
      actions={<BillingPortalButton />}
    >
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BillingTab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Subscription History</TabsTrigger>
          <TabsTrigger value="invoices">Payment History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - 2 columns */}
            <div className="space-y-6 lg:col-span-2">
              {/* Current Subscription */}
              {showLoading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <SubscriptionStatus
                  plan={currentPlan ?? { id: "free", name: "Free" }}
                  subscription={subscription?.subscription}
                  hasSubscription={hasSubscription}
                  provider={subscription?.provider ?? "none"}
                />
              )}

              {/* Plans Section */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {hasSubscription && currentPlan?.id !== "free"
                      ? "Change Your Plan"
                      : "Available Plans"}
                  </CardTitle>
                  <CardDescription>
                    {hasSubscription && currentPlan?.id !== "free"
                      ? "Upgrade or downgrade your subscription. Changes are prorated."
                      : "Choose a plan that fits your needs"}
                  </CardDescription>
                  <Tabs
                    value={billingInterval}
                    onValueChange={(v) => setBillingInterval(v as "month" | "year")}
                    className="w-fit"
                  >
                    <TabsList>
                      <TabsTrigger value="month">Monthly</TabsTrigger>
                      <TabsTrigger value="year">
                        Yearly
                        <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                          Save 20%
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  {!isMounted || isLoadingPlans ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-80 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {plansData?.plans.map((plan) => {
                        const isCurrentPlan = currentPlan?.id === plan.id;
                        const isUpgrade = !isCurrentPlan &&
                          hasSubscription &&
                          currentPlan?.id !== "free" &&
                          (plan.priceMonthly > (currentPlan?.priceMonthly ?? 0));
                        const isDowngrade = !isCurrentPlan &&
                          hasSubscription &&
                          currentPlan?.id !== "free" &&
                          (plan.priceMonthly < (currentPlan?.priceMonthly ?? 0)) &&
                          plan.priceMonthly > 0;

                        return (
                          <PlanCard
                            key={plan.id}
                            {...plan}
                            interval={billingInterval}
                            isCurrentPlan={isCurrentPlan}
                            onSelect={handleSelectPlan}
                            isLoading={isUpgrading}
                            disabled={isUpgrading || isCurrentPlan}
                            buttonLabel={
                              isCurrentPlan
                                ? "Current Plan"
                                : isUpgrade
                                  ? "Upgrade"
                                  : isDowngrade
                                    ? "Downgrade"
                                    : plan.isFree
                                      ? "Free"
                                      : "Subscribe"
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manage Subscription Actions */}
              {hasSubscription && currentPlan?.id !== "free" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Actions</CardTitle>
                    <CardDescription>
                      Manage your current subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4">
                    <BillingPortalButton variant="outline">
                      Update Payment Method
                    </BillingPortalButton>
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Credits & Payment Methods */}
            <div className="space-y-6">
              {!isMounted || isLoadingCredits ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <CreditBalance
                  balance={creditsData?.balance ?? 0}
                  transactions={creditsData?.transactions?.map(t => ({
                    ...t,
                    createdAt: new Date(t.createdAt),
                  }))}
                />
              )}

              {/* Payment Methods */}
              {!isMounted || isLoadingPaymentMethods ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <PaymentMethods />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Subscription History Tab */}
        <TabsContent value="history">
          <SubscriptionHistory />
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="invoices">
          <PaymentHistory />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CancelSubscriptionDialog />
      <ChangePlanDialog />
      <AddPaymentMethodDialog />
      <PurchaseCreditsDialog />
    </PageContainer>
  );
}
