import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  Gift,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
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
  useAdminCreditTransactions,
  useBillingStats,
  type AdminCreditTransactionFilters,
} from "@/hooks/use-billing";
import { useOverlay } from "@/lib/store/overlay";
import { useFilters } from "@/lib/filters/core";
import type { CreditTransactionFilters } from "@/lib/filters/schemas";
import { CreditTransactionFiltersSchema } from "@/lib/filters/schemas";
import { GrantCreditsDialog } from "./dialogs/grant-credits-dialog";

interface AdminCreditsViewProps {
  search?: CreditTransactionFilters;
}

const TYPE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  purchase: "default",
  bonus: "secondary",
  usage: "outline",
  refund: "destructive",
};

export function AdminCreditsView({ search }: AdminCreditsViewProps) {
  const navigate = useNavigate();
  const { open } = useOverlay();
  const { data: config, isLoading: isLoadingConfig } = useBillingConfig();
  const { data: statsResult, isLoading: isLoadingStats } = useBillingStats();
  const canWriteBilling = useHasPermission({ billing: ["write"] });

  const stats = statsResult?.ok ? statsResult.data : null;

  const defaultSearch = useMemo(
    () => ({ ...CreditTransactionFiltersSchema.parse({}), page: 1, limit: 20 }),
    []
  );
  const currentSearch = { ...defaultSearch, ...(search ?? {}) };

  const { filters, setFilters, resetFilters, hasActiveFilters } = useFilters(
    currentSearch,
    navigate as unknown as (opts: {
      search: (prev: CreditTransactionFilters) => CreditTransactionFilters;
    }) => void,
    { defaults: defaultSearch }
  );

  // Map filters to admin transaction filters
  const adminFilters: AdminCreditTransactionFilters = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    type: filters.type as AdminCreditTransactionFilters["type"],
    sortBy: filters.sortBy as AdminCreditTransactionFilters["sortBy"],
    sortOrder: filters.sortOrder,
  };

  const { data: transactionsResult, isLoading, refetch } = useAdminCreditTransactions(adminFilters);

  // Extract data from Result wrapper
  const transactionsData = transactionsResult?.ok ? transactionsResult.data : null;
  const transactions = transactionsData?.items ?? [];
  const total = transactionsData?.total ?? 0;
  const totalPages = transactionsData?.totalPages ?? 1;

  // Not configured state
  if (!isLoadingConfig && config?.provider === "none") {
    return (
      <PageContainer
        title="Credit Management"
        description="View and manage user credits"
      >
        <Card>
          <CardHeader>
            <CardTitle>Billing Not Configured</CardTitle>
            <CardDescription>
              Configure billing to manage credits.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Credit Management"
      description="View and manage user credit balances"
      actions={
        canWriteBilling && (
          <Button onClick={() => open("grantCredits")}>
            <Gift className="mr-2 h-4 w-4" />
            Grant Credits
          </Button>
        )
      }
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total in Circulation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.credits?.inCirculation?.toLocaleString() ?? "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Credits available to users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.credits?.used?.toLocaleString() ?? "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total credits consumed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Purchased</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.credits?.purchased?.toLocaleString() ?? "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total credits purchased</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Granted</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.credits?.granted?.toLocaleString() ?? "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Bonus credits given</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Credit Transactions</CardTitle>
              <CardDescription>
                {total} transaction{total !== 1 ? "s" : ""} across all users
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description..."
                  className="pl-8 w-64"
                  value={filters.search ?? ""}
                  onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RotateCcw className="h-4 w-4" />
              </Button>
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
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters
                  ? "No transactions match your filters."
                  : "No credit transactions found."}
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
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.userName || "—"}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.userEmail || tx.userId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TYPE_BADGE_VARIANTS[tx.type] ?? "outline"}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {tx.amount > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <span
                              className={`font-medium ${
                                tx.amount > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {tx.amount > 0 ? "+" : ""}
                              {tx.amount.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
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

      {/* Dialogs */}
      <GrantCreditsDialog />
    </PageContainer>
  );
}
