import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import {
    useHasRole,
    useHasMinRole,
    useHasPermission,
    useCanAccessRoute,
    useRole,
    useHasCapability,
    useIsAuthenticated
} from "@/hooks/auth-hooks";
import {
    hasMinimumRole,
    type AppRole,
    type RoleCapabilities
} from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/constants";

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function SignedIn({ children, fallback = null }: AuthGuardProps) {
    const isAuthenticated = useIsAuthenticated();
    return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

export function SignedOut({ children, fallback = null }: AuthGuardProps) {
    const isAuthenticated = useIsAuthenticated();
    return !isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

export function AuthSwitch({
    signedIn,
    signedOut,
}: {
    signedIn: ReactNode;
    signedOut: ReactNode;
}) {
    const isAuthenticated = useIsAuthenticated();
    return <>{isAuthenticated ? signedIn : signedOut}</>;
}

interface ProtectedProps {
    children: React.ReactNode;
    role?: AppRole | AppRole[];
    minRole?: AppRole;
    capability?: keyof RoleCapabilities;
    permissions?: Record<string, string[]>;
    fallback?: React.ReactNode;
}

export function Protected({
    children,
    role,
    minRole,
    capability,
    permissions,
    fallback = null,
}: ProtectedProps) {
    const hasRole = useHasRole(role ?? []);
    const hasMinRoleCheck = useHasMinRole(minRole ?? "user");
    const hasCapabilityCheck = useHasCapability(capability ?? "canAccessAdmin");
    const hasPermissionCheck = useHasPermission(permissions ?? {});

    if (role !== undefined && !hasRole) return <>{fallback}</>;
    if (minRole !== undefined && !hasMinRoleCheck) return <>{fallback}</>;
    if (capability !== undefined && !hasCapabilityCheck) return <>{fallback}</>;
    if (permissions !== undefined && !hasPermissionCheck) return <>{fallback}</>;

    return <>{children}</>;
}

interface RouteGuardProps {
    children: React.ReactNode;
    route: string;
    fallback?: React.ReactNode;
}

export function RouteGuard({ children, route, fallback }: RouteGuardProps) {
    const router = useRouter();
    const canAccess = useCanAccessRoute(route);

    if (!canAccess) {
        if (fallback) return <>{fallback}</>;

        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
                    <div className="mb-4 text-6xl">🔒</div>
                    <h1 className="mb-2 text-3xl font-bold text-gray-900">Access Denied</h1>
                    <p className="mb-6 text-gray-600">You don't have permission to access this page.</p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => router.history.back()}
                            className="rounded-lg bg-gray-600 px-6 py-2 text-white transition hover:bg-gray-700"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => router.navigate({ to: "/" })}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
                        >
                            Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

interface RoleSwitchProps {
    cases: Partial<Record<AppRole, React.ReactNode>>;
    default?: React.ReactNode;
    fallthrough?: boolean;
}

export function RoleSwitch({ cases, default: fallback = null, fallthrough = false }: RoleSwitchProps) {
    const role = useRole();

    if (cases[role]) {
        return <>{cases[role]}</>;
    }

    if (fallthrough) {
        const roleOrder: AppRole[] = ["superAdmin", "admin", "moderator", "user"];
        for (const r of roleOrder) {
            if (hasMinimumRole(role, r) && cases[r]) {
                return <>{cases[r]}</>;
            }
        }
    }

    return <>{fallback}</>;
}

interface PermissionGateProps {
    children: React.ReactNode;
    permissions: Record<string, string[]>;
    fallback?: React.ReactNode;
}

export function PermissionGate({ children, permissions, fallback = null }: PermissionGateProps) {
    const hasPermissions = useHasPermission(permissions);
    if (!hasPermissions) return <>{fallback}</>;
    return <>{children}</>;
}

const ROLE_STYLES: Record<AppRole, string> = {
    superAdmin: "bg-purple-100 text-purple-800 border-purple-200",
    admin: "bg-red-100 text-red-800 border-red-200",
    moderator: "bg-blue-100 text-blue-800 border-blue-200",
    author: "bg-emerald-100 text-emerald-800 border-emerald-200",
    user: "bg-gray-100 text-gray-800 border-gray-200",
};

interface RoleBadgeProps {
    role?: AppRole;
    className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
    const userRole = useRole();
    const displayRole = role ?? userRole;

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[displayRole]} ${className}`}
        >
            {ROLE_LABELS[displayRole]}
        </span>
    );
}

interface PermissionIndicatorProps {
    permissions: Record<string, string[]>;
    grantedContent?: React.ReactNode;
    deniedContent?: React.ReactNode;
}

export function PermissionIndicator({
    permissions,
    grantedContent = <span className="text-green-600">✓</span>,
    deniedContent = <span className="text-red-600">✗</span>,
}: PermissionIndicatorProps) {
    const hasPermissions = useHasPermission(permissions);
    return hasPermissions ? <>{grantedContent}</> : <>{deniedContent}</>;
}
