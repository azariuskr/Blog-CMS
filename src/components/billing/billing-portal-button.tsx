import { CreditCard } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useBilling, useBillingPortal } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

interface BillingPortalButtonProps extends Omit<ButtonProps, "onClick"> {
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function BillingPortalButton({
  showIcon = true,
  children,
  className,
  variant = "outline",
  size,
  ...props
}: BillingPortalButtonProps) {
  const { isBillingEnabled, hasSubscription } = useBilling();
  const { openPortal, isOpening } = useBillingPortal();

  // Don't show if billing is not enabled or user has no subscription
  if (!isBillingEnabled || !hasSubscription) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={openPortal}
      disabled={isOpening}
      {...props}
    >
      {showIcon && <CreditCard className="mr-2 h-4 w-4" />}
      {isOpening ? "Opening..." : children ?? "Manage Billing"}
    </Button>
  );
}
