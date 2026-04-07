import { Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useBilling, useUpgrade } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";
import React from "react";

interface UpgradeButtonProps extends Omit<ButtonProps, "onClick"> {
  planId?: string;
  interval?: "month" | "year";
  showIcon?: boolean;
  children?: React.ReactNode;
  returnTo?: string;
}

export function UpgradeButton({
  planId = "author",
  interval = "month",
  showIcon = true,
  children,
  className,
  variant = "default",
  size,
  returnTo,
  ...props
}: UpgradeButtonProps) {
  const { isBillingEnabled, hasSubscription, currentPlan } = useBilling();
  const { upgrade, isUpgrading } = useUpgrade();

  // Don't show if billing is not enabled
  if (!isBillingEnabled) {
    return null;
  }

  // Don't show if user already has a paid subscription
  if (hasSubscription && currentPlan?.id !== "free") {
    return null;
  }

  const handleClick = () => {
    upgrade(planId, interval, returnTo);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={isUpgrading}
      {...props}
    >
      {showIcon && <Sparkles className="mr-2 h-4 w-4" />}
      {isUpgrading ? "Loading..." : children ?? "Upgrade to Pro"}
    </Button>
  );
}
