/**
 * Button component with optional confirmation dialog and loading states
 * Integrates seamlessly with useAction hook
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { MESSAGES } from "@/constants";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function ActionButton<TVariables = void>({
    mutation,
    variables,
    requireAreYouSure = false,
    areYouSureDescription = MESSAGES.CONFIRM.DELETE,
    ...props
}: React.ComponentProps<typeof Button> & {
    mutation: {
        mutate: (vars?: TVariables) => void;
        mutateAsync?: (vars?: TVariables) => Promise<unknown>;
        isPending: boolean;
    };
    variables?: TVariables;
    requireAreYouSure?: boolean;
    areYouSureDescription?: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);

    if (!requireAreYouSure) {
        return (
            <Button
                {...props}
                disabled={props.disabled ?? mutation.isPending}
                onClick={(e) => {
                    if (variables !== undefined) {
                        mutation.mutate(variables);
                    } else {
                        mutation.mutate();
                    }
                    props.onClick?.(e);
                }}
            >
                <LoadingSwap isLoading={mutation.isPending}>{props.children}</LoadingSwap>
            </Button>
        );
    }

    return (
        <AlertDialog open={open} onOpenChange={(v) => !mutation.isPending && setOpen(v)}>
            <AlertDialogTrigger
                render={(triggerProps) => (
                    <Button {...props} {...triggerProps}>
                        {props.children}
                    </Button>
                )}
            />

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>{areYouSureDescription}</AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>

                    <AlertDialogAction
                        disabled={mutation.isPending}
                        onClick={async () => {
                            // Always use mutateAsync if available for better error handling
                            if (mutation.mutateAsync) {
                                try {
                                    if (variables !== undefined) {
                                        await mutation.mutateAsync(variables);
                                    } else {
                                        await mutation.mutateAsync();
                                    }
                                    // Only close dialog on successful completion
                                    setOpen(false);
                                } catch {
                                    // Keep dialog open on error so user can:
                                    // 1. See the error message (toast)
                                    // 2. Retry the action
                                    // 3. Cancel if they change their mind
                                }
                            } else {
                                // Fallback to mutate (fire-and-forget)
                                // Close immediately since we can't await
                                if (variables !== undefined) {
                                    mutation.mutate(variables);
                                } else {
                                    mutation.mutate();
                                }
                                setOpen(false);
                            }
                        }}
                    >
                        <LoadingSwap isLoading={mutation.isPending}>Yes</LoadingSwap>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
