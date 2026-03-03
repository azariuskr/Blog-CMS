import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: "active" | "banned" | "pending" | "inactive" | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variants = {
        active: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
        banned: "bg-red-500/10 text-red-400 ring-red-500/20",
        pending: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
        inactive: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
    };

    const variantClass = variants[status as keyof typeof variants] || variants.inactive;

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                variantClass,
                className
            )}
        >
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
