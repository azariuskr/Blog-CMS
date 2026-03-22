import { CreditCard, MoreHorizontal, Trash2, Check, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  usePaymentMethods,
  useSetDefaultPaymentMethod,
  useDeletePaymentMethod,
} from "@/hooks/use-billing";
import { useOverlay } from "@/lib/store/overlay";

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  amex: "💳",
  discover: "💳",
  diners: "💳",
  jcb: "💳",
  unionpay: "💳",
};

export function PaymentMethods() {
  const { data, isLoading, error } = usePaymentMethods();
  const { open } = useOverlay();
  const setDefaultMutation = useSetDefaultPaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultMutation.mutate({ paymentMethodId });
  };

  const handleDelete = (paymentMethodId: string) => {
    deleteMutation.mutate({ paymentMethodId });
  };

  const handleAddPaymentMethod = () => {
    open("addPaymentMethod");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load payment methods. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const paymentMethods = data.paymentMethods || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Manage your payment methods</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddPaymentMethod}>
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">
              No payment methods added yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Add a payment method to subscribe to plans.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleAddPaymentMethod}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-lg">
                    {CARD_BRAND_ICONS[pm.card?.brand || ""] || "💳"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">
                        {pm.card?.brand || "Card"} •••• {pm.card?.last4}
                      </p>
                      {pm.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires {pm.card?.expMonth}/{pm.card?.expYear}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!pm.isDefault && (
                      <DropdownMenuItem
                        onClick={() => handleSetDefault(pm.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Set as Default
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(pm.id)}
                      disabled={deleteMutation.isPending || pm.isDefault}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
