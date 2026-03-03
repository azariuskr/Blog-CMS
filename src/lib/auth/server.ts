import { getRequest, getResponse, setResponseHeader } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { type Result, Ok, unauthorized, forbidden } from "@/lib/result";
import { roles, hasMinimumRole, type AppRole, canAccessRoute } from "./permissions";
import { MESSAGES, PAGINATION } from "@/constants";
import { env } from "@/env/server";

export type ServerResult<T> = Result<T>;

// Cookie utilities
export function cookiePrefix() {
    return (env.VITE_BASE_URL || "").startsWith("https://") ? "__Secure-" : "";
}

export function serializeClearCookie(name: string) {
    return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

export function forwardSetCookies(headers: Headers | undefined) {
    const cookies = headers?.getSetCookie?.() ?? [];
    if (!cookies.length) return;

    const res = getResponse?.();
    if (res?.headers?.append) {
        for (const c of cookies) res.headers.append("Set-Cookie", c);
        return;
    }

    setResponseHeader("Set-Cookie", cookies);
}

// Session & Auth functions with proper error handling
export async function getSession() {
    try {
        const headers = getRequest().headers;
        const session = await auth.api.getSession({
            headers,
            query: { disableCookieCache: true },
        });

        return session;
    } catch (error) {
        console.error("[getSession] Error details:", error);
        return null;
    }
}

export async function requireAuth(): Promise<ServerResult<{ user: any; session: any }>> {
    try {
        const session = await getSession();
        if (!session?.user) return unauthorized(MESSAGES.ERROR.UNAUTHORIZED);
        return Ok(session);
    } catch (error) {
        console.error("[requireAuth] Error:", error);
        return unauthorized(MESSAGES.ERROR.UNAUTHORIZED);
    }
}

export async function getCurrentUser() {
    try {
        const result = await requireAuth();
        if (!result.ok) return null;
        return result.data.user;
    } catch (error) {
        console.error("[getCurrentUser] Error:", error);
        return null;
    }
}

export async function requirePermission(
    permissions: Record<string, string[]>
): Promise<ServerResult<{ user: any; session: any }>> {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult;

    const role = authResult.data.user.role as AppRole;
    if (!role) return forbidden("No role assigned");

    const roleImpl = roles[role];
    // @ts-expect-error - Better Auth type limitation
    const result = roleImpl.authorize(permissions);

    if (!result.success) {
        const missing = result.errors?.map((e: any) => `${e.resource}.${e.action}`).join(", ");
        return forbidden(`${MESSAGES.ERROR.FORBIDDEN}: ${missing}`);
    }
    return authResult;
}

export async function requireMinRole(
    minRole: AppRole
): Promise<ServerResult<{ user: any; session: any }>> {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult;

    const role = authResult.data.user.role as AppRole;
    if (!role || !hasMinimumRole(role, minRole)) {
        return forbidden(`Requires ${minRole} or higher`);
    }
    return authResult;
}

export async function checkRouteAccess(
    route: string
): Promise<ServerResult<{ allowed: boolean; required: string[] }>> {
    const authResult = await requireAuth();
    const role = authResult.ok ? (authResult.data.user.role as AppRole) : undefined;

    return Ok({
        allowed: canAccessRoute(route, role),
        required: [],
    });
}

const headers = () => getRequest().headers;

export const adminApi = {
    listUsers: (query?: {
        search?: string;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortDirection?: "asc" | "desc";
    }) => auth.api.listUsers({ query: query ?? {}, headers: headers() }),

    getUser: (userId: string) =>
        auth.api
            .listUsers({ query: { filterField: "id", filterValue: userId, limit: 1 }, headers: headers() })
            .then((res) => res.users[0] ?? null),

    createUser: (data: { email: string; password: string; name: string; role?: AppRole }) =>
        auth.api.createUser({ body: data, headers: headers() }),

    updateUser: (userId: string, data: { name?: string; email?: string }) =>
        auth.api.adminUpdateUser({ body: { userId, data }, headers: headers() }),

    deleteUser: (userId: string) => auth.api.removeUser({ body: { userId }, headers: headers() }),

    setRole: (userId: string, role: AppRole) =>
        auth.api.setRole({ body: { userId, role }, headers: headers() }),

    banUser: (userId: string, reason?: string, expiresIn?: number) =>
        auth.api.banUser({
            body: { userId, banReason: reason, banExpiresIn: expiresIn },
            headers: headers(),
        }),

    unbanUser: (userId: string) => auth.api.unbanUser({ body: { userId }, headers: headers() }),

    setPassword: (userId: string, newPassword: string) =>
        auth.api.setUserPassword({ body: { userId, newPassword }, headers: headers() }),

    listUserSessions: (userId: string) =>
        auth.api.listUserSessions({ body: { userId }, headers: headers() }),

    revokeSession: (token: string) =>
        auth.api.revokeSession({ body: { token }, headers: headers() }),

    revokeSessions: (userId: string) =>
        auth.api.revokeUserSessions({ body: { userId }, headers: headers() }),

    impersonate: (userId: string) =>
        auth.api.impersonateUser({ body: { userId }, headers: headers() }),

    stopImpersonation: () => auth.api.stopImpersonating({ headers: headers() }),
};
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export function normalizePagination(params: PaginationParams) {
    return {
        page: Math.max(1, params.page ?? PAGINATION.DEFAULT_PAGE),
        limit: Math.min(
            PAGINATION.MAX_LIMIT,
            Math.max(1, params.limit ?? PAGINATION.DEFAULT_LIMIT)
        ),
        search: params.search?.trim(),
        sortBy: params.sortBy,
        sortOrder: params.sortOrder ?? "asc",
    };
}

export function paginatedResult<T>(
    items: T[],
    total: number,
    params: ReturnType<typeof normalizePagination>
): PaginatedResult<T> {
    return {
        items,
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
    };
}
