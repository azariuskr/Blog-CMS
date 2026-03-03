import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
    value?: string;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
}

export function SearchInput({
    value = "",
    onChange,
    placeholder = "Search...",
    debounceMs = 300,
    className,
}: SearchInputProps) {
    const [localValue, setLocalValue] = useState(value);

    const debouncedOnChange = useDebouncedCallback((v: string) => {
        onChange(v || undefined);
    }, debounceMs);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedOnChange(newValue);
    };

    const handleClear = () => {
        setLocalValue("");
        onChange(undefined);
    };

    return (
        <div className={`relative ${className ?? ""}`}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                className="pl-9 pr-9"
            />
            {localValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
