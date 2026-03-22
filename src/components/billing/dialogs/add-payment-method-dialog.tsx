import { Loader2, CreditCard, AlertCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOverlay } from "@/lib/store/overlay";
import { useOpenPortal, useBillingConfig } from "@/hooks/use-billing";

/**
 * Add Payment Method Dialog
 *
 * For Stripe, we redirect to the customer portal where users can securely
 * add their payment methods. This follows industry standard practices
 * (like Vercel, GitHub, etc.) for payment method management.
 */
export function AddPaymentMethodDialog() {
  const { id, close } = useOverlay();
  const isOpen = id === "addPaymentMethod";
  const { data: config } = useBillingConfig();
  const { mutate: openPortal, isPending } = useOpenPortal({
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  const handleOpenPortal = () => {
    openPortal(undefined);
  };

  const providerName = config?.provider === "stripe" ? "Stripe" : config?.provider === "polar" ? "Polar" : "billing provider";

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new payment method to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You'll be redirected to {providerName}'s secure portal to add your payment method.
              This ensures your card details are handled securely.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">What you can do in the billing portal:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Add new credit/debit cards</li>
              <li>• Set default payment method</li>
              <li>• View billing history</li>
              <li>• Update billing information</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleOpenPortal} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Billing Portal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
