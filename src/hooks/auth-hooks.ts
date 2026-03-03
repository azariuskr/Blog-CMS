import authClient from "@/lib/auth/auth-client"
import { AppRole, canAccessRoute, checkPermission, getRoleCapabilities, hasMinimumRole, RoleCapabilities } from "@/lib/auth/permissions";
import { createAuthHooks } from "@daveyplate/better-auth-tanstack"

export const authHooks = createAuthHooks(authClient)

export const {
    useSession,
    usePrefetchSession,
    useToken,
    useListAccounts,
    useListSessions,
    useListDeviceSessions,
    useListPasskeys,
    useUpdateUser,
    useUnlinkAccount,
    useRevokeOtherSessions,
    useRevokeSession,
    useRevokeSessions,
    useSetActiveSession,
    useRevokeDeviceSession,
    useDeletePasskey,
    useAuthQuery,
    useAuthMutation
} = authHooks

export type AuthClient = typeof authClient;

export function useUser() {
    const { data: session } = useSession();
    return session?.user ?? null;
}

export function useRole(): AppRole {
    const user = useUser();
    return (user?.role as AppRole) ?? "user";
}

export function useIsAuthenticated(): boolean {
    return useUser() !== null;
}

export function useHasRole(role: AppRole | AppRole[]): boolean {
    const userRole = useRole();
    const allowed = Array.isArray(role) ? role : [role];
    return allowed.includes(userRole);
}

export function useHasMinRole(minRole: AppRole): boolean {
    return hasMinimumRole(useRole(), minRole);
}

export function useHasPermission(permissions: Record<string, string[]>): boolean {
    const role = useRole();
    if (!role) return false;
    return checkPermission(role, permissions);
}

export function useCanAccessRoute(route: string): boolean {
    const role = useRole();
    return canAccessRoute(route, role);
}

export function useCapabilities(): RoleCapabilities {
    return getRoleCapabilities(useRole());
}

export function useHasCapability(capability: keyof RoleCapabilities): boolean {
    return useCapabilities()[capability];
}
