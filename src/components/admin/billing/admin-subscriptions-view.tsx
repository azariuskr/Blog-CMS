import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
  useBillingConfig,
  useAdminSubscriptions,
  type AdminSubscriptionFilters,
} from "@/hooks/use-billing";
import { useFilters } from "@/lib/filters/core";
import type { SubscriptionFilters } from "@/lib/filters/schemas";
import { SubscriptionFiltersSchema } from "@/lib/filters/schemas";

interface AdminSubscriptionsViewProps {
  search?: SubscriptionFilters;
}

const STATUS_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceled: "outline",
  incomplete: "outline",
};

export function AdminSubscriptionsView({ search }: AdminSubscriptionsViewProps) {
  const navigate = useNavigate();
  const { data: config, isLoading: isLoadingConfig } = useBillingConfig();
  const canWriteBilling = useHasPermission({ billing: ["write"] });

  const defaultSearch = useMemo(
    () => ({ ...SubscriptionFiltersSchema.parse({}), page: 1, limit: 20 }),
    []
  );
  const currentSearch = { ...defaultSearch, ...(search ?? {}) };

  const { filters, setFilters, resetFilters, hasActiveFilters } = useFilters(
    currentSearch,
    navigate as unknown as (opts: {
      search: (prev: SubscriptionFilters) => SubscriptionFilters;
    }) => void,
    { defaults: defaultSearch }
  );

  // Map filters to admin subscription filters
  const adminFilters: AdminSubscriptionFilters = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    status: filters.status as AdminSubscriptionFilters["status"],
    plan: filters.plan,
    sortBy: filters.sortBy as AdminSubscriptionFilters["sortBy"],
    sortOrder: filters.sortOrder,
  };

  const { data: subscriptionsResult, isLoading, refetch } = useAdminSubscriptions(adminFilters);

  // Extract data from Result wrapper
  const subscriptionsData = subscriptionsResult?.ok ? subscriptionsResult.data : null;
  const subscriptions = subscriptionsData?.items ?? [];
  const total = subscriptionsData?.total ?? 0;
  const totalPages = subscriptionsData?.totalPages ?? 1;

  // Not configured state
  if (!isLoadingConfig && config?.provider === "none") {
    return (
      <PageContainer
        title="Subscription Management"
        description="View and manage all user subscriptions"
      >
        <Card>
          <CardHeader>
            <CardTitle>Billing Not Configured</CardTitle>
            <CardDescription>
              Configure billing to manage subscriptions.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Subscription Management"
      description="View and manage all user subscriptions"
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                {total} subscription{total !== 1 ? "s" : ""} from{" "}
                {config?.provider === "stripe" ? "Stripe" : "Polar"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  className="pl-8 w-64"
                  value={filters.search ?? ""}
                  onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters
                  ? "No subscriptions match your filters."
                  : "No subscriptions found."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Interval</TableHead>
                      <TableHead>Current Period</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.userName || "—"}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.userEmail || sub.userId || "Unknown"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANTS[sub.status] ?? "outline"}>
                            {sub.status}
                          </Badge>
                          {sub.cancelAtPeriodEnd && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (canceling)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{sub.interval}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}
                            </p>
                            <p className="text-muted-foreground">
                              to {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(sub.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {filters.page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                      disabled={filters.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                      disabled={filters.page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
