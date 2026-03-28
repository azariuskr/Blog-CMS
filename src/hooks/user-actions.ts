import { QUERY_KEYS } from "@/constants";
import { useAction, fromServerFn } from "@/hooks/use-action";
import {
	$banUser,
	$clearTrustedDevice,
	$createUser,
	$deleteUser,
	$impersonateUser,
	$revokeAllUserSessions,
	$revokeSession,
	$setUserPassword,
	$setUserRole,
	$stopImpersonation,
	$unbanUser,
	$updateUser,
} from "@/lib/auth/functions";

export function useCreateUser() {
	return useAction(fromServerFn($createUser), {
		invalidate: [
			QUERY_KEYS.USERS.LIST,
			QUERY_KEYS.USERS.PAGINATED_BASE,
			QUERY_KEYS.USERS.STATS,
		],
		showToast: true,
	});
}

export function useUpdateUser() {
	return useAction(fromServerFn($updateUser), {
		invalidate: [
			QUERY_KEYS.USERS.LIST,
			QUERY_KEYS.USERS.PAGINATED_BASE,
			QUERY_KEYS.USERS.STATS,
		],
		showToast: true,
	});
}

export function useDeleteUser() {
	return useAction(fromServerFn($deleteUser), {
		invalidate: [
			QUERY_KEYS.USERS.LIST,
			QUERY_KEYS.USERS.PAGINATED_BASE,
			QUERY_KEYS.USERS.STATS,
		],
		showToast: true,
	});
}

export function useSetUserPassword() {
	return useAction(fromServerFn($setUserPassword), {
		showToast: true,
	});
}

// ROLE MANAGEMENT HOOKS
export function useSetUserRole() {
	return useAction(fromServerFn($setUserRole), {
		invalidate: [
			QUERY_KEYS.USERS.LIST,
			QUERY_KEYS.USERS.PAGINATED_BASE,
			QUERY_KEYS.USERS.STATS,
		],
		showToast: true,
	});
}

export function useBanUser() {
	return useAction(
		async (vars: { userId: string; reason?: string; expiresIn?: number }) =>
			$banUser({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
		},
	);
}

export function useUnbanUser() {
	return useAction(
		async (vars: { userId: string }) => $unbanUser({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
		},
	);
}

// SESSION MANAGEMENT HOOKS
export function useRevokeSession() {
	return useAction(
		async (vars: { token: string; userId?: string }) =>
			$revokeSession({ data: { token: vars.token } }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
		},
	);
}

export function useRevokeAllUserSessions() {
	return useAction(
		async (vars: { userId: string }) => $revokeAllUserSessions({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
		},
	);
}

// IMPERSONATION HOOKS
export function useImpersonateUser() {
	return useAction(
		async (vars: { userId: string }) => $impersonateUser({ data: vars }),
		{
			invalidate: [QUERY_KEYS.AUTH.SESSION, QUERY_KEYS.AUTH.USER],
			showToast: true,
		},
	);
}

export function useStopImpersonation() {
	return useAction(async () => $stopImpersonation(), {
		invalidate: [QUERY_KEYS.AUTH.SESSION, QUERY_KEYS.AUTH.USER],
		showToast: true,
	});
}

// DEVICE MANAGEMENT HOOKS
export function useClearTrustedDevice() {
	return useAction(async () => $clearTrustedDevice({ data: {} }), {
		invalidate: [QUERY_KEYS.AUTH.USER],
		showToast: true,
	});
}
