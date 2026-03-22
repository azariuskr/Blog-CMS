import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, categories, tags, postTags, authorProfiles } from "@/lib/db/schema";
import { authenticateApiRequest, apiJsonResponse, apiErrorResponse, corsHeaders } from "@/lib/api-keys/middleware";
import { renderBlocksToHtml } from "@/lib/api-keys/renderer";

export const Route = createFileRoute("/api/v1/posts")({
	server: {
		handlers: {
			OPTIONS: async ({ request }) => {
				return new Response(null, {
					status: 204,
					headers: corsHeaders(request, null),
				});
			},

			GET: async ({ request }) => {
				const authResult = await authenticateApiRequest(request);
				if (!authResult.ok) return apiErrorResponse(authResult);

				const { apiKey, rateLimit } = authResult.data;
				const url = new URL(request.url);

				// Parse query params
				const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
				const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
				const categorySlug = url.searchParams.get("category");
				const tagSlug = url.searchParams.get("tag");
				const q = url.searchParams.get("q");
				const fields = url.searchParams.get("fields")?.split(",").filter(Boolean);
				const offset = (page - 1) * limit;

				// Build WHERE conditions
				const conditions = [
					eq(posts.siteId, apiKey.siteId),
					eq(posts.status, "published"),
					sql`${posts.visibility} IN ('external', 'both')`,
				];

				if (categorySlug) {
					const cat = await db
						.select({ id: categories.id })
						.from(categories)
						.where(and(eq(categories.slug, categorySlug), eq(categories.siteId, apiKey.siteId)))
						.limit(1);
					if (cat.length > 0) {
						conditions.push(eq(posts.categoryId, cat[0].id));
					} else {
						// No matching category — return empty
						return apiJsonResponse({
							data: [],
							pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
							meta: { siteId: apiKey.siteId, siteName: apiKey.siteName, generatedAt: new Date().toISOString() },
						}, 200, { ...rateLimit, ...corsHeaders(request, apiKey.allowedOrigins) });
					}
				}

				if (q) {
					conditions.push(
						sql`to_tsvector('english', coalesce(${posts.title}, '') || ' ' || coalesce(${posts.excerpt}, '')) @@ websearch_to_tsquery('english', ${q})`,
					);
				}

				const whereClause = and(...conditions);

				// Tag filter — subquery
				let tagCondition: ReturnType<typeof sql> | undefined;
				if (tagSlug) {
					const tagRow = await db
						.select({ id: tags.id })
						.from(tags)
						.where(and(eq(tags.slug, tagSlug), eq(tags.siteId, apiKey.siteId)))
						.limit(1);
					if (tagRow.length > 0) {
						tagCondition = sql`${posts.id} IN (SELECT post_id FROM post_tags WHERE tag_id = ${tagRow[0].id})`;
					}
				}

				const finalWhere = tagCondition ? and(whereClause, tagCondition) : whereClause;

				// Count total
				const [{ count }] = await db
					.select({ count: sql<number>`count(*)::int` })
					.from(posts)
					.where(finalWhere);

				// Fetch posts
				const rows = await db
					.select({
						id: posts.id,
						slug: posts.slug,
						title: posts.title,
						excerpt: posts.excerpt,
						blocks: posts.blocks,
						featuredImageUrl: posts.featuredImageUrl,
						readTimeMinutes: posts.readTimeMinutes,
						publishedAt: posts.publishedAt,
						likeCount: posts.likeCount,
						commentCount: posts.commentCount,
						viewCount: posts.viewCount,
						authorId: posts.authorId,
						categoryId: posts.categoryId,
					})
					.from(posts)
					.where(finalWhere)
					.orderBy(desc(posts.publishedAt))
					.limit(limit)
					.offset(offset);

				// Enrich with author + category + tags
				const data = await Promise.all(
					rows.map(async (row) => {
						const [author] = await db
							.select({
								displayName: authorProfiles.displayName,
								username: authorProfiles.username,
								avatarUrl: authorProfiles.avatarUrl,
							})
							.from(authorProfiles)
							.where(eq(authorProfiles.userId, row.authorId))
							.limit(1);

						const category = row.categoryId
							? (await db
									.select({ name: categories.name, slug: categories.slug, color: categories.color })
									.from(categories)
									.where(eq(categories.id, row.categoryId))
									.limit(1))[0] ?? null
							: null;

						const postTagRows = await db
							.select({ name: tags.name, slug: tags.slug })
							.from(postTags)
							.innerJoin(tags, eq(postTags.tagId, tags.id))
							.where(eq(postTags.postId, row.id));

						const blocks = (row.blocks ?? []) as Array<{ id: string; type: string; content: string; meta?: Record<string, unknown> }>;
						const contentHtml = renderBlocksToHtml(blocks as any);

						const post: Record<string, unknown> = {
							id: row.id,
							slug: row.slug,
							title: row.title,
							excerpt: row.excerpt,
							contentHtml,
							blocks,
							featuredImageUrl: row.featuredImageUrl,
							readTimeMinutes: row.readTimeMinutes,
							publishedAt: row.publishedAt?.toISOString() ?? null,
							author: author ?? null,
							category,
							tags: postTagRows,
							likeCount: row.likeCount,
							commentCount: row.commentCount,
							viewCount: row.viewCount,
						};

						// Sparse fieldset
						if (fields && fields.length > 0) {
							const always = ["id", "slug"];
							const allowed = new Set([...always, ...fields]);
							for (const key of Object.keys(post)) {
								if (!allowed.has(key)) delete post[key];
							}
						}

						return post;
					}),
				);

				const totalPages = Math.ceil(count / limit);

				return apiJsonResponse(
					{
						data,
						pagination: {
							page,
							limit,
							total: count,
							totalPages,
							hasNext: page < totalPages,
							hasPrev: page > 1,
						},
						meta: {
							siteId: apiKey.siteId,
							siteName: apiKey.siteName,
							generatedAt: new Date().toISOString(),
						},
					},
					200,
					{ ...rateLimit, ...corsHeaders(request, apiKey.allowedOrigins) },
				);
			},
		},
	},
});
