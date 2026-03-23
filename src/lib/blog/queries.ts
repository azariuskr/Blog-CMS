import { queryOptions, useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
		queryKey: ["blog", "admin", "posts", params],
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
		queryKey: ["blog", "admin", "post", id],
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
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			id?: string;
			title: string;
			slug: string;
			authorId: string;
			excerpt?: string;
			content?: string;
			blocks?: { id: string; type: string; content: string; meta?: Record<string, unknown> }[];
			status?: "draft" | "review" | "scheduled" | "published" | "archived";
			categoryId?: string;
			featuredImageUrl?: string;
			metaTitle?: string;
			metaDescription?: string;
			tagIds?: string[];
			publishedAt?: string;
		}) => $upsertPost({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE });
			qc.invalidateQueries({ queryKey: ["blog", "admin", "posts"] });
		},
	});
}

export function useDeletePost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $deletePost({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE });
			qc.invalidateQueries({ queryKey: ["blog", "admin", "posts"] });
		},
	});
}

export function useGeneratePreviewToken() {
	return useMutation({
		mutationFn: (id: string) => $generatePreviewToken({ data: { id } }),
	});
}

export function usePostByPreviewToken(token: string | undefined) {
	return useQuery({
		queryKey: ["blog", "preview", token],
		queryFn: () => $getPostByPreviewToken({ data: { token: token! } }),
		enabled: !!token,
		staleTime: 1000 * 60,
	});
}

export function useTransitionPostStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { id: string; to: "draft" | "review" | "published" | "archived" }) =>
			$transitionPostStatus({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE });
			qc.invalidateQueries({ queryKey: ["blog", "admin", "posts"] });
		},
	});
}

export function useUpsertCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			id?: string;
			name: string;
			slug: string;
			description?: string;
			color?: string;
		}) => $upsertCategory({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.CATEGORIES.LIST });
		},
	});
}

export function useDeleteCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $deleteCategory({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.CATEGORIES.LIST });
		},
	});
}

export function useCreateTag() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; slug: string }) => $createTag({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.TAGS.LIST });
		},
	});
}

export function useDeleteTag() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $deleteTag({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.TAGS.LIST });
		},
	});
}

export function useApproveComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $approveComment({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "comments"] });
		},
	});
}

export function useSpamComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $spamComment({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "comments"] });
		},
	});
}

export function useDeleteComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $deleteComment({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "comments"] });
		},
	});
}

export function useCreateComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { postId: string; authorId: string; content: string; parentId?: string }) =>
			$createComment({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "comments"] });
		},
	});
}

export function useToggleReaction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			postId: string;
			userId: string;
			type: "like" | "love" | "celebrate" | "insightful" | "curious";
		}) => $toggleReaction({ data }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.DETAIL(vars.postId) });
		},
	});
}

export function useToggleBookmark() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { postId: string; userId: string }) => $toggleBookmark({ data }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.DETAIL(vars.postId) });
		},
	});
}

export function useFollowStatus(followerId: string, followingId: string) {
	return useQuery({
		queryKey: ["blog", "follow-status", followerId, followingId],
		queryFn: () => $getFollowStatus({ data: { followerId, followingId } }),
		enabled: !!followerId && !!followingId,
		staleTime: 1000 * 60 * 5,
	});
}

export function useToggleFollow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { followerId: string; followingId: string }) => $toggleFollow({ data }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({
				queryKey: ["blog", "follow-status", vars.followerId, vars.followingId],
			});
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.AUTHORS.LIST });
		},
	});
}

export function useUpsertAuthorProfile() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) =>
			$upsertAuthorProfile({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.AUTHORS.LIST });
		},
	});
}

export function useSubscribeNewsletter() {
	return useMutation({
		mutationFn: (data: { email: string; name?: string }) => $subscribeNewsletter({ data }),
	});
}

export const blogStatsQueryOptions = () =>
	queryOptions({
		queryKey: ["blog", "admin", "stats"],
		queryFn: () => $getBlogStats(),
		staleTime: 1000 * 60 * 5,
	});

export function useBlogStats() {
	return useQuery(blogStatsQueryOptions());
}

export const postVersionsQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["blog", "admin", "post-versions", postId],
		queryFn: () => $listPostVersions({ data: { id: postId } }),
		enabled: !!postId,
		staleTime: 1000 * 60 * 2,
	});

export function usePostVersions(postId: string) {
	return useQuery(postVersionsQueryOptions(postId));
}

export function useCreatePostVersion() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) =>
			$createPostVersion({ data }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ["blog", "admin", "post-versions", vars.postId] });
		},
	});
}

export function useGetPostVersion() {
	return useMutation({
		mutationFn: (id: string) => $getPostVersion({ data: { id } }),
	});
}

export function useNewsletterSubscribers(params: { page?: number; confirmed?: boolean } = {}) {
	return useQuery({
		queryKey: ["blog", "newsletter", "subscribers", params],
		queryFn: () => $listNewsletterSubscribers({ data: { page: params.page ?? 1, confirmed: params.confirmed } }),
		staleTime: 1000 * 60 * 2,
	});
}

export function useApplyForAuthor() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => $applyForAuthor({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "author-application", "mine"] });
		},
	});
}

export function useReviewAuthorApplication() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { userId: string; action: "approve" | "reject" }) =>
			$reviewAuthorApplication({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "author-applications"] });
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.AUTHORS.LIST });
		},
	});
}

export function useAuthorApplications(status: "pending" | "approved" | "rejected" = "pending") {
	return useQuery({
		queryKey: ["blog", "author-applications", status],
		queryFn: () => $listAuthorApplications({ data: { status, page: 1, limit: 50 } }),
		staleTime: 1000 * 30,
	});
}

export function useMyAuthorApplication() {
	return useQuery({
		queryKey: ["blog", "author-application", "mine"],
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
		queryKey: ["blog", "sites"],
		queryFn: () => $listSites(),
		staleTime: 1000 * 60 * 2,
	});
}

export function useUpsertSite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) =>
			$upsertSite({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "sites"] });
		},
	});
}

export function useDeleteSite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $deleteSite({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["blog", "sites"] });
		},
	});
}

export function usePages(siteId: string | null) {
	return useQuery({
		queryKey: ["blog", "pages", siteId],
		queryFn: () => $listPages({ data: { siteId: siteId! } }),
		enabled: !!siteId,
		staleTime: 1000 * 60,
	});
}

export function useUpsertPage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) =>
			$upsertPage({ data }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ["blog", "pages", vars.siteId] });
		},
	});
}

export function useDeletePage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: { id: string; siteId: string }) =>
			$deletePage({ data: { id: vars.id } }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ["blog", "pages", vars.siteId] });
		},
	});
}

// =============================================================================
// Notifications
// =============================================================================

export function useNotifications(limit = 20) {
	return useQuery({
		queryKey: ["notifications", limit],
		queryFn: () => $getNotifications({ data: { limit } }),
		refetchInterval: 30_000, // poll every 30s
		refetchIntervalInBackground: false,
	});
}

export function useMarkNotificationRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => $markNotificationRead({ data: { id } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
	});
}

export function useMarkAllNotificationsRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => $markAllNotificationsRead({ data: {} }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
	});
}

// =============================================================================
// Reading Lists
// =============================================================================

export function useMyReadingLists() {
	return useQuery({
		queryKey: ["reading-lists"],
		queryFn: () => $getMyReadingLists({ data: {} }),
	});
}

export function useCreateReadingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; description?: string; isPublic?: boolean }) =>
			$createReadingList({ data }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["reading-lists"] }),
	});
}

export function useReadingListPosts(listId: string | undefined) {
	return useQuery({
		queryKey: ["reading-lists", listId, "posts"],
		queryFn: () => $getReadingListPosts({ data: { listId: listId! } }),
		enabled: !!listId,
	});
}

export function useAddToReadingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { postId: string; listId?: string }) =>
			$addToReadingList({ data }),
		onSuccess: (_, { postId }) => {
			qc.invalidateQueries({ queryKey: ["reading-lists"] });
			qc.invalidateQueries({ queryKey: ["blog", "bookmarks"] });
			qc.invalidateQueries({ queryKey: ["post-bookmark-status", postId] });
		},
	});
}

// =============================================================================
// Mute / Ignore
// =============================================================================

export function useMutedUsers() {
	return useQuery({
		queryKey: ["muted-users"],
		queryFn: () => $getMutedUsers({ data: {} }),
	});
}

export function useToggleMute() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (mutedUserId: string) => $toggleMute({ data: { mutedUserId } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["muted-users"] });
			qc.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.POSTS.PAGINATED({}) });
		},
	});
}

export function useUserInterests() {
	return useQuery({
		queryKey: ["user-interests"],
		queryFn: () => $getUserInterests({ data: {} }),
	});
}

export function useSetUserInterests() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (categoryIds: string[]) => $setUserInterests({ data: { categoryIds } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["user-interests"] }),
	});
}

export function usePublicReadingListsByUser(userId?: string) {
	return useQuery({
		queryKey: ["public-reading-lists", userId],
		queryFn: () => $getPublicReadingListsByUser({ data: { userId: userId! } }),
		enabled: !!userId,
	});
}

export function useUserPostReaction(postId?: string) {
	return useQuery({
		queryKey: ["post-reaction", postId],
		queryFn: () => $getUserPostReaction({ data: { postId: postId! } }),
		enabled: !!postId,
	});
}

export function usePostBookmarkStatus(postId?: string) {
	return useQuery({
		queryKey: ["post-bookmark-status", postId],
		queryFn: () => $getPostBookmarkStatus({ data: { postId: postId! } }),
		enabled: !!postId,
	});
}

export function useRemoveFromReadingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { postId: string }) => $removeFromReadingList({ data }),
		onSuccess: (_, { postId }) => {
			qc.invalidateQueries({ queryKey: ["post-bookmark-status", postId] });
			qc.invalidateQueries({ queryKey: ["reading-lists"] });
		},
	});
}

export function useDeleteReadingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { listId: string }) => $deleteReadingList({ data }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reading-lists"] });
		},
	});
}
