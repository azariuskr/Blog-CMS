import { ROLES, ROLE_LABELS, type AppRole } from "@/constants";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
    role: AppRole;
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const variants = {
        [ROLES.SUPER_ADMIN]:
            "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200 " +
            "dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20",

        [ROLES.ADMIN]:
            "bg-indigo-100 text-indigo-800 ring-indigo-200 " +
            "dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",

        [ROLES.MODERATOR]:
            "bg-amber-100 text-amber-900 ring-amber-200 " +
            "dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",

        [ROLES.AUTHOR]:
            "bg-emerald-100 text-emerald-800 ring-emerald-200 " +
            "dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",

        [ROLES.USER]:
            "bg-slate-100 text-slate-800 ring-slate-200 " +
            "dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20",
    };

    const variantClass = variants[role] || variants[ROLES.USER];

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                variantClass,
                className
            )}
        >
            {ROLE_LABELS[role]}
        </span>
    );
}
