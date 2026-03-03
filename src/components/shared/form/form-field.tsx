import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useId } from "react";

interface FormFieldProps extends Omit<React.ComponentProps<typeof Input>, "id"> {
    label: string;
    error?: string;
    helperText?: string;
    required?: boolean;
}

export function FormField({ label, error, helperText, required, className, ...props }: FormFieldProps) {
    const generatedId = useId();
    const id = props.name ? `field-${props.name}` : generatedId;
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
                id={id}
                aria-invalid={!!error}
                aria-describedby={errorId || helperId}
                className={error ? "border-destructive focus-visible:ring-destructive" : className}
                {...props}
            />
            {error && (
                <p id={errorId} className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p id={helperId} className="text-sm text-muted-foreground">
                    {helperText}
                </p>
            )}
        </div>
    );
}
