import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SubscriptionStatusProps {
  plan: {
    id: string;
    name: string;
    description?: string;
  };
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Date | null;
  } | null;
  hasSubscription: boolean;
  provider: "stripe" | "polar" | "none";
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  active: { icon: CheckCircle, color: "text-green-500", label: "Active" },
  trialing: { icon: Clock, color: "text-blue-500", label: "Trial" },
  past_due: { icon: AlertCircle, color: "text-yellow-500", label: "Past Due" },
  canceled: { icon: XCircle, color: "text-red-500", label: "Canceled" },
  incomplete: { icon: AlertCircle, color: "text-orange-500", label: "Incomplete" },
};

export function SubscriptionStatus({
  plan,
  subscription,
  hasSubscription,
  provider,
}: SubscriptionStatusProps) {
  const status = subscription?.status ?? "none";
  const config = STATUS_CONFIG[status] ?? { icon: AlertCircle, color: "text-gray-500", label: status };
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
            <CardDescription>
              {provider !== "none" ? `Managed via ${provider === "stripe" ? "Stripe" : "Polar"}` : "Billing not configured"}
            </CardDescription>
          </div>
          {hasSubscription && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1",
                config.color
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{plan.name}</p>
            {plan.description && (
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
        </div>

        {hasSubscription && subscription && (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Current Period</p>
              <p className="text-sm font-medium">
                {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                  <>
                    {format(subscription.currentPeriodStart, "MMM d, yyyy")} -{" "}
                    {format(subscription.currentPeriodEnd, "MMM d, yyyy")}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}

              </p>
            </div>

            {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
              <div>
                <p className="text-xs text-muted-foreground">Trial Ends</p>
                <p className="text-sm font-medium text-blue-500">
                  {format(new Date(subscription.trialEnd), "MMM d, yyyy")}
                </p>
              </div>
            )}

            {subscription.cancelAtPeriodEnd && (
              <div className="col-span-2">
                <Badge variant="destructive" className="text-xs">
                  Cancels at period end
                </Badge>
              </div>
            )}
          </div>
        )}

        {!hasSubscription && (
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              You're on the free plan. Upgrade to unlock more features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
