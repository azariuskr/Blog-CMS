import * as React from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";

export function SignOutButton() {
  const { signOut } = useSignOut();
  return (
    <Button
      onClick={signOut}
      type="button"
      className="w-fit"
      variant="destructive"
      size="lg"
    >
      Sign out
    </Button>
  );
}

type SignOutMenuItemProps = {
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
  onSignedOut?: () => void;
};

export function SignOutMenuItem({
  className,
  iconClassName,
  children = "Log out",
  onSignedOut,
}: SignOutMenuItemProps) {
  const { signOut } = useSignOut();

  const handleClick = async () => {
    await signOut();
    onSignedOut?.();
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "text-destructive focus:text-destructive",
        className
      )}
    >
      <LogOut className={cn("mr-2 size-4", iconClassName)} />
      {children}
    </DropdownMenuItem>
  );
}
