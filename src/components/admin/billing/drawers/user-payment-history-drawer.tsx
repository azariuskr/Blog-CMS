import { format } from "date-fns";
import {
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Receipt,
  CreditCard,
  Loader2,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOverlay } from "@/lib/store/overlay";
import { useUserPaymentHistory, useBillingConfig } from "@/hooks/use-billing";
import { formatPrice } from "@/lib/billing/plans";

interface UserPaymentHistoryDrawerData {
  userId: string;
  userName: string;
  userEmail: string;
}

export function UserPaymentHistoryDrawer() {
  const { id, data, close } = useOverlay();
  const isOpen = id === "userPaymentHistory";
  const drawerData = data as UserPaymentHistoryDrawerData | null;

  const { data: config } = useBillingConfig();
  const { data: historyResult, isLoading, error } = useUserPaymentHistory(
    drawerData?.userId || "",
    { enabled: isOpen && !!drawerData?.userId }
  );

  // Extract data from Result wrapper
  const historyData = historyResult?.ok ? historyResult.data : null;
  const invoices = historyData?.invoices || [];
  const charges = historyData?.charges || [];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
      case "succeeded":
        return <Badge variant="default">Paid</Badge>;
      case "open":
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "void":
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </SheetTitle>
          <SheetDescription>
            {drawerData?.userName || "User"} ({drawerData?.userEmail})
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error || !historyData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {historyData?.error || "Failed to load payment history"}
              </p>
              {!historyData?.user?.customerId && (
                <p className="text-sm text-muted-foreground mt-2">
                  This user doesn't have a billing customer account yet.
                </p>
              )}
            </div>
          ) : (
            <Tabs defaultValue="invoices">
              <TabsList className="w-full">
                <TabsTrigger value="invoices" className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
                  Invoices ({invoices.length})
                </TabsTrigger>
                <TabsTrigger value="charges" className="flex-1">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Charges ({charges.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-280px)] mt-4">
                {/* Invoices Tab */}
                <TabsContent value="invoices" className="mt-0">
                  {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No invoices found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="rounded-lg border p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {invoice.number || invoice.id.slice(0, 20)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {invoice.description || "Invoice"}
                              </p>
                            </div>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {invoice.createdAt
                                ? format(new Date(invoice.createdAt), "MMM d, yyyy")
                                : "—"}
                            </span>
                            <span className="font-semibold">
                              {formatPrice(invoice.amount, invoice.currency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            {invoice.invoicePdf && (
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={invoice.invoicePdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="mr-2 h-3 w-3" />
                                    PDF
                                  </a>
                                }
                              />
                            )}
                            {invoice.hostedUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={invoice.hostedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-3 w-3" />
                                    View
                                  </a>
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Charges Tab */}
                <TabsContent value="charges" className="mt-0">
                  {charges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No charges found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {charges.map((charge) => (
                        <div
                          key={charge.id}
                          className="rounded-lg border p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {charge.description || "Charge"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {charge.id.slice(0, 24)}...
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(charge.status)}
                              {charge.refunded && (
                                <Badge variant="outline" className="text-xs">
                                  Refunded: {formatPrice(charge.refundedAmount || 0, charge.currency)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {charge.createdAt
                                ? format(new Date(charge.createdAt), "MMM d, yyyy HH:mm")
                                : "—"}
                            </span>
                            <span className="font-semibold">
                              {formatPrice(charge.amount, charge.currency)}
                            </span>
                          </div>
                          {charge.receiptUrl && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={charge.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-3 w-3" />
                                    Receipt
                                  </a>
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </div>

        {/* View in Provider Dashboard */}
        {historyData?.user?.customerId && config?.provider === "stripe" && (
          <>
            <Separator className="my-4" />
            <Button
              variant="outline"
              className="w-full"
              render={
                <a
                  href={`https://dashboard.stripe.com/customers/${historyData.user.customerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Stripe Dashboard
                </a>
              }
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
