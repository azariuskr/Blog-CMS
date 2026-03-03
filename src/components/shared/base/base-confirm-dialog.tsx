import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BaseDialog } from "./base-dialog";

interface BaseConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
    isLoading?: boolean;
}

export function BaseConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    onCancel,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    isLoading = false,
}: BaseConfirmDialogProps) {
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    const handleConfirm = () => {
        onConfirm();
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    return (
        <BaseDialog open={open} onOpenChange={onOpenChange} title={title} description={description} maxWidth="sm">
            <DialogFooter>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                    {cancelLabel}
                </Button>
                <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {confirmLabel}...
                        </>
                    ) : (
                        confirmLabel
                    )}
                </Button>
            </DialogFooter>
        </BaseDialog>
    );
}
