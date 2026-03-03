import { useState } from "react";
import { Coins, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOverlay } from "@/lib/store/overlay";
import { usePurchaseCredits } from "@/hooks/use-billing";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/billing/credits.shared";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function CreditPackageCard({
  pkg,
  isSelected,
  onSelect,
}: {
  pkg: CreditPackage;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        isSelected && "border-primary ring-2 ring-primary/20"
      )}
      onClick={onSelect}
    >
      <CardContent className="relative p-4">
        {pkg.popular && (
          <Badge className="absolute -top-2 right-2 bg-primary">
            <Sparkles className="mr-1 h-3 w-3" />
            Popular
          </Badge>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">{pkg.name}</h4>
            <p className="text-sm text-muted-foreground">{pkg.description}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-bold">
              <Coins className="h-4 w-4 text-primary" />
              {pkg.credits.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatPrice(pkg.priceInCents)}
            </p>
          </div>
        </div>
        {isSelected && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Check className="h-5 w-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PurchaseCreditsDialog() {
  const { id, close } = useOverlay();
  const [selectedPackage, setSelectedPackage] = useState<string>(
    CREDIT_PACKAGES.find((p) => p.popular)?.id || CREDIT_PACKAGES[0].id
  );

  const purchaseMutation = usePurchaseCredits({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
      close();
    },
  });

  const handlePurchase = () => {
    purchaseMutation.mutate({ packageId: selectedPackage });
  };

  const selectedPkg = CREDIT_PACKAGES.find((p) => p.id === selectedPackage);

  return (
    <Dialog open={id === "purchaseCredits"} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            Credits can be used for AI features, image generation, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackage === pkg.id}
              onSelect={() => setSelectedPackage(pkg.id)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">
              {selectedPkg ? formatPrice(selectedPkg.priceInCents) : "$0.00"}
            </p>
          </div>
          <Button
            onClick={handlePurchase}
            disabled={purchaseMutation.isPending || !selectedPackage}
          >
            {purchaseMutation.isPending ? "Processing..." : "Continue to Checkout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
