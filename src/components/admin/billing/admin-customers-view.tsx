import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Coins,
  UserPlus,
  Receipt,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
  useBillingConfig,
  useAdminCustomers,
  type AdminCustomerFilters,
} from "@/hooks/use-billing";
import { useFilters } from "@/lib/filters/core";
import { useOverlay } from "@/lib/store/overlay";
import type { CustomerFilters } from "@/lib/filters/schemas";
import { CustomerFiltersSchema } from "@/lib/filters/schemas";
import { CreateCustomerDialog } from "./dialogs/create-customer-dialog";
import { UserPaymentHistoryDrawer } from "./drawers/user-payment-history-drawer";

interface AdminCustomersViewProps {
  search?: CustomerFilters;
}

export function AdminCustomersView({ search }: AdminCustomersViewProps) {
  const navigate = useNavigate();
  const { open } = useOverlay();
  const { data: config, isLoading: isLoadingConfig } = useBillingConfig();
  const canWriteBilling = useHasPermission({ billing: ["write"] });

  const defaultSearch = useMemo(
    () => ({ ...CustomerFiltersSchema.parse({}), page: 1, limit: 20 }),
    []
  );
  const currentSearch = { ...defaultSearch, ...(search ?? {}) };

  const { filters, setFilters, resetFilters, hasActiveFilters } = useFilters(
    currentSearch,
    navigate as unknown as (opts: {
      search: (prev: CustomerFilters) => CustomerFilters;
    }) => void,
    { defaults: defaultSearch }
  );

  // Map filters to admin customer filters
  const adminFilters: AdminCustomerFilters = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    sortBy: filters.sortBy as AdminCustomerFilters["sortBy"],
    sortOrder: filters.sortOrder,
  };

  const { data: customersResult, isLoading, refetch } = useAdminCustomers(adminFilters);

  // Extract data from Result wrapper
  const customersData = customersResult?.ok ? customersResult.data : null;
  const customers = customersData?.items ?? [];
  const total = customersData?.total ?? 0;
  const totalPages = customersData?.totalPages ?? 1;

  // Not configured state
  if (!isLoadingConfig && config?.provider === "none") {
    return (
      <PageContainer
        title="Customer Management"
        description="View billing customers and their details"
      >
        <Card>
          <CardHeader>
            <CardTitle>Billing Not Configured</CardTitle>
            <CardDescription>
              Configure billing to manage customers.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCreateCustomer = (customer: {
    id: string;
    name: string;
    email: string;
  }) => {
    open("createCustomer", {
      userId: customer.id,
      userName: customer.name,
      userEmail: customer.email,
    });
  };

  const handleViewPaymentHistory = (customer: {
    id: string;
    name: string;
    email: string;
  }) => {
    open("userPaymentHistory", {
      userId: customer.id,
      userName: customer.name,
      userEmail: customer.email,
    });
  };

  return (
    <PageContainer
      title="Customer Management"
      description="View billing customers and their details"
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
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                {total} customer{total !== 1 ? "s" : ""} with billing accounts
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
          ) : customers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters
                  ? "No customers match your filters."
                  : "No billing customers found."}
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
                      <TableHead>Provider ID</TableHead>
                      <TableHead>Credit Balance</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={customer.image ?? undefined} />
                              <AvatarFallback>
                                {getInitials(customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.customerId ? (
                            <code className="rounded bg-muted px-2 py-1 text-xs">
                              {customer.customerId.slice(0, 20)}...
                            </code>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Customer
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {customer.creditBalance.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(customer.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {customer.customerId ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleViewPaymentHistory(customer)}
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    Payment History
                                  </DropdownMenuItem>
                                  {config?.provider === "stripe" && (
                                    <DropdownMenuItem render={
                                      <a
                                        href={`https://dashboard.stripe.com/customers/${customer.customerId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View in Stripe
                                      </a>
                                    }>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              ) : (
                                <>
                                  {canWriteBilling && (
                                    <DropdownMenuItem
                                      onClick={() => handleCreateCustomer(customer)}
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Create Customer
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Dialogs and Drawers */}
      <CreateCustomerDialog />
      <UserPaymentHistoryDrawer />
    </PageContainer>
  );
}
