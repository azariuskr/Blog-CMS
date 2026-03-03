import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
    children: React.ReactNode;
    hasActiveFilters: boolean;
    activeFilterCount?: number;
    onReset: () => void;
    className?: string;
}

export function FilterBar({
    children,
    hasActiveFilters,
    activeFilterCount,
    onReset,
    className,
}: FilterBarProps) {
    return (
        <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {activeFilterCount !== undefined && activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                        {activeFilterCount}
                    </Badge>
                )}
            </div>
            {children}
            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
                    <X className="mr-1 h-4 w-4" />
                    Clear filters
                </Button>
            )}
        </div>
    );
}
