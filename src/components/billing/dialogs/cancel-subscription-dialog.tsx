import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MESSAGES } from "@/constants";
import { useCancelSubscription } from "@/hooks/use-billing";
import { useOverlay } from "@/lib/store/overlay";
import { useState } from "react";

interface SubscriptionData {
  id: string;
  currentPeriodEnd?: Date;
}

export function CancelSubscriptionDialog() {
  const { id, data, close } = useOverlay();
  const subscription = data as SubscriptionData | undefined;
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const cancelMutation = useCancelSubscription({
    onSuccess: () => {
      close();
    },
  });

  const handleCancel = async () => {
    if (!subscription?.id) return;

    await cancelMutation.mutateAsync({
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: !cancelImmediately,
    });
  };

  return (
    <AlertDialog open={id === "cancelSubscription"} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </AlertDialogTitle>
          <AlertDialogDescription>
            {cancelImmediately
              ? MESSAGES.CONFIRM.CANCEL_SUBSCRIPTION_IMMEDIATE
              : MESSAGES.CONFIRM.CANCEL_SUBSCRIPTION}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 rounded-lg border p-4">
          <Checkbox
            id="cancelImmediately"
            checked={cancelImmediately}
            onCheckedChange={(checked) => setCancelImmediately(checked === true)}
          />
          <Label htmlFor="cancelImmediately" className="text-sm font-normal">
            Cancel immediately (no access after confirmation)
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            Keep Subscription
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
