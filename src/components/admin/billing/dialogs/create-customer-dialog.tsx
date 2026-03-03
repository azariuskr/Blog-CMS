import { Loader2, UserPlus, AlertCircle } from "lucide-react";
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
import { useCreateCustomerForUser, useBillingConfig } from "@/hooks/use-billing";

interface CreateCustomerDialogData {
  userId: string;
  userName: string;
  userEmail: string;
}

export function CreateCustomerDialog() {
  const { id, data, close } = useOverlay();
  const isOpen = id === "createCustomer";
  const dialogData = data as CreateCustomerDialogData | null;

  const { data: config } = useBillingConfig();
  const createCustomer = useCreateCustomerForUser({
    onSuccess: () => {
      close();
    },
  });

  const handleConfirm = () => {
    if (!dialogData?.userId) return;
    createCustomer.mutate({ userId: dialogData.userId });
  };

  const providerName = config?.provider === "stripe" ? "Stripe" : config?.provider === "polar" ? "Polar" : "billing provider";

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Billing Customer
          </DialogTitle>
          <DialogDescription>
            Create a {providerName} customer account for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{dialogData?.userName || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{dialogData?.userEmail || "—"}</p>
            </div>
          </div>

          {/* Info note */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will create a customer record in {providerName} linked to this user.
              They will be able to purchase subscriptions and credits.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={createCustomer.isPending}
          >
            {createCustomer.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
