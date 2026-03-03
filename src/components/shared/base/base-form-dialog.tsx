import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BaseDialog } from "./base-dialog";

interface BaseFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    onCancel?: () => void;
    submitLabel?: string;
    cancelLabel?: string;
    isSubmitting?: boolean;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
}

export function BaseFormDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    onCancel,
    submitLabel = "Submit",
    cancelLabel = "Cancel",
    isSubmitting = false,
    maxWidth = "md",
    className,
}: BaseFormDialogProps) {
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            maxWidth={maxWidth}
            className={className}
        >
            <form onSubmit={onSubmit}>
                <div className="grid gap-4 py-4">{children}</div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                        {cancelLabel}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {submitLabel}...
                            </>
                        ) : (
                            submitLabel
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </BaseDialog>
    );
}
