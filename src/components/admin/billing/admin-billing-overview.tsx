import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  Coins,
  Receipt,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingConfig, usePlans, useBillingStats } from "@/hooks/use-billing";
import { useHasPermission } from "@/hooks/auth-hooks";
import { ROUTES } from "@/constants";

export function AdminBillingOverview() {
  const { data: config, isLoading: isLoadingConfig } = useBillingConfig();
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const { data: statsResult, isLoading: isLoadingStats } = useBillingStats();

  // Extract stats from the Result wrapper
  const stats = statsResult?.ok ? statsResult.data : null;

  const canWriteBilling = useHasPermission({ billing: ["write"] });
  const canReadBilling = useHasPermission({ billing: ["read"] });

  // Not configured state
  if (!isLoadingConfig && config?.provider === "none") {
    return (
      <PageContainer
        title="Billing Administration"
        description="Manage subscriptions, customers, and revenue"
      >
        <Card>
          <CardHeader>
            <CardTitle>Billing Not Configured</CardTitle>
            <CardDescription>
              Set BILLING_PROVIDER to "stripe" or "polar" in your environment variables to enable billing features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-4 text-sm">
              BILLING_PROVIDER=stripe{"\n"}
              VITE_BILLING_PROVIDER=stripe
            </pre>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Billing Administration"
      description="Manage subscriptions, customers, and revenue"
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions ?? "—"}
          description="Subscriptions with active status"
          icon={CreditCard}
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Monthly Revenue"
          value={stats?.monthlyRevenueFormatted ?? "—"}
          description="MRR from subscriptions"
          icon={DollarSign}
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Total Customers"
          value={stats?.totalCustomers ?? "—"}
          description="Registered billing customers"
          icon={Users}
          isLoading={isLoadingStats}
        />
        <StatsCard
          title="Credits in Circulation"
          value={stats?.credits?.inCirculation?.toLocaleString() ?? "—"}
          description="Total credits available to users"
          icon={Coins}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          title="Subscriptions"
          description="View and manage all user subscriptions"
          icon={CreditCard}
          href={ROUTES.ADMIN.BILLING_SUBSCRIPTIONS}
          canAccess={canReadBilling}
        />
        <QuickActionCard
          title="Customers"
          description="View customer details and billing info"
          icon={Users}
          href={ROUTES.ADMIN.BILLING_CUSTOMERS}
          canAccess={canReadBilling}
        />
        <QuickActionCard
          title="Credits"
          description="Manage user credit balances"
          icon={Coins}
          href={ROUTES.ADMIN.BILLING_CREDITS}
          canAccess={canWriteBilling}
        />
      </div>

      {/* Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
          <CardDescription>Current billing provider and settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConfig ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Provider</p>
                <p className="font-medium capitalize">{config?.provider}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial Period</p>
                <p className="font-medium">{config?.trialDays} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Default Currency</p>
                <p className="font-medium uppercase">{config?.currency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Plans</p>
                <p className="font-medium">{plansData?.plans.length ?? 0} plans</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>Available plans and their pricing</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPlans ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plansData?.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.isPopular && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.priceMonthlyFormatted}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    or {plan.priceYearlyFormatted}/year
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: typeof CreditCard;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, description, icon: Icon, isLoading, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className={`flex items-center text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            <TrendingUp className={`mr-1 h-3 w-3 ${!trend.isPositive && "rotate-180"}`} />
            {trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: typeof CreditCard;
  href: string;
  canAccess: boolean;
}

function QuickActionCard({ title, description, icon: Icon, href, canAccess }: QuickActionCardProps) {
  if (!canAccess) return null;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <Link to={href}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Icon className="h-8 w-8 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Link>
    </Card>
  );
}
