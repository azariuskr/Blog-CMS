import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOverlay } from "@/lib/store/overlay";
import {
  usePlans,
  useSubscription,
  usePreviewProration,
  useChangeSubscription,
} from "@/hooks/use-billing";
// formatPrice available if needed


interface ChangePlanDialogData {
  targetPlanId: string;
  interval: "month" | "year";
}

export function ChangePlanDialog() {
  const { id, data, close } = useOverlay();
  const isOpen = id === "changePlan";
  const dialogData = data as ChangePlanDialogData | null;

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [prorationPreview, setProrationPreview] = useState<{
    currentPlan: string;
    targetPlan: string;
    interval: string;
    immediateCharge: number;
    immediateChargeFormatted: string;
    creditAmount: number;
    creditAmountFormatted: string;
    newMonthlyAmount: number;
    newMonthlyAmountFormatted: string;
    isUpgrade: boolean;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: plansData } = usePlans();
  const { data: subscription } = useSubscription();
  const previewProration = usePreviewProration();
  const changeSubscription = useChangeSubscription({
    onSuccess: () => {
      close();
      setProrationPreview(null);
    },
  });

  // Load proration preview when dialog opens
  useEffect(() => {
    if (isOpen && dialogData?.targetPlanId && dialogData?.interval) {
      setIsLoadingPreview(true);
      setPreviewError(null);

      previewProration.mutate(
        { targetPlanId: dialogData.targetPlanId, interval: dialogData.interval },
        {
          onSuccess: (result) => {
            if (result.ok && result.data) {
              setProrationPreview(result.data);
            } else {
              setPreviewError("Failed to calculate proration");
            }
            setIsLoadingPreview(false);
          },
          onError: () => {
            setPreviewError("Failed to calculate proration");
            setIsLoadingPreview(false);
          },
        }
      );
    }
  }, [isOpen, dialogData?.targetPlanId, dialogData?.interval]);

  const handleConfirm = () => {
    if (!dialogData) return;

    changeSubscription.mutate({
      targetPlanId: dialogData.targetPlanId,
      interval: dialogData.interval,
    });
  };

  const handleClose = () => {
    close();
    setProrationPreview(null);
    setPreviewError(null);
  };

  const targetPlan = plansData?.plans.find(p => p.id === dialogData?.targetPlanId);
  const currentPlan = subscription?.plan;
  const isUpgrade = prorationPreview?.isUpgrade ?? ((targetPlan?.priceMonthly ?? 0) > (currentPlan?.priceMonthly ?? 0));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <ArrowUp className="h-5 w-5 text-green-500" />
                Upgrade Plan
              </>
            ) : (
              <>
                <ArrowDown className="h-5 w-5 text-orange-500" />
                Downgrade Plan
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? "You'll be charged the prorated difference immediately."
              : "Your new plan will take effect at the end of your current billing period."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Change Summary */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="font-semibold">{currentPlan?.name || "Free"}</p>
            </div>
            <div className="px-4">
              {isUpgrade ? (
                <ArrowUp className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowDown className="h-5 w-5 text-orange-500" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">New</p>
              <p className="font-semibold">{targetPlan?.name || "Unknown"}</p>
              <Badge variant="outline" className="mt-1">
                {dialogData?.interval === "year" ? "Yearly" : "Monthly"}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Proration Preview */}
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Calculating...</span>
            </div>
          ) : previewError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          ) : prorationPreview ? (
            <div className="space-y-3">
              {prorationPreview.immediateCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charge today</span>
                  <span className="font-semibold text-green-600">
                    {prorationPreview.immediateChargeFormatted}
                  </span>
                </div>
              )}
              {prorationPreview.creditAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit from current plan</span>
                  <span className="font-semibold">
                    -{prorationPreview.creditAmountFormatted}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">New recurring amount</span>
                <span className="font-semibold">
                  {prorationPreview.newMonthlyAmountFormatted}
                  <span className="text-muted-foreground font-normal">
                    /{dialogData?.interval === "year" ? "year" : "month"}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New plan price</span>
                <span className="font-semibold">
                  {dialogData?.interval === "year"
                    ? targetPlan?.priceYearlyFormatted
                    : targetPlan?.priceMonthlyFormatted}
                  <span className="text-muted-foreground font-normal">
                    /{dialogData?.interval === "year" ? "year" : "month"}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Info note */}
          {!isUpgrade && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll continue to have access to your current plan features until the end of your billing period.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={changeSubscription.isPending || isLoadingPreview}
            variant={isUpgrade ? "default" : "secondary"}
          >
            {changeSubscription.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isUpgrade ? (
              "Confirm Upgrade"
            ) : (
              "Confirm Downgrade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
