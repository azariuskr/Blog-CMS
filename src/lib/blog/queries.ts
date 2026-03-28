import { queryOptions, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useAction, fromServerFn } from "@/hooks/use-action";
import { QUERY_KEYS } from "@/constants";
import { getBlogDataMode } from "./data-mode";
import {
	BLOG_SEED_AUTHORS,
	BLOG_SEED_FALLBACK_POST_BY_SLUG,
	BLOG_SEED_POSTS,
} from "./seed-data";
import {
	$listPublishedPosts,
	$getPostBySlug,
	$getPostById,
	$listAdminPosts,
	$listCategories,
	$listPublicCategories,
	$listTags,
	$listComments,
	$getAuthorByUsername,
	$listAuthors,
	$upsertPost,
	$upsertCategory,
	$deletePost,
	$deleteCategory,
	$createTag,
	$deleteTag,
	$approveComment,
	$spamComment,
	$deleteComment,
	$toggleReaction,
	$toggleBookmark,
	$toggleFollow,
	$getFollowStatus,
	$listPublicComments,
	$createComment,
	$upsertAuthorProfile,
	$subscribeNewsletter,
	$getBlogStats,
	$createPostVersion,
	$listPostVersions,
	$getPostVersion,
	$listNewsletterSubscribers,
	$transitionPostStatus,
	$applyForAuthor,
	$reviewAuthorApplication,
	$listAuthorApplications,
	$getMyAuthorApplication,
	$generatePreviewToken,
	$getPostByPreviewToken,
	$getNotifications,
	$markNotificationRead,
	$markAllNotificationsRead,
	$getMyReadingLists,
	$createReadingList,
	$getReadingListPosts,
	$addToReadingList,
	$toggleMute,
	$getMutedUsers,
	$getUserInterests,
	$setUserInterests,
	$getPublicReadingListsByUser,
	$getUserPostReaction,
	$getPostBookmarkStatus,
	$removeFromReadingList,
	$deleteReadingList,
} from "./functions";

// =============================================================================
// Data mode helpers
// =============================================================================

const ok = <T>(data: T) => ({ ok: true as const, data });

function getMockPublishedPosts(params: {
	page?: number;
	limit?: number;
	search?: string;
	authorId?: string;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 20;
	const filtered = BLOG_SEED_POSTS.filter((post) => {
		if (params.authorId && post.authorId !== params.authorId) return false;
		if (params.search && !post.title.toLowerCase().includes(params.search.toLowerCase())) return false;
		return true;
	});
	const offset = (page - 1) * limit;
	const items = filtered.slice(offset, offset + limit).map((post) => ({
		...post,
		author: BLOG_SEED_AUTHORS.find((author) => author.id === post.authorId),
		category: null,
	}));
	return ok({
		items,
		total: filtered.length,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
	}) as unknown as Awaited<ReturnType<typeof $listPublishedPosts>>;
}

async function withModeFallback<T>(
	liveFetcher: () => Promise<T>,
	mockFetcher: () => T,
): Promise<T> {
	const mode = getBlogDataMode();

	if (mode === "mock") {
		return mockFetcher();
	}

	if (mode === "live") {
		return liveFetcher();
	}

	try {
		return await liveFetcher();
	} catch {
		return mockFetcher();
	}
}

// =============================================================================
// Query options factories
// =============================================================================

export const publishedPostsQueryOptions = (
	params: {
		page?: number;
		limit?: number;
		search?: string;
		categorySlug?: string;
		tagSlug?: string;
		authorId?: string;
		isFeatured?: boolean;
		sortBy?: "publishedAt" | "updatedAt" | "title" | "viewCount";
	} = {},
) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.PAGINATED(params),
		queryFn: () =>
			withModeFallback(
				() =>
					$listPublishedPosts({
						data: {
							page: params.page ?? 1,
							limit: params.limit ?? 20,
							search: params.search,
							categorySlug: params.categorySlug,
							tagSlug: params.tagSlug,
							authorId: params.authorId,
							isFeatured: params.isFeatured,
							sortBy: params.sortBy,
						},
					}),
				() => getMockPublishedPosts(params),
			),
		staleTime: 1000 * 60 * 5,
	});

export const postBySlugQueryOptions = (slug: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.DETAIL(slug),
		queryFn: () =>
			withModeFallback(
				() => $getPostBySlug({ data: { slug } }),
				() => {
					const mock = BLOG_SEED_FALLBACK_POST_BY_SLUG[slug];
					if (!mock) {
						throw new Error("Post not found");
					}
					return ok({
						...mock,
						author: BLOG_SEED_AUTHORS.find((author) => author.id === mock.authorId),
						category: null,
						createdAt: mock.publishedAt,
					}) as unknown as Awaited<ReturnType<typeof $getPostBySlug>>;
				},
			),
		staleTime: 1000 * 60 * 10,
	});

export const adminPostsQueryOptions = (
	params: {
		page?: number;
		limit?: number;
		search?: string;
		status?: "draft" | "review" | "scheduled" | "published" | "archived";
	} = {},
) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.ADMIN_LIST_PARAMS(params as Record<string, unknown>),
		queryFn: () =>
			$listAdminPosts({
				data: {
					page: params.page ?? 1,
					limit: params.limit ?? 20,
					search: params.search,
					status: params.status,
				},
			}),
	});

export const postByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.ADMIN_DETAIL(id),
		queryFn: () => $getPostById({ data: { id } }),
		enabled: !!id,
		staleTime: 1000 * 60 * 5,
	});

export const categoriesQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.CATEGORIES.LIST,
		queryFn: () => $listCategories({ data: { includeCount: true } }),
		staleTime: 1000 * 60 * 30,
	});

// Public (no auth required) — for topics page, homepage hot-topics slider
export const publicCategoriesQueryOptions = () =>
	queryOptions({
		queryKey: [...QUERY_KEYS.BLOG.CATEGORIES.LIST, "public"],
		queryFn: () => $listPublicCategories({ data: {} }),
		staleTime: 1000 * 60 * 30,
	});

export const tagsQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.TAGS.LIST,
		queryFn: () => $listTags({ data: {} }),
		staleTime: 1000 * 60 * 30,
	});

export const commentsQueryOptions = (
	params: {
		postId?: string;
		status?: "pending" | "approved" | "spam";
		page?: number;
	} = {},
) =>
	queryOptions({
		queryKey: params.postId
			? QUERY_KEYS.BLOG.COMMENTS.BY_POST(params.postId)
			: ["blog", "comments", "admin", params],
		queryFn: () => $listComments({ data: { ...params, limit: 50 } }),
	});

export const authorProfileQueryOptions = (username: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.AUTHORS.PROFILE(username),
		queryFn: () =>
			withModeFallback(
				() => $getAuthorByUsername({ data: { username } }),
				() => {
					const author = BLOG_SEED_AUTHORS.find((item) => item.username === username);
					if (!author) throw new Error("Author not found");
					return ok(author) as unknown as Awaited<ReturnType<typeof $getAuthorByUsername>>;
				},
			),
		staleTime: 1000 * 60 * 10,
	});

export const authorsQueryOptions = (page = 1) =>
	queryOptions({
		queryKey: [...QUERY_KEYS.BLOG.AUTHORS.LIST, page],
		queryFn: () =>
			withModeFallback(
				() => $listAuthors({ data: { page, limit: 20 } }),
				() =>
					ok({
						items: BLOG_SEED_AUTHORS,
						total: BLOG_SEED_AUTHORS.length,
						page,
						limit: 20,
						totalPages: 1,
					}) as unknown as Awaited<ReturnType<typeof $listAuthors>>,
			),
		staleTime: 1000 * 60 * 5,
	});

// =============================================================================
// Hooks
// =============================================================================

export function usePublishedPosts(params: Parameters<typeof publishedPostsQueryOptions>[0] = {}) {
	return useQuery(publishedPostsQueryOptions(params));
}

interface InfinitePostsParams {
	limit?: number;
	search?: string;
	categorySlug?: string;
	tagSlug?: string;
	authorId?: string;
	isFeatured?: boolean;
	sortBy?: "publishedAt" | "updatedAt" | "title" | "viewCount";
	followedByUserId?: string;
	excludeMutedFor?: string;
}

export function useInfinitePublishedPosts(params: InfinitePostsParams = {}) {
	return useInfiniteQuery({
		queryKey: [...QUERY_KEYS.BLOG.POSTS.PAGINATED({ ...params, _infinite: true })],
		queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
			$listPublishedPosts({
				data: {
					cursor: pageParam,
					limit: params.limit ?? 6,
					search: params.search,
					categorySlug: params.categorySlug,
					tagSlug: params.tagSlug,
					authorId: params.authorId,
					isFeatured: params.isFeatured,
					sortBy: params.sortBy,
					followedByUserId: params.followedByUserId,
					excludeMutedFor: params.excludeMutedFor,
				},
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage: any) => {
			if (!lastPage?.ok) return undefined;
			return lastPage.data?.nextCursor ?? undefined;
		},
		staleTime: 1000 * 60 * 5,
	});
}

export function usePostBySlug(slug: string) {
	return useQuery(postBySlugQueryOptions(slug));
}

export function useAdminPosts(params: Parameters<typeof adminPostsQueryOptions>[0] = {}) {
	return useQuery(adminPostsQueryOptions(params));
}

export function usePostById(id: string) {
	return useQuery(postByIdQueryOptions(id));
}

export function useCategories() {
	return useQuery(categoriesQueryOptions());
}

export function usePublicCategories() {
	return useQuery(publicCategoriesQueryOptions());
}

export function useTags() {
	return useQuery(tagsQueryOptions());
}

export function useComments(params: Parameters<typeof commentsQueryOptions>[0] = {}) {
	return useQuery(commentsQueryOptions(params));
}

export const publicCommentsQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["blog", "comments", "public", postId],
		queryFn: () => $listPublicComments({ data: { postId } }),
		staleTime: 1000 * 30,
		enabled: !!postId,
	});

export function usePublicComments(postId: string) {
	return useQuery(publicCommentsQueryOptions(postId));
}

export function useAuthorProfile(username: string) {
	return useQuery(authorProfileQueryOptions(username));
}

export function useAuthors(page = 1) {
	return useQuery(authorsQueryOptions(page));
}

// =============================================================================
// Mutations
// =============================================================================

export function useUpsertPost() {
	return useAction(fromServerFn($upsertPost), {
		invalidate: [
			QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE,
			QUERY_KEYS.BLOG.POSTS.ADMIN_LIST,
			["blog", "posts", "detail"],
			["blog", "admin", "post"],
		],
		showToast: false,
	});
}

export function useDeletePost() {
	return useAction(fromServerFn($deletePost), {
		invalidate: [
			QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE,
			QUERY_KEYS.BLOG.POSTS.ADMIN_LIST,
		],
		showToast: false,
	});
}

export function useGeneratePreviewToken() {
	return useAction(fromServerFn($generatePreviewToken), { showToast: false });
}

export function usePostByPreviewToken(token: string | undefined) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.POSTS.PREVIEW(token ?? ""),
		queryFn: () => $getPostByPreviewToken({ data: { token: token! } }),
		enabled: !!token,
		staleTime: 1000 * 60,
	});
}

export function useTransitionPostStatus() {
	return useAction(fromServerFn($transitionPostStatus), {
		invalidate: [
			QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE,
			QUERY_KEYS.BLOG.POSTS.ADMIN_LIST,
		],
		showToast: false,
	});
}

export function useUpsertCategory() {
	return useAction(fromServerFn($upsertCategory), {
		invalidate: [QUERY_KEYS.BLOG.CATEGORIES.LIST],
		showToast: false,
	});
}

export function useDeleteCategory() {
	return useAction(fromServerFn($deleteCategory), {
		invalidate: [QUERY_KEYS.BLOG.CATEGORIES.LIST],
		showToast: false,
	});
}

export function useCreateTag() {
	return useAction(fromServerFn($createTag), {
		invalidate: [QUERY_KEYS.BLOG.TAGS.LIST],
		showToast: false,
	});
}

export function useDeleteTag() {
	return useAction(fromServerFn($deleteTag), {
		invalidate: [QUERY_KEYS.BLOG.TAGS.LIST],
		showToast: false,
	});
}

export function useApproveComment() {
	return useAction(fromServerFn($approveComment), {
		invalidate: [QUERY_KEYS.BLOG.COMMENTS.BASE],
		showToast: false,
	});
}

export function useSpamComment() {
	return useAction(fromServerFn($spamComment), {
		invalidate: [QUERY_KEYS.BLOG.COMMENTS.BASE],
		showToast: false,
	});
}

export function useDeleteComment() {
	return useAction(fromServerFn($deleteComment), {
		invalidate: [QUERY_KEYS.BLOG.COMMENTS.BASE],
		showToast: false,
	});
}

export function useCreateComment() {
	return useAction(fromServerFn($createComment), {
		invalidate: [QUERY_KEYS.BLOG.COMMENTS.BASE],
		showToast: false,
	});
}

export function useToggleReaction() {
	return useAction(fromServerFn($toggleReaction), {
		invalidate: [
			QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE,
			QUERY_KEYS.BLOG.POSTS.REACTION_BASE,
		],
		showToast: false,
	});
}

export function useToggleBookmark() {
	return useAction(fromServerFn($toggleBookmark), {
		invalidate: [QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE],
		showToast: false,
	});
}

export function useFollowStatus(followerId: string, followingId: string) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.FOLLOW_STATUS(followerId, followingId),
		queryFn: () => $getFollowStatus({ data: { followerId, followingId } }),
		enabled: !!followerId && !!followingId,
		staleTime: 1000 * 60 * 5,
	});
}

export function useToggleFollow() {
	return useAction(fromServerFn($toggleFollow), {
		invalidate: [
			QUERY_KEYS.BLOG.FOLLOW_STATUS_BASE,
			QUERY_KEYS.BLOG.AUTHORS.LIST,
		],
		showToast: false,
	});
}

export function useUpsertAuthorProfile() {
	return useAction(fromServerFn($upsertAuthorProfile), {
		invalidate: [QUERY_KEYS.BLOG.AUTHORS.LIST],
		showToast: false,
	});
}

export function useSubscribeNewsletter() {
	return useAction(fromServerFn($subscribeNewsletter), { showToast: false });
}

export const blogStatsQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.ADMIN_STATS,
		queryFn: () => $getBlogStats(),
		staleTime: 1000 * 60 * 5,
	});

export function useBlogStats() {
	return useQuery(blogStatsQueryOptions());
}

export const postVersionsQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: QUERY_KEYS.BLOG.POSTS.VERSIONS(postId),
		queryFn: () => $listPostVersions({ data: { id: postId } }),
		enabled: !!postId,
		staleTime: 1000 * 60 * 2,
	});

export function usePostVersions(postId: string) {
	return useQuery(postVersionsQueryOptions(postId));
}

export function useCreatePostVersion() {
	return useAction(fromServerFn($createPostVersion), {
		invalidate: [QUERY_KEYS.BLOG.POSTS.VERSIONS_BASE],
		showToast: false,
	});
}

export function useGetPostVersion() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return useAction(fromServerFn($getPostVersion as any), { showToast: false });
}

export function useNewsletterSubscribers(params: { page?: number; confirmed?: boolean } = {}) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.NEWSLETTER.SUBSCRIBERS(params as Record<string, unknown>),
		queryFn: () => $listNewsletterSubscribers({ data: { page: params.page ?? 1, confirmed: params.confirmed } }),
		staleTime: 1000 * 60 * 2,
	});
}

export function useApplyForAuthor() {
	return useAction(fromServerFn($applyForAuthor), {
		invalidate: [QUERY_KEYS.BLOG.AUTHOR_APPLICATIONS.MINE],
		showToast: false,
	});
}

export function useReviewAuthorApplication() {
	return useAction(fromServerFn($reviewAuthorApplication), {
		invalidate: [
			QUERY_KEYS.BLOG.AUTHOR_APPLICATIONS.LIST_BASE,
			QUERY_KEYS.BLOG.AUTHORS.LIST,
		],
		showToast: false,
	});
}

export function useAuthorApplications(status: "pending" | "approved" | "rejected" = "pending") {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.AUTHOR_APPLICATIONS.LIST(status),
		queryFn: () => $listAuthorApplications({ data: { status, page: 1, limit: 50 } }),
		staleTime: 1000 * 30,
	});
}

export function useMyAuthorApplication() {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.AUTHOR_APPLICATIONS.MINE,
		queryFn: () => $getMyAuthorApplication({ data: {} }),
		staleTime: 1000 * 60 * 5,
	});
}

// =============================================================================
// Sites + Pages (Puck)
// =============================================================================

import {
	$listSites,
	$upsertSite,
	$deleteSite,
	$listPages,
	$upsertPage,
	$deletePage,
} from "@/lib/blog/functions";

export function useSites() {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.SITES.BASE,
		queryFn: () => $listSites(),
		staleTime: 1000 * 60 * 2,
	});
}

export function useUpsertSite() {
	return useAction(fromServerFn($upsertSite), {
		invalidate: [QUERY_KEYS.BLOG.SITES.BASE],
		showToast: false,
	});
}

export function useDeleteSite() {
	return useAction(fromServerFn($deleteSite), {
		invalidate: [QUERY_KEYS.BLOG.SITES.BASE],
		showToast: false,
	});
}

export function usePages(siteId: string | null) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.PAGES.BY_SITE(siteId),
		queryFn: () => $listPages({ data: { siteId: siteId! } }),
		enabled: !!siteId,
		staleTime: 1000 * 60,
	});
}

export function useUpsertPage() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return useAction(fromServerFn($upsertPage as any), {
		invalidate: [QUERY_KEYS.BLOG.PAGES.BASE],
		showToast: false,
	});
}

export function useDeletePage() {
	return useAction(
		(vars: { id: string; siteId: string }) => $deletePage({ data: { id: vars.id } }),
		{
			invalidate: [QUERY_KEYS.BLOG.PAGES.BASE],
			showToast: false,
		},
	);
}

// =============================================================================
// Notifications
// =============================================================================

export function useNotifications(limit = 20) {
	return useQuery({
		queryKey: QUERY_KEYS.NOTIFICATIONS.LIST(limit),
		queryFn: () => $getNotifications({ data: { limit } }),
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
	});
}

export function useMarkNotificationRead() {
	return useAction(fromServerFn($markNotificationRead), {
		invalidate: [QUERY_KEYS.NOTIFICATIONS.BASE],
		showToast: false,
	});
}

export function useMarkAllNotificationsRead() {
	return useAction(fromServerFn($markAllNotificationsRead), {
		invalidate: [QUERY_KEYS.NOTIFICATIONS.BASE],
		showToast: false,
	});
}

// =============================================================================
// Reading Lists
// =============================================================================

export function useMyReadingLists() {
	return useQuery({
		queryKey: QUERY_KEYS.READING_LISTS.BASE,
		queryFn: () => $getMyReadingLists({ data: {} }),
	});
}

export function useCreateReadingList() {
	return useAction(fromServerFn($createReadingList), {
		invalidate: [QUERY_KEYS.READING_LISTS.BASE],
		showToast: false,
	});
}

export function useReadingListPosts(listId: string | undefined) {
	return useQuery({
		queryKey: QUERY_KEYS.READING_LISTS.POSTS(listId),
		queryFn: () => $getReadingListPosts({ data: { listId: listId! } }),
		enabled: !!listId,
	});
}

export function useAddToReadingList() {
	return useAction(fromServerFn($addToReadingList), {
		invalidate: [
			QUERY_KEYS.READING_LISTS.BASE,
			QUERY_KEYS.BLOG.BOOKMARKS,
			QUERY_KEYS.BLOG.POSTS.BOOKMARK_STATUS_BASE,
		],
		showToast: false,
	});
}

// =============================================================================
// Mute / Ignore
// =============================================================================

export function useMutedUsers() {
	return useQuery({
		queryKey: QUERY_KEYS.MUTED_USERS,
		queryFn: () => $getMutedUsers({ data: {} }),
	});
}

export function useToggleMute() {
	return useAction(fromServerFn($toggleMute), {
		invalidate: [
			QUERY_KEYS.MUTED_USERS,
			QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE,
		],
		showToast: false,
	});
}

export function useUserInterests() {
	return useQuery({
		queryKey: QUERY_KEYS.USER_INTERESTS,
		queryFn: () => $getUserInterests({ data: {} }),
	});
}

export function useSetUserInterests() {
	return useAction(fromServerFn($setUserInterests), {
		invalidate: [QUERY_KEYS.USER_INTERESTS],
		showToast: false,
	});
}

export function usePublicReadingListsByUser(userId?: string) {
	return useQuery({
		queryKey: QUERY_KEYS.READING_LISTS.PUBLIC_BY_USER(userId),
		queryFn: () => $getPublicReadingListsByUser({ data: { userId: userId! } }),
		enabled: !!userId,
	});
}

export function useUserPostReaction(postId?: string) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.POSTS.REACTION(postId ?? ""),
		queryFn: () => $getUserPostReaction({ data: { postId: postId! } }),
		enabled: !!postId,
	});
}

export function usePostBookmarkStatus(postId?: string) {
	return useQuery({
		queryKey: QUERY_KEYS.BLOG.POSTS.BOOKMARK_STATUS(postId ?? ""),
		queryFn: () => $getPostBookmarkStatus({ data: { postId: postId! } }),
		enabled: !!postId,
	});
}

export function useRemoveFromReadingList() {
	return useAction(fromServerFn($removeFromReadingList), {
		invalidate: [
			QUERY_KEYS.BLOG.POSTS.BOOKMARK_STATUS_BASE,
			QUERY_KEYS.READING_LISTS.BASE,
		],
		showToast: false,
	});
}

export function useDeleteReadingList() {
	return useAction(fromServerFn($deleteReadingList), {
		invalidate: [QUERY_KEYS.READING_LISTS.BASE],
		showToast: false,
	});
}
