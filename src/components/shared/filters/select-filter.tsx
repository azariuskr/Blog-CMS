import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SelectFilterProps<T extends string> {
    value?: T;
    onChange: (value: T | undefined) => void;
    options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
    placeholder?: string;
    allowClear?: boolean;
    className?: string;
}

export function SelectFilter<T extends string>({
    value,
    onChange,
    options,
    placeholder = "All",
    allowClear = true,
    className,
}: SelectFilterProps<T>) {
    return (
        <Select
            value={value ?? ""}
            onValueChange={(v) => onChange(v === "" ? undefined : (v as T))}
        >
            <SelectTrigger className={className ?? "w-45"}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allowClear && <SelectItem value="">All</SelectItem>}
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                            {opt.icon}
                            <span>{opt.label}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
