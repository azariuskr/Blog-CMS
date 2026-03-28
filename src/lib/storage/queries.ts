import {
	keepPreviousData,
	queryOptions,
	useQuery,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import { $getUserFilesPaginated, $adminGetFiles, $getMyQuota } from "./server";

export const filesPaginatedQueryOptions = (params: {
	page: number;
	limit: number;
}) =>
	queryOptions({
		queryKey: QUERY_KEYS.FILES.PAGINATED(params),
		queryFn: () => $getUserFilesPaginated({ data: params }),
		staleTime: 1000 * 30,
		gcTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

export function useFilesPaginated(params: { page: number; limit: number }) {
	return useQuery(filesPaginatedQueryOptions(params));
}

export type FilesPaginatedResult = Awaited<
	ReturnType<typeof $getUserFilesPaginated>
>;

// Admin file listing with category filter
export const adminFilesPaginatedQueryOptions = (params: {
	page: number;
	limit: number;
	category?: string;
	search?: string;
}) =>
	queryOptions({
		queryKey: ["admin", "files", params],
		queryFn: () => $adminGetFiles({ data: params }),
		staleTime: 1000 * 30,
		gcTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

export function useAdminFiles(params: {
	page: number;
	limit: number;
	category?: string;
	search?: string;
}) {
	return useQuery(adminFilesPaginatedQueryOptions(params));
}

export const myQuotaQueryOptions = () =>
	queryOptions({
		queryKey: ["storage", "my-quota"],
		queryFn: () => $getMyQuota(),
		staleTime: 1000 * 60,
	});

export function useMyQuota() {
	return useQuery(myQuotaQueryOptions());
}
