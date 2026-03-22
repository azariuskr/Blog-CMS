import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, categories, tags, postTags, authorProfiles } from "@/lib/db/schema";
import { authenticateApiRequest, apiJsonResponse, apiErrorResponse, corsHeaders } from "@/lib/api-keys/middleware";
import { renderBlocksToHtml } from "@/lib/api-keys/renderer";

export const Route = createFileRoute("/api/v1/posts/$slug")({
	server: {
		handlers: {
			OPTIONS: async ({ request }) => {
				return new Response(null, {
					status: 204,
					headers: corsHeaders(request, null),
				});
			},

			GET: async ({ request, params }) => {
				const authResult = await authenticateApiRequest(request);
				if (!authResult.ok) return apiErrorResponse(authResult);

				const { apiKey, rateLimit } = authResult.data;
				const { slug } = params;

				const [row] = await db
					.select()
					.from(posts)
					.where(
						and(
							eq(posts.slug, slug),
							eq(posts.siteId, apiKey.siteId),
							eq(posts.status, "published"),
							sql`${posts.visibility} IN ('external', 'both')`,
						),
					)
					.limit(1);

				if (!row) {
					return apiJsonResponse({ error: "Post not found" }, 404, {
						"Cache-Control": "no-store",
						...corsHeaders(request, apiKey.allowedOrigins),
					});
				}

				// Increment view count (fire-and-forget)
				db.execute(sql`UPDATE posts SET view_count = view_count + 1 WHERE id = ${row.id}`).catch(() => {});

				// Enrich
				const [author] = await db
					.select({
						displayName: authorProfiles.displayName,
						username: authorProfiles.username,
						avatarUrl: authorProfiles.avatarUrl,
						bio: authorProfiles.bio,
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

				return apiJsonResponse(
					{
						data: {
							id: row.id,
							slug: row.slug,
							title: row.title,
							excerpt: row.excerpt,
							content: row.content,
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
							viewCount: row.viewCount + 1,
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
