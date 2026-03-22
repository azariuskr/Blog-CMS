import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, asc, count, desc, eq, inArray, lt, notInArray, sql } from "drizzle-orm";
import { accessMiddleware } from "@/lib/auth/middleware";
import { getSession, normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { safe } from "@/lib/result";
import { validate } from "@/lib/validation";
import { inngest } from "@/lib/inngest/client";
import crypto from "node:crypto";
import {
	posts,
	postVersions,
	categories,
	tags,
	postTags,
	authorProfiles,
	comments,
	reactions,
	bookmarks,
	follows,
	newsletterSubscribers,
	notifications,
	readingLists,
	userMutes,
	userInterests,
} from "@/lib/db/schema/cms.schema";
import { user } from "@/lib/db/schema/auth.schema";
import { POST_SCHEMA_VERSION, PostBlockSchema, PostContentSchema, PostMetaSchema } from "@/lib/blog/content-schema";
import { generateMdx } from "@/lib/blog/mdx-generator";

// =============================================================================
// Types
// =============================================================================

/**
 * Drizzle types the `blocks.meta` column as `Record<string, unknown>` but
 * TanStack Start's serialization layer expects `{ [x: string]: {} }` (i.e. no
 * null/undefined values). This alias satisfies both sides without any runtime
 * transformation.
 */
type NormalizedPostBlock = {
	id: string;
	type: string;
	content: string;
	meta?: Record<string, NonNullable<unknown>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NormalizedPost = { id: string; blocks?: NormalizedPostBlock[] | null; [key: string]: any };

// =============================================================================
// Schemas
// =============================================================================

const PostFiltersSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	cursor: z.string().optional(),
	search: z.string().optional(),
	categorySlug: z.string().optional(),
	tagSlug: z.string().optional(),
	authorId: z.string().optional(),
	isFeatured: z.boolean().optional(),
	status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
	sortBy: z.enum(["publishedAt", "updatedAt", "title", "viewCount"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
	followedByUserId: z.string().optional(),
	excludeMutedFor: z.string().optional(),
});

const UpsertPostSchema = z
	.object({
		id: z.string().optional(),
		authorId: z.string().min(1),
		content: z.string().optional(),
		blocks: z.array(PostBlockSchema).optional(),
		schemaVersion: z.number().int().positive().default(POST_SCHEMA_VERSION),
		categoryId: z.string().optional(),
		tagIds: z.array(z.string()).optional(),
		publishedAt: z.string().datetime().optional(),
		scheduledAt: z.string().datetime().optional(),
		isPremium: z.boolean().optional(),
		previewBlocks: z.number().int().min(1).max(20).optional(),
		visibility: z.enum(["public", "external", "both"]).optional().default("public"),
		siteId: z.string().uuid().optional(),
	})
	.merge(PostMetaSchema);


const PostIdSchema = z.object({ id: z.string().min(1) });

const SlugSchema = z.object({ slug: z.string().min(1) });

const UpsertCategorySchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100),
	description: z.string().optional(),
	color: z.string().optional(),
	parentId: z.string().uuid().optional().nullable(),
});


const CategoryIdSchema = z.object({ id: z.string().min(1) });

const UpsertTagSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100),
});

const TagIdSchema = z.object({ id: z.string().min(1) });

const ListCommentsSchema = z.object({
	postId: z.string().optional(),
	status: z.enum(["pending", "approved", "spam"]).optional(),
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
});

const CommentIdSchema = z.object({ id: z.string().min(1) });

const UsernameSchema = z.object({ username: z.string().min(1) });

const ListAuthorsSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
});

const ToggleReactionSchema = z.object({
	postId: z.string().min(1),
	userId: z.string().min(1),
	type: z.enum(["like", "love", "celebrate", "insightful", "curious"]),
});

const ToggleBookmarkSchema = z.object({
	postId: z.string().min(1),
	userId: z.string().min(1),
});

const ToggleFollowSchema = z.object({
	followerId: z.string().min(1),
	followingId: z.string().min(1),
});

// =============================================================================
// Canonical content helpers (Phase C2)
// =============================================================================

const SCHEMA_VERSION_META_KEY = "__schemaVersion" as const;

function toClearValidationMessage(error: z.ZodError): string {
	const issue = error.issues[0];
	if (!issue) return "Invalid post content schema.";
	return `Invalid post content schema at ${issue.path.join(".") || "root"}: ${issue.message}`;
}

function normalizeContentEnvelope(input: { schemaVersion?: number; blocks?: unknown }) {
	const parsed = PostContentSchema.safeParse({
		schemaVersion: input.schemaVersion ?? POST_SCHEMA_VERSION,
		blocks: input.blocks ?? [],
	});

	if (!parsed.success) {
		throw { status: 400, message: toClearValidationMessage(parsed.error) };
	}

	const schemaVersion = parsed.data.schemaVersion;
	const blocks = parsed.data.blocks.map((block, index) => {
		if (index !== 0) return block;
		return {
			...block,
			meta: {
				...(block.meta ?? {}),
				[SCHEMA_VERSION_META_KEY]: schemaVersion,
			},
		};
	});

	return { schemaVersion, blocks };
}

function extractSchemaVersion(blocks: unknown): number {
	if (!Array.isArray(blocks) || blocks.length === 0) return POST_SCHEMA_VERSION;
	const first = blocks[0] as { meta?: Record<string, unknown> };
	const raw = first?.meta?.[SCHEMA_VERSION_META_KEY];
	return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : POST_SCHEMA_VERSION;
}

function validateBlocksForRead(rawBlocks: unknown, postId: string) {
	const parsed = z.array(PostBlockSchema).safeParse(rawBlocks ?? []);
	if (!parsed.success) {
		throw {
			status: 422,
			message: `Post ${postId} has invalid content schema. Please resave this post in the editor.`,
		};
	}
	return parsed.data;
}

function withCanonicalContent<T extends { id: string; blocks?: unknown }>(post: T): T & { schemaVersion: number } {
	const blocks = validateBlocksForRead(post.blocks, post.id);
	return {
		...post,
		blocks,
		schemaVersion: extractSchemaVersion(blocks),
	};
}

// Helper: build a FTS where condition for posts (title + excerpt)
function ftsCondition(search: string) {
	return sql`to_tsvector('english', coalesce(${posts.title}, '') || ' ' || coalesce(${posts.excerpt}, '')) @@ websearch_to_tsquery('english', ${search})`;
}

// =============================================================================
// Posts
// =============================================================================

export const $listPublishedPosts = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(PostFiltersSchema, data))

	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
				search: data.data.search,
				sortBy: data.data.sortBy,
				sortOrder: data.data.sortOrder,
			});

			const cursor = data.data.cursor;
			const useCursor = !!cursor && !data.data.sortBy;

			// For "Following" feed: resolve followed author IDs
			let followedAuthorIds: string[] | undefined;
			if (data.data.followedByUserId) {
				const rows = await db.query.follows.findMany({
					where: eq(follows.followerId, data.data.followedByUserId),
					columns: { followingId: true },
				});
				followedAuthorIds = rows.map((r) => r.followingId);
			}

			// Exclude muted authors
			let mutedAuthorIds: string[] = [];
			if (data.data.excludeMutedFor) {
				const muteRows = await db.query.userMutes.findMany({
					where: eq(userMutes.userId, data.data.excludeMutedFor),
					columns: { mutedUserId: true },
				});
				mutedAuthorIds = muteRows.map((r) => r.mutedUserId);
			}

			const baseWhere = and(
				eq(posts.status, "published"),
				sql`${posts.visibility} IN ('public', 'both')`,
				params.search ? ftsCondition(params.search) : undefined,
				data.data.authorId ? eq(posts.authorId, data.data.authorId) : undefined,
				data.data.isFeatured !== undefined ? eq(posts.isFeatured, data.data.isFeatured) : undefined,
				followedAuthorIds !== undefined
					? (followedAuthorIds.length > 0 ? inArray(posts.authorId, followedAuthorIds) : sql`false`)
					: undefined,
				mutedAuthorIds.length > 0 ? notInArray(posts.authorId, mutedAuthorIds) : undefined,
			);

			const whereClause = useCursor
				? and(baseWhere, lt(posts.publishedAt, new Date(cursor)))
				: baseWhere;

			const orderBy =
				data.data.sortBy === "viewCount"
					? [desc(posts.viewCount)]
					: data.data.sortBy === "title"
						? [asc(posts.title)]
						: data.data.sortBy === "updatedAt"
							? [desc(posts.updatedAt)]
							: [desc(posts.publishedAt)];

			const fetchLimit = params.limit + 1;
			const rawItems = await db.query.posts.findMany({
				where: whereClause,
				orderBy,
				limit: useCursor ? fetchLimit : params.limit,
				offset: useCursor ? 0 : (params.page - 1) * params.limit,
				with: {
					author: true,
					authorProfile: true,
					category: true,
				},
			});

			if (useCursor) {
				const hasMore = rawItems.length > params.limit;
				const items = rawItems.slice(0, params.limit).map((item) => withCanonicalContent(item as NormalizedPost));
				const nextCursor = hasMore && items.length > 0
					? (items[items.length - 1] as any).publishedAt?.toISOString?.() ?? null
					: null;
				return { items, nextCursor, hasMore, total: null, page: null, limit: params.limit, totalPages: null };
			}

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(posts)
				.where(baseWhere);

			return paginatedResult(rawItems.map((item) => withCanonicalContent(item as NormalizedPost)), total, params);
		});
	});

export const $getPostBySlug = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(SlugSchema, data))

	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const post = await db.query.posts.findFirst({
			where: and(eq(posts.slug, data.data.slug), eq(posts.status, "published"), sql`${posts.visibility} IN ('public', 'both')`),
			with: {
				author: true,
				category: true,
			},
		});

		if (!post) {
			throw { status: 404, message: "Post not found" };
		}

		// Fetch the author profile for the bio card
		const authorProfile = await db.query.authorProfiles.findFirst({
			where: eq(authorProfiles.userId, post.authorId),
		});

		// Increment view count (fire-and-forget)
		db.update(posts)
			.set({ viewCount: sql`${posts.viewCount} + 1` })
			.where(eq(posts.id, post.id))
			.catch(() => { });

		const canonicalPost = withCanonicalContent(post as NormalizedPost);

		// Paywall gating
		let isLocked = false;
		if (post.isPremium) {
			const session = await getSession();
			const userId = session?.user?.id;
			let hasAccess = false;
			if (userId) {
				const [userRecord] = await db
					.select({ subscriptionStatus: user.subscriptionStatus, role: user.role })
					.from(user)
					.where(eq(user.id, userId))
					.limit(1);
				hasAccess =
					userRecord?.subscriptionStatus === true ||
					["admin", "superAdmin", "editor"].includes(userRecord?.role ?? "");
			}
			if (!hasAccess) {
				isLocked = true;
				canonicalPost.blocks = canonicalPost.blocks?.slice(0, post.previewBlocks ?? 3) ?? [];
			}
		}

		return { ...canonicalPost, authorProfile: authorProfile ?? null, isLocked };
		});
	});

export const $getPostById = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(PostIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])

	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const post = await db.query.posts.findFirst({
				where: eq(posts.id, data.data.id),
				with: {
					author: true,
					category: true,
					tags: { with: { tag: true } },
				},
			});

			if (!post) {
				throw { status: 404, message: "Post not found" };
			}

			const canonicalPost = withCanonicalContent(post as NormalizedPost);
			return canonicalPost;
		});
	});

export const $listAdminPosts = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(PostFiltersSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])

	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
				search: data.data.search,
				sortBy: data.data.sortBy,
				sortOrder: data.data.sortOrder,
			});

			const offset = (params.page - 1) * params.limit;

			const whereClause = and(
				data.data.status ? eq(posts.status, data.data.status) : undefined,
				params.search ? ftsCondition(params.search) : undefined,
			);

			const [{ total = 0 } = {}] = whereClause
				? await db.select({ total: count() }).from(posts).where(whereClause)
				: await db.select({ total: count() }).from(posts);

			const items = await db.query.posts.findMany({
				where: whereClause,
				orderBy: [desc(posts.updatedAt)],
				limit: params.limit,
				offset,
				with: { author: true, category: true },
			});

			return paginatedResult(items.map((item) => withCanonicalContent(item as NormalizedPost)), total, params);
		});
	});

export const $upsertPost = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertPostSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const { id, tagIds, publishedAt, scheduledAt, schemaVersion, blocks, ...rest } = data.data;
				const normalizedContent = normalizeContentEnvelope({ schemaVersion, blocks });

				const publishedAtDate = publishedAt ? new Date(publishedAt) : undefined;
				const scheduledAtDate = scheduledAt ? new Date(scheduledAt) : undefined;

				// Calculate read time from block content (200 WPM)
				const wordCount = (normalizedContent.blocks ?? [])
					.map((b) => (b as any).content ?? "")
					.join(" ")
					.split(/\s+/)
					.filter(Boolean).length;
				const readTimeMinutes = Math.max(1, Math.round(wordCount / 200));

				// Generate MDX when publishing
				const mdxContent =
					rest.status === "published"
						? generateMdx(normalizedContent.blocks, {
								title: rest.title,
								slug: rest.slug,
								excerpt: rest.excerpt ?? undefined,
								featuredImageUrl: rest.featuredImageUrl ?? undefined,
								isPremium: rest.isPremium ?? false,
								publishedAt: publishedAtDate ?? new Date(),
								schemaVersion: normalizedContent.schemaVersion,
						  })
						: undefined;

				if (id) {
					await db
						.update(posts)
						.set({
							...rest,
							blocks: normalizedContent.blocks,
							...(mdxContent !== undefined ? { content: mdxContent } : {}),
							publishedAt: publishedAtDate,
							scheduledAt: scheduledAtDate,
							readTimeMinutes,
							updatedAt: new Date(),
						})
						.where(eq(posts.id, id));

					if (tagIds !== undefined) {
						await db.delete(postTags).where(eq(postTags.postId, id));
						if (tagIds.length > 0) {
							await db.insert(postTags).values(tagIds.map((tagId: any) => ({ postId: id, tagId })));
						}
					}

					return { id };
				}

				const [inserted] = await db
					.insert(posts)
					.values({
						...rest,
						blocks: normalizedContent.blocks,
						...(mdxContent !== undefined ? { content: mdxContent } : {}),
						publishedAt: publishedAtDate,
						scheduledAt: scheduledAtDate,
						readTimeMinutes,
					})
					.returning({ id: posts.id });

				if (tagIds && tagIds.length > 0) {
					await db.insert(postTags).values(tagIds.map((tagId) => ({ postId: inserted.id, tagId })));
				}

				// Fire git-backed publish event for new published posts
			if (rest.status === "published") {
				await inngest.send({
					name: "blog/post.published",
					data: {
						postId: inserted.id,
						userId: rest.authorId ?? "",
						slug: rest.slug ?? "",
						siteId: rest.siteId ?? undefined,
					},
				}).catch((err: unknown) => console.error("[Blog] Failed to send post.published event:", err));

				// Fire webhook delivery for external integrations
				if (rest.siteId) {
					await inngest.send({
						name: "blog/post.webhook",
						data: {
							siteId: rest.siteId,
							postId: inserted.id,
							postSlug: rest.slug ?? "",
							postTitle: rest.title ?? "",
							eventType: "post.published",
							publishedAt: publishedAtDate?.toISOString(),
						},
					}).catch((err: unknown) => console.error("[Blog] Failed to send post.webhook event:", err));
				}
			}

			return { id: inserted.id };
			},
			{ successMessage: "Post saved successfully" },
		);
	});

export const $generatePreviewToken = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(PostIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const token = crypto.randomBytes(32).toString("hex");
			await db.update(posts).set({ previewToken: token }).where(eq(posts.id, data.data.id));
			return { token };
		});
	});

export const $getPostByPreviewToken = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ token: z.string().min(1) }), data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const post = await db.query.posts.findFirst({
				where: eq(posts.previewToken, data.data.token),
				with: { author: true, category: true },
			});
			if (!post) throw { status: 404, message: "Preview not found or expired" };
			const authorProfile = await db.query.authorProfiles.findFirst({
				where: eq(authorProfiles.userId, post.authorId),
			});
			return { ...withCanonicalContent(post as NormalizedPost), authorProfile: authorProfile ?? null, isLocked: false };
		});
	});

export const $deletePost = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(PostIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				await db.delete(posts).where(eq(posts.id, data.data.id));
				return { id: data.data.id };
			},
			{ successMessage: "Post deleted successfully" },
		);
	});

// =============================================================================
// Workflow — Status transitions
// =============================================================================

// Valid transitions per role:
//   any authenticated user: draft → review (submit for review)
//   any authenticated user: review → draft (retract submission — own posts only)
//   admin/superAdmin (posts:publish): review → published, published → archived,
//                                     archived → draft, draft → published (direct)
const PUBLISH_ROLES = ["admin", "superAdmin"] as const;

export const $transitionPostStatus = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		validate(
			z.object({
				id: z.string().uuid(),
				to: z.enum(["draft", "review", "published", "archived"]),
			}),
			data,
		),
	)
	.middleware([accessMiddleware()])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const session = await getSession();
			const userRole = (session?.user as any)?.role as string ?? "user";

			const post = await db.query.posts.findFirst({
				where: eq(posts.id, data.data.id),
			});
			if (!post) throw { status: 404, message: "Post not found" };

			const from = post.status;
			const to = data.data.to;

			const canPublish = PUBLISH_ROLES.includes(userRole as (typeof PUBLISH_ROLES)[number]);

			// Validate transition
			const valid =
				(from === "draft" && to === "review") ||
				(from === "review" && to === "draft") ||
				(canPublish && from === "review" && to === "published") ||
				(canPublish && from === "draft" && to === "published") ||
				(canPublish && from === "published" && to === "archived") ||
				(canPublish && from === "archived" && to === "draft");

			if (!valid) {
				throw { status: 403, message: `Transition ${from} → ${to} not allowed` };
			}

			const publishedAt =
				to === "published" && !post.publishedAt ? new Date() : undefined;

			await db
				.update(posts)
				.set({
					status: to,
					...(publishedAt ? { publishedAt } : {}),
					updatedAt: new Date(),
				})
				.where(eq(posts.id, data.data.id));

			// Audit log via Inngest
			await inngest.send({
				name: "blog/post.status_changed",
				data: {
					postId: data.data.id,
					from,
					to,
					actorId: session?.user?.id ?? null,
					actorRole: userRole,
					timestamp: new Date().toISOString(),
				},
			}).catch((err: unknown) => console.error("[Blog] Failed to send audit event:", err));

			// Fire git-backed publish event when transitioning to published
			if (to === "published") {
				await inngest.send({
					name: "blog/post.published",
					data: {
						postId: data.data.id,
						userId: session?.user?.id ?? "",
						slug: post.slug,
						siteId: post.siteId ?? undefined,
					},
				}).catch((err: unknown) => console.error("[Blog] Failed to send post.published event:", err));
			}

			return { id: data.data.id, from, to };
		});
	});

// =============================================================================
// Categories
// =============================================================================

export const $listCategories = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		validate(z.object({ includeCount: z.boolean().default(false) }), data),
	)
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			if (data.data.includeCount) {
				return db
					.select({
						id: categories.id,
						name: categories.name,
						slug: categories.slug,
						description: categories.description,
						color: categories.color,
						parentId: categories.parentId,
						createdAt: categories.createdAt,
						postCount: sql<number>`cast(count(${posts.id}) as int)`,
					})
					.from(categories)
					.leftJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, "published")))
					.groupBy(categories.id)
					.orderBy(asc(categories.name));
			}

			return db.query.categories.findMany({
				orderBy: [categories.name],
			});
		});
	});

// Public (no auth) — used by public blog pages (topics, homepage)
export const $listPublicCategories = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.handler(async () => {
		return safe(async () => {
			return db.query.categories.findMany({
				orderBy: [categories.name],
			});
		});
	});

export const $upsertCategory = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertCategorySchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const { id, ...rest } = data.data;

				if (id) {
					await db.update(categories).set(rest).where(eq(categories.id, id));
					return { id };
				}

				const [inserted] = await db
					.insert(categories)
					.values(rest)
					.returning({ id: categories.id });

				return { id: inserted.id };
			},
			{ successMessage: "Category saved successfully" },
		);
	});

export const $deleteCategory = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CategoryIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				await db.delete(categories).where(eq(categories.id, data.data.id));
				return { id: data.data.id };
			},
			{ successMessage: "Category deleted successfully" },
		);
	});

// =============================================================================
// Tags
// =============================================================================

export const $listTags = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			return db
				.select({
					id: tags.id,
					name: tags.name,
					slug: tags.slug,
					createdAt: tags.createdAt,
					postCount: sql<number>`cast(count(${postTags.postId}) as int)`,
				})
				.from(tags)
				.leftJoin(postTags, eq(postTags.tagId, tags.id))
				.groupBy(tags.id)
				.orderBy(asc(tags.name));
		});
	});

export const $createTag = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertTagSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const [inserted] = await db
					.insert(tags)
					.values(data.data)
					.returning({ id: tags.id });

				return { id: inserted.id };
			},
			{ successMessage: "Tag created successfully" },
		);
	});

export const $deleteTag = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(TagIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				await db.delete(tags).where(eq(tags.id, data.data.id));
				return { id: data.data.id };
			},
			{ successMessage: "Tag deleted successfully" },
		);
	});

// =============================================================================
// Comments
// =============================================================================

export const $listComments = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ListCommentsSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
			});

			const whereClause = and(
				data.data.postId ? eq(comments.postId, data.data.postId) : undefined,
				data.data.status ? eq(comments.status, data.data.status) : undefined,
			);

			const [{ total = 0 } = {}] = whereClause
				? await db.select({ total: count() }).from(comments).where(whereClause)
				: await db.select({ total: count() }).from(comments);

			const items = await db.query.comments.findMany({
				where: whereClause,
				orderBy: [desc(comments.createdAt)],
				limit: params.limit,
				offset: (params.page - 1) * params.limit,
			});

			return paginatedResult(items, total, params);
		});
	});

export const $approveComment = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CommentIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const [updated] = await db.update(comments).set({ status: "approved" }).where(eq(comments.id, data.data.id)).returning({ postId: comments.postId });
				if (updated?.postId) {
					await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, updated.postId));
				}
				return { id: data.data.id };
			},
			{ successMessage: "Comment approved successfully" },
		);
	});

export const $spamComment = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CommentIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				await db.update(comments).set({ status: "spam" }).where(eq(comments.id, data.data.id));
				return { id: data.data.id };
			},
			{ successMessage: "Comment marked as spam" },
		);
	});

export const $deleteComment = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CommentIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const [deleted] = await db.delete(comments).where(eq(comments.id, data.data.id)).returning({ postId: comments.postId, status: comments.status });
				if (deleted?.postId && deleted.status === "approved") {
					await db.update(posts).set({ commentCount: sql`GREATEST(0, ${posts.commentCount} - 1)` }).where(eq(posts.id, deleted.postId));
				}
				return { id: data.data.id };
			},
			{ successMessage: "Comment deleted successfully" },
		);
	});

// Public comments (approved only, no auth) + comment creation
const CreateCommentSchema = z.object({
	postId: z.string().uuid(),
	authorId: z.string().min(1),
	content: z.string().min(1).max(2000),
	parentId: z.string().uuid().optional(),
});

export const $listPublicComments = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ postId: z.string().uuid() }), data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const items = await db.query.comments.findMany({
				where: and(
					eq(comments.postId, data.data.postId),
					eq(comments.status, "approved"),
				),
				with: { author: true },
				orderBy: [desc(comments.createdAt)],
				limit: 50,
			});
			return items;
		});
	});

export const $createComment = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateCommentSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const [inserted] = await db.insert(comments).values({
					postId: data.data.postId,
					authorId: data.data.authorId,
					content: data.data.content,
					parentId: data.data.parentId,
					status: "pending",
				}).returning();
				// Notify post author or parent comment author — fire-and-forget
				const post = await db.query.posts.findFirst({ where: eq(posts.id, data.data.postId), columns: { authorId: true } });
				const notifyUserId = data.data.parentId
					? (await db.query.comments.findFirst({ where: eq(comments.id, data.data.parentId!), columns: { authorId: true } }))?.authorId
					: post?.authorId;
				if (notifyUserId && notifyUserId !== data.data.authorId) {
					await db.insert(notifications).values({
						userId: notifyUserId,
						actorId: data.data.authorId,
						type: data.data.parentId ? "comment_reply" : "post_comment",
						postId: data.data.postId,
						commentId: inserted.id,
						message: data.data.parentId ? "Someone replied to your comment." : "Someone commented on your post.",
					}).catch(() => void 0);
				}
				return inserted;
			},
			{ successMessage: "Comment submitted for review!" },
		);
	});

// =============================================================================
// Author Profiles
// =============================================================================

export const $getAuthorByUsername = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(UsernameSchema, data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.query.authorProfiles.findFirst({
				where: eq(authorProfiles.username, data.data.username),
			});

			if (!profile) {
				throw { status: 404, message: "Author not found" };
			}

			return profile;
		});
	});

export const $listAuthors = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ListAuthorsSchema, data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
			});

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(authorProfiles);

			const items = await db.query.authorProfiles.findMany({
				orderBy: [desc(authorProfiles.followersCount)],
				limit: params.limit,
				offset: (params.page - 1) * params.limit,
			});

			return paginatedResult(items, total, params);
		});
	});

const UpsertAuthorProfileSchema = z.object({
	userId: z.string().min(1),
	username: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/, "Username may only contain lowercase letters, numbers, hyphens and underscores"),
	displayName: z.string().max(100).optional(),
	bio: z.string().max(2000).optional(),
	avatarUrl: z.string().url().optional().or(z.literal("")),
	coverUrl: z.string().url().optional().or(z.literal("")),
	website: z.string().url().optional().or(z.literal("")),
	twitterHandle: z.string().max(50).optional(),
	githubHandle: z.string().max(50).optional(),
	linkedinHandle: z.string().max(100).optional(),
	location: z.string().max(100).optional(),
});

export const $upsertAuthorProfile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertAuthorProfileSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const { userId, ...fields } = data.data;

				const existing = await db.query.authorProfiles.findFirst({
					where: eq(authorProfiles.userId, userId),
				});

				if (existing) {
					const [updated] = await db
						.update(authorProfiles)
						.set({ ...fields, updatedAt: new Date() })
						.where(eq(authorProfiles.userId, userId))
						.returning();
					return updated;
				}

				const [inserted] = await db
					.insert(authorProfiles)
					.values({ userId, ...fields })
					.returning();
				return inserted;
			},
			{ successMessage: "Author profile saved." },
		);
	});

const ApplyForAuthorSchema = z.object({
	username: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/, "Username may only contain lowercase letters, numbers, hyphens and underscores"),
	displayName: z.string().min(1).max(100),
	bio: z.string().min(20).max(2000),
	avatarUrl: z.string().url().optional().or(z.literal("")),
	acceptedPolicy: z.literal(true).refine((v) => v === true, { message: "You must accept the platform policy." }),
});

export const $applyForAuthor = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ApplyForAuthorSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			const userId = session?.user?.id;
			if (!userId) throw new Error("Not authenticated");

			const existing = await db.query.authorProfiles.findFirst({
				where: eq(authorProfiles.userId, userId),
			});

			if (existing?.applicationStatus === "approved") {
				throw new Error("You are already an approved author.");
			}

			const values = {
				username: data.data.username,
				displayName: data.data.displayName,
				bio: data.data.bio,
				avatarUrl: data.data.avatarUrl || null,
				acceptedPolicy: true,
				applicationStatus: "pending" as const,
				updatedAt: new Date(),
			};

			if (existing) {
				const [updated] = await db
					.update(authorProfiles)
					.set(values)
					.where(eq(authorProfiles.userId, userId))
					.returning();
				return updated;
			}

			const [inserted] = await db
					.insert(authorProfiles)
					.values({ userId, ...values })
					.returning();
			return inserted;
		}, { successMessage: "Application submitted! An admin will review it shortly." });
	});

const ReviewAuthorApplicationSchema = z.object({
	userId: z.string().min(1),
	action: z.enum(["approve", "reject"]),
});

export const $reviewAuthorApplication = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ReviewAuthorApplicationSchema, data))
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { userId, action } = data.data;
			const newStatus = action === "approve" ? "approved" : "rejected";

			await db
				.update(authorProfiles)
				.set({ applicationStatus: newStatus, updatedAt: new Date() })
				.where(eq(authorProfiles.userId, userId));

			if (action === "approve") {
				await db
					.update(user)
					.set({ role: "author", updatedAt: new Date() })
					.where(eq(user.id, userId));
			}

			return { userId, action };
		}, { successMessage: "Author application reviewed." });
	});

const ListAuthorApplicationsSchema = z.object({
	status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().positive().optional().default(20),
});

export const $listAuthorApplications = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ListAuthorApplicationsSchema, data))
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { status, page, limit } = data.data;
			const offset = (page - 1) * limit;

			const [items, [{ total = 0 } = {}]] = await Promise.all([
				db.query.authorProfiles.findMany({
					where: eq(authorProfiles.applicationStatus, status),
					with: { user: true },
					orderBy: [desc(authorProfiles.createdAt)],
					limit,
					offset,
				}),
				db.select({ total: count() }).from(authorProfiles).where(eq(authorProfiles.applicationStatus, status)),
			]);

			return paginatedResult(items, total, { page, limit, search: undefined, sortBy: undefined, sortOrder: "desc" as const });
		});
	});

export const $getMyAuthorApplication = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async () => {
		return safe(async () => {
			const session = await getSession();
			const userId = session?.user?.id;
			if (!userId) return null;
			return db.query.authorProfiles.findFirst({
				where: eq(authorProfiles.userId, userId),
				columns: { applicationStatus: true, username: true, displayName: true },
			}) ?? null;
		});
	});

// =============================================================================
// Reactions & Bookmarks
// =============================================================================

export const $toggleReaction = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ToggleReactionSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const existing = await db.query.reactions.findFirst({
				where: and(
					eq(reactions.postId, validated.postId),
					eq(reactions.userId, validated.userId),
					eq(reactions.type, validated.type),
				),
			});

			if (existing) {
				await db.delete(reactions).where(eq(reactions.id, existing.id));
				await db.update(posts).set({ likeCount: sql`GREATEST(0, ${posts.likeCount} - 1)` }).where(eq(posts.id, validated.postId));
				return { toggled: false };
			}

			await db.insert(reactions).values(validated);
			await db.update(posts).set({ likeCount: sql`${posts.likeCount} + 1` }).where(eq(posts.id, validated.postId));
			return { toggled: true };
		});
	});

export const $toggleBookmark = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ToggleBookmarkSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const existing = await db.query.bookmarks.findFirst({
				where: and(
					eq(bookmarks.postId, validated.postId),
					eq(bookmarks.userId, validated.userId),
				),
			});

			if (existing) {
				await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
				return { bookmarked: false };
			}

			await db.insert(bookmarks).values(validated);
			return { bookmarked: true };
		});
	});

// =============================================================================
// Follows
// =============================================================================

export const $toggleFollow = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ToggleFollowSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const existing = await db.query.follows.findFirst({
				where: and(
					eq(follows.followerId, validated.followerId),
					eq(follows.followingId, validated.followingId),
				),
			});

			if (existing) {
				await db.delete(follows).where(eq(follows.id, existing.id));
				await db
					.update(authorProfiles)
					.set({ followersCount: sql`${authorProfiles.followersCount} - 1` })
					.where(eq(authorProfiles.userId, validated.followingId));
				return { following: false };
			}

			await db.insert(follows).values(validated);
			await db
				.update(authorProfiles)
				.set({ followersCount: sql`${authorProfiles.followersCount} + 1` })
				.where(eq(authorProfiles.userId, validated.followingId));
			// Notify the followed user
			await db.insert(notifications).values({
				userId: validated.followingId,
				actorId: validated.followerId,
				type: "new_follower",
				message: "Someone started following you.",
			}).catch(() => void 0);
			return { following: true };
		});
	});

export const $getFollowStatus = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ToggleFollowSchema, data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const existing = await db.query.follows.findFirst({
				where: and(
					eq(follows.followerId, validated.followerId),
					eq(follows.followingId, validated.followingId),
				),
			});

			return { following: !!existing };
		});
	});


// =============================================================================
// Newsletter
// =============================================================================

const SubscribeNewsletterSchema = z.object({
	email: z.string().email(),
	name: z.string().max(255).optional(),
});

export const $subscribeNewsletter = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(SubscribeNewsletterSchema, data))
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const confirmToken = crypto.randomBytes(32).toString("hex");
				const [inserted] = await db
					.insert(newsletterSubscribers)
					.values({
						email: data.data.email,
						name: data.data.name,
						siteId: null,
						isConfirmed: false,
						confirmToken,
					})
					.onConflictDoUpdate({
						target: [newsletterSubscribers.email, newsletterSubscribers.siteId],
						set: {
							unsubscribedAt: null,
							subscribedAt: new Date(),
							name: data.data.name,
							confirmToken,
							isConfirmed: false,
						},
					})
					.returning();

				// Fire Inngest event to send confirmation email (best-effort)
				try {
					await inngest.send({
						name: "blog/newsletter.subscribed",
						data: {
							email: data.data.email,
							name: data.data.name,
							subscriberId: inserted.id,
							token: confirmToken,
						},
					});
				} catch (err) {
					console.error("[Newsletter] Failed to send confirmation event:", err);
				}

				return { subscribed: true };
			},
			{ successMessage: "Subscribed successfully!" },
		);
	});

// =============================================================================
// Analytics
// =============================================================================

export const $getBlogStats = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			// Total published posts
			const [totalPostsRow] = await db
				.select({ count: count() })
				.from(posts)
				.where(eq(posts.status, "published"));

			// Total views (sum of viewCount)
			const [totalViewsRow] = await db
				.select({ total: sql<number>`coalesce(sum(${posts.viewCount}), 0)` })
				.from(posts)
				.where(eq(posts.status, "published"));

			// Total comments (approved)
			const [totalCommentsRow] = await db
				.select({ count: count() })
				.from(comments)
				.where(eq(comments.status, "approved"));

			// Total reactions
			const [totalReactionsRow] = await db
				.select({ count: count() })
				.from(reactions);

			// Premium posts count + views
			const [premiumPostsRow] = await db
				.select({
					count: count(),
					views: sql<number>`coalesce(sum(${posts.viewCount}), 0)`,
				})
				.from(posts)
				.where(and(eq(posts.status, "published"), eq(posts.isPremium, true)));

			// Newsletter subscriber count (confirmed)
			const [subscriberRow] = await db
				.select({ count: count() })
				.from(newsletterSubscribers)
				.where(eq(newsletterSubscribers.isConfirmed, true));

			// Top posts by viewCount (limit 5)
			const topPosts = await db.query.posts.findMany({
				where: eq(posts.status, "published"),
				orderBy: [desc(posts.viewCount)],
				limit: 5,
				with: { category: true },
			});

			// Top categories by post count (limit 5)
			const topCategories = await db
				.select({
					id: categories.id,
					name: categories.name,
					slug: categories.slug,
					postCount: count(posts.id),
				})
				.from(categories)
				.leftJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, "published")))
				.groupBy(categories.id, categories.name, categories.slug)
				.orderBy(desc(count(posts.id)))
				.limit(5);

			return {
				totalPosts: totalPostsRow?.count ?? 0,
				totalViews: Number(totalViewsRow?.total ?? 0),
				totalComments: totalCommentsRow?.count ?? 0,
				totalReactions: totalReactionsRow?.count ?? 0,
				premiumPosts: premiumPostsRow?.count ?? 0,
				premiumPostViews: Number(premiumPostsRow?.views ?? 0),
				subscriberCount: subscriberRow?.count ?? 0,
				topPosts: topPosts.map((p) => ({
					id: p.id,
					title: p.title,
					slug: p.slug,
					viewCount: p.viewCount,
					categoryName: p.category?.name ?? null,
				})),
				topCategories: topCategories.map((c) => ({
					id: c.id,
					name: c.name,
					slug: c.slug,
					postCount: Number(c.postCount),
				})),
			};
		});
	});

// =============================================================================
// Post Versions
// =============================================================================

export const $createPostVersion = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		validate(
			z.object({
				postId: z.string().uuid(),
				authorId: z.string(),
				title: z.string().min(1),
				content: z.string().optional(),
				blocks: z.array(z.object({
					id: z.string(),
					type: z.string(),
					content: z.string(),
					meta: z.record(z.string(), z.unknown()).optional(),
				})).optional(),
			}),
			data,
		),
	)
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { postId, authorId, title, content, blocks } = data.data;

			const [version] = await db
				.insert(postVersions)
				.values({
					postId,
					authorId,
					title,
					content: content ?? null,
					blocks: blocks ?? [],
				})
				.returning({ id: postVersions.id, createdAt: postVersions.createdAt });

			return version;
		});
	});

export const $listPostVersions = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(PostIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const versions = await db.query.postVersions.findMany({
				where: eq(postVersions.postId, data.data.id),
				orderBy: [desc(postVersions.createdAt)],
				limit: 20,
				columns: {
					id: true,
					postId: true,
					authorId: true,
					title: true,
					createdAt: true,
				},
			});
			return versions;
		});
	});

export const $getPostVersion = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		validate(z.object({ id: z.string().uuid() }), data),
	)
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	// @ts-ignore handler type inference
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const version = await db.query.postVersions.findFirst({
				where: eq(postVersions.id, data.data.id),
			});
			if (!version) throw new Error("Version not found");
			return version;
		});
	});

export const $listNewsletterSubscribers = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		validate(
			z.object({
				page: z.number().int().min(1).default(1),
				limit: z.number().int().min(1).max(200).default(50),
				confirmed: z.boolean().optional(),
			}),
			data,
		),
	)
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { page, limit, confirmed } = data.data;
			const offset = (page - 1) * limit;

			const where = confirmed !== undefined
				? eq(newsletterSubscribers.isConfirmed, confirmed)
				: undefined;

			const [items, totalRow] = await Promise.all([
				db.query.newsletterSubscribers.findMany({
					where,
					orderBy: [desc(newsletterSubscribers.subscribedAt)],
					limit,
					offset,
				}),
				db.select({ total: count() }).from(newsletterSubscribers).where(where),
			]);

			return {
				items,
				total: totalRow[0]?.total ?? 0,
				page,
				limit,
				totalPages: Math.max(1, Math.ceil((totalRow[0]?.total ?? 0) / limit)),
			};
		});
	});

// =============================================================================
// Sites
// =============================================================================

import { sites, pages } from "@/lib/db/schema/cms.schema";

export const $listSites = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			const items = await db.query.sites.findMany({
				orderBy: [desc(sites.createdAt)],
				with: { pages: { columns: { id: true } } },
			});
			return items;
		});
	});

export const $upsertSite = createServerFn({ method: "POST" })
	.inputValidator(
		(data: unknown) =>
			validate(
				z.object({
					id: z.string().uuid().optional(),
					name: z.string().min(1).max(255),
					slug: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
					description: z.string().optional(),
					subdomain: z.string().optional(),
					status: z.enum(["active", "suspended"]).default("active"),
					gitRepo: z.string().optional(),
					gitBranch: z.string().default("main"),
					themeConfig: z
						.object({
							primaryColor: z.string().default("hsl(199,89%,49%)"),
							accentColor: z.string().default("hsl(180,70%,45%)"),
							fontFamily: z.string().default("Noto Sans"),
							layout: z.enum(["classic", "magazine", "minimal", "portfolio"]).default("classic"),
							darkMode: z.boolean().default(true),
						})
						.optional(),
				}),
				data,
			),
	)
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			const { id, ...payload } = data.data;

			if (id) {
				const [updated] = await db
					.update(sites)
					.set({ ...payload, updatedAt: new Date() })
					.where(eq(sites.id, id))
					.returning();
				return updated;
			}

			const [created] = await db
					.insert(sites)
					.values({
						...payload,
						organizationId: session?.session?.activeOrganizationId ?? null,
					})
					.returning();
			return created;
		});
	});

export const $deleteSite = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ id: z.string().uuid() }), data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			await db.delete(sites).where(eq(sites.id, data.data.id));
			return { ok: true };
		});
	});

// =============================================================================
// Pages (Puck)
// =============================================================================

export const $listPages = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ siteId: z.string().uuid() }), data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	// @ts-ignore handler type inference
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const items = await db.query.pages.findMany({
				where: eq(pages.siteId, data.data.siteId),
				orderBy: [asc(pages.showInNav), asc(pages.title)],
			});
			return items;
		});
	});

export const $upsertPage = createServerFn({ method: "POST" })
	.inputValidator(
		(data: unknown) =>
			validate(
				z.object({
					id: z.string().uuid().optional(),
					siteId: z.string().uuid(),
					title: z.string().min(1).max(500),
					slug: z.string().min(1).max(500),
					status: z.enum(["draft", "published"]).default("draft"),
					showInNav: z.boolean().default(false),
					metaTitle: z.string().optional(),
					metaDescription: z.string().optional(),
					// Puck Data JSON — stored as-is in pages.blocks
					puckData: z.record(z.string(), z.unknown()).optional(),
				}),
				data,
			),
	)
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	// @ts-ignore handler type inference
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			const authorId = session?.user?.id;
			if (!authorId) throw new Error("Unauthenticated");

			const { id, puckData, ...payload } = data.data;

			const blocksValue = puckData ?? null;

			if (id) {
				const [updated] = await db
					.update(pages)
					.set({ ...payload, blocks: blocksValue as any, updatedAt: new Date() })
					.where(eq(pages.id, id))
					.returning();
				return updated;
			}

			const [created] = await db
					.insert(pages)
					.values({ ...payload, blocks: blocksValue as any, authorId })
					.returning();
			return created;
		});
	});

export const $deletePage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ id: z.string().uuid() }), data))
	.middleware([accessMiddleware({ permissions: { content: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			await db.delete(pages).where(eq(pages.id, data.data.id));
			return { ok: true };
		});
	});

export const $getPageBySlug = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ siteSlug: z.string(), pageSlug: z.string() }), data))
	// @ts-ignore handler type inference
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const site = await db.query.sites.findFirst({
				where: eq(sites.slug, data.data.siteSlug),
			});
			if (!site) throw new Error("Site not found");

			const page = await db.query.pages.findFirst({
				where: and(
					eq(pages.siteId, site.id),
					eq(pages.slug, data.data.pageSlug),
					eq(pages.status, "published"),
				),
			});
			if (!page) throw new Error("Page not found");
			return { site, page };
		});
	});

// =============================================================================
// Notifications
// =============================================================================

export const $getNotifications = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ limit: z.number().int().min(1).max(50).default(20) }), data))
	.middleware([accessMiddleware({})])
	.handler(async ({ data }) => {
		return safe(async () => {
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const userId = session.user.id;
			const limit = data.ok ? (data.data.limit ?? 20) : 20;
			const rows = await db.query.notifications.findMany({
				where: eq(notifications.userId, userId),
				orderBy: [desc(notifications.createdAt)],
				limit,
				with: {
					actor: { columns: { id: true, name: true, image: true } },
					post: { columns: { id: true, title: true, slug: true } },
				},
			});
			const unreadCount = rows.filter((n) => !n.read).length;
			return { items: rows, unreadCount };
		});
	});

export const $markNotificationRead = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ id: z.string().uuid() }), data))
	.middleware([accessMiddleware({})])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			await db
				.update(notifications)
				.set({ read: true })
				.where(and(eq(notifications.id, data.data.id), eq(notifications.userId, session.user.id)));
			return { ok: true };
		});
	});

export const $markAllNotificationsRead = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({})])
	.handler(async (_ctx) => {
		return safe(async () => {
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			await db
				.update(notifications)
				.set({ read: true })
				.where(eq(notifications.userId, session.user.id));
			return { ok: true };
		});
	});

// =============================================================================
// Reading Lists
// =============================================================================

export const $getMyReadingLists = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({})])
	.handler(async (_ctx) => {
		return safe(async () => {
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const lists = await db.query.readingLists.findMany({
				where: eq(readingLists.userId, session.user.id),
				orderBy: [desc(readingLists.createdAt)],
			});
			// Ensure default list exists
			if (lists.length === 0 || !lists.some((l) => l.isDefault)) {
				const [created] = await db.insert(readingLists).values({
					userId: session.user.id,
					name: "Reading List",
					isDefault: true,
				}).returning();
				return [created, ...lists.filter((l) => !l.isDefault)];
			}
			return lists;
		});
	});

export const $createReadingList = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ name: z.string().min(1).max(200), description: z.string().optional(), isPublic: z.boolean().optional() }), data))
	.middleware([accessMiddleware({})])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const [list] = await db.insert(readingLists).values({
				userId: session.user.id,
				name: data.data.name,
				description: data.data.description,
				isPublic: data.data.isPublic ?? false,
			}).returning();
			return list;
		});
	});

export const $getReadingListPosts = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ listId: z.string().uuid() }), data))
	.middleware([accessMiddleware({})])
	// @ts-ignore handler type inference
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const list = await db.query.readingLists.findFirst({
				where: and(eq(readingLists.id, data.data.listId), eq(readingLists.userId, session.user.id)),
			});
			if (!list) throw new Error("List not found");
			const items = await db.query.bookmarks.findMany({
				where: and(eq(bookmarks.listId, data.data.listId), eq(bookmarks.userId, session.user.id)),
				orderBy: [desc(bookmarks.createdAt)],
				with: { post: { with: { author: true, authorProfile: true, category: true } } },
			});
			return { list, items };
		});
	});

export const $addToReadingList = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ postId: z.string().uuid(), listId: z.string().uuid().optional() }), data))
	.middleware([accessMiddleware({})])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			let listId = data.data.listId;
			if (!listId) {
				// Get or create default list
				let defaultList = await db.query.readingLists.findFirst({
					where: and(eq(readingLists.userId, session.user.id), eq(readingLists.isDefault, true)),
				});
				if (!defaultList) {
					[defaultList] = await db.insert(readingLists).values({
						userId: session.user.id,
						name: "Reading List",
						isDefault: true,
					}).returning();
				}
				listId = defaultList.id;
			}
			// Upsert bookmark with list
			const existing = await db.query.bookmarks.findFirst({
				where: and(eq(bookmarks.postId, data.data.postId), eq(bookmarks.userId, session.user.id)),
			});
			if (existing) {
				await db.update(bookmarks).set({ listId }).where(eq(bookmarks.id, existing.id));
				return { action: "updated", listId };
			}
			await db.insert(bookmarks).values({ postId: data.data.postId, userId: session.user.id, listId });
			return { action: "added", listId };
		});
	});

// =============================================================================
// Mute / Ignore
// =============================================================================

export const $toggleMute = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ mutedUserId: z.string().min(1) }), data))
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const userId = session.user.id;

			const existing = await db.query.userMutes.findFirst({
				where: and(eq(userMutes.userId, userId), eq(userMutes.mutedUserId, data.data.mutedUserId)),
			});

			if (existing) {
				await db.delete(userMutes).where(eq(userMutes.id, existing.id));
				return { muted: false };
			}

			await db.insert(userMutes).values({ userId, mutedUserId: data.data.mutedUserId });
			return { muted: true };
		});
	});

export const $getMutedUsers = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({})])
	.handler(async (_ctx) => {
		return safe(async () => {
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const rows = await db.query.userMutes.findMany({
				where: eq(userMutes.userId, session.user.id),
				with: {
					mutedUser: { columns: { id: true, name: true, image: true } },
				},
				orderBy: [desc(userMutes.createdAt)],
			});
			return rows;
		});
	});

export const $getUserInterests = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({}), data))
	.middleware([accessMiddleware({})])
	.handler(async (_ctx) => {
		return safe(async () => {
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const rows = await db.query.userInterests.findMany({
				where: eq(userInterests.userId, session.user.id),
				with: { category: true },
			});
			return rows;
		});
	});

export const $setUserInterests = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(z.object({ categoryIds: z.array(z.string().uuid()) }), data))
	.middleware([accessMiddleware({})])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const session = await getSession();
			if (!session?.user?.id) throw new Error("Unauthorized");
			const userId = session.user.id;
			// Replace all interests
			await db.delete(userInterests).where(eq(userInterests.userId, userId));
			if (data.data.categoryIds.length > 0) {
				await db.insert(userInterests).values(
					data.data.categoryIds.map((categoryId) => ({ userId, categoryId })),
				);
			}
			return { ok: true };
		});
	});

export const $getPublicReadingListsByUser = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(z.object({ userId: z.string() }), data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const lists = await db.query.readingLists.findMany({
				where: and(
					eq(readingLists.userId, data.data.userId),
					eq(readingLists.isPublic, true),
				),
				orderBy: [desc(readingLists.createdAt)],
			});
			return lists;
		});
	});
