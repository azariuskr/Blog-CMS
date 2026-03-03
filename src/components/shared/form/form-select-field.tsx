import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useId } from "react";

interface FormSelectFieldProps<T extends string> {
    label: string;
    value: T;
    onValueChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
    placeholder?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
}

export function FormSelectField<T extends string>({
    label,
    value,
    onValueChange,
    options,
    placeholder,
    error,
    helperText,
    required,
    disabled,
    className,
    triggerClassName,
}: FormSelectFieldProps<T>) {
    const generatedId = useId();
    const id = generatedId;
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;

    return (
        <div className={`grid gap-2 ${className ?? ""}`}>
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => onValueChange(val as T)} disabled={disabled}>
                <SelectTrigger
                    id={id}
                    className={triggerClassName}
                    aria-invalid={!!error}
                    aria-describedby={errorId || helperId}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
