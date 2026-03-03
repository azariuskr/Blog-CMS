import {
	keepPreviousData,
	queryOptions,
	useQuery,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import {
	$checkRouteAccess,
	$getDashboardUserStats,
	$getMyRoleInfo,
	$getSession,
	$getUserById,
	$getUserFacets,
	$listUserSessions,
	$listUsers,
	$listUsersPaginated,
} from "./functions";

// QUERY OPTIONS
export const authQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.AUTH.SESSION,
		queryFn: () => $getSession(),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
		retry: false,
		refetchOnWindowFocus: false,
		// refetchOnWindowFocus: true,
	});

export const roleInfoQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.AUTH.ROLE_INFO,
		queryFn: () => $getMyRoleInfo(),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

export const usersListQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.USERS.LIST,
		queryFn: () => $listUsers(),
		staleTime: 1000 * 60 * 2,
		gcTime: 1000 * 60 * 5,
	});

export const usersPaginatedQueryOptions = (params: {
	page: number;
	limit: number;
	search?: string;
	role?: string[];
	status?: Array<"active" | "banned" | "pending">;
	sortBy?: "name" | "email" | "createdAt" | "updatedAt" | "role";
	sortOrder?: "asc" | "desc";
}) =>
	queryOptions({
		queryKey: QUERY_KEYS.USERS.PAGINATED(params),
		queryFn: () => $listUsersPaginated({ data: params }),
		staleTime: 1000 * 30,
		gcTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

export const dashboardUserStatsQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.USERS.STATS,
		queryFn: () => $getDashboardUserStats(),
		staleTime: 1000 * 30,
		gcTime: 1000 * 60 * 5,
	});

export const userFacetsQueryOptions = (params: {
	search?: string;
	role?: string[];
	status?: Array<"active" | "banned" | "pending">;
}) =>
	queryOptions({
		queryKey: [...QUERY_KEYS.USERS.FACETS, params],
		queryFn: () => $getUserFacets({ data: params }),
		staleTime: 1000 * 30,
		gcTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

export const userDetailQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.USERS.DETAIL(userId),
		queryFn: () => $getUserById({ data: { userId } }),
		staleTime: 1000 * 60 * 2,
		gcTime: 1000 * 60 * 5,
		enabled: !!userId,
	});

export const userSessionsQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.USERS.SESSIONS(userId),
		queryFn: () => $listUserSessions({ data: { userId } }),
		staleTime: 1000 * 60 * 1,
		gcTime: 1000 * 60 * 5,
		enabled: !!userId,
	});

export const routeAccessQueryOptions = (route: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.ROUTE_ACCESS(route),
		queryFn: () => $checkRouteAccess({ data: { route } }),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
		enabled: !!route,
	});

// QUERY HOOKS

export function useUsersList() {
	return useQuery(usersListQueryOptions());
}

export function useUsersPaginated(params: {
	page: number;
	limit: number;
	search?: string;
	role?: string[];
	status?: Array<"active" | "banned" | "pending">;
	sortBy?: "name" | "email" | "createdAt" | "updatedAt" | "role";
	sortOrder?: "asc" | "desc";
}) {
	return useQuery(usersPaginatedQueryOptions(params));
}

export function useDashboardUserStats() {
	return useQuery(dashboardUserStatsQueryOptions());
}

export function useUserFacets(params: {
	search?: string;
	role?: string[];
	status?: Array<"active" | "banned" | "pending">;
}) {
	return useQuery(userFacetsQueryOptions(params));
}

export function useUserDetail(userId: string) {
	return useQuery(userDetailQueryOptions(userId));
}

export function useUserSessions(userId: string) {
	return useQuery(userSessionsQueryOptions(userId));
}

export function useRouteAccess(route: string) {
	return useQuery(routeAccessQueryOptions(route));
}

export function useRoleInfo() {
	return useQuery(roleInfoQueryOptions());
}

// TYPES
export type AuthQueryResult = Awaited<ReturnType<typeof $getSession>>;
export type UsersListResult = Awaited<ReturnType<typeof $listUsers>>;
export type UsersPaginatedResult = Awaited<
	ReturnType<typeof $listUsersPaginated>
>;
export type DashboardUserStatsResult = Awaited<
	ReturnType<typeof $getDashboardUserStats>
>;
export type UserFacetsResult = Awaited<ReturnType<typeof $getUserFacets>>;
export type UserDetailResult = Awaited<ReturnType<typeof $getUserById>>;
export type UserSessionsResult = Awaited<ReturnType<typeof $listUserSessions>>;
export type RouteAccessResult = Awaited<ReturnType<typeof $checkRouteAccess>>;
export type RoleInfoResult = Awaited<ReturnType<typeof $getMyRoleInfo>>;
