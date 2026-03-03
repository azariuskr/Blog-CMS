import { format } from "date-fns";
import { History, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSubscriptionHistory } from "@/hooks/use-billing";
import { formatPrice } from "@/lib/billing/plans";

export function SubscriptionHistory() {
  const { data, isLoading, error } = useSubscriptionHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription History</CardTitle>
          <CardDescription>Your past and current subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Failed to load subscription history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const subscriptions = data.subscriptions || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500">Trialing</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      case "incomplete":
        return <Badge variant="outline">Incomplete</Badge>;
      case "incomplete_expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Subscription History
        </CardTitle>
        <CardDescription>Your past and current subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No subscription history yet</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.plan}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {formatPrice(sub.amount || 0, sub.currency || "usd")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{sub.interval}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(sub.status)}
                        {sub.cancelAtPeriodEnd && sub.status === "active" && (
                          <span className="text-xs text-muted-foreground">
                            Cancels at period end
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.currentPeriodStart && sub.currentPeriodEnd ? (
                        <div className="text-sm">
                          <span>
                            {format(new Date(sub.currentPeriodStart), "MMM d")}
                          </span>
                          <span className="text-muted-foreground"> - </span>
                          <span>
                            {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.createdAt
                        ? format(new Date(sub.createdAt), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
