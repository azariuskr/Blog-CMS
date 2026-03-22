import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authorProfiles, posts } from "@/lib/db/schema";
import { authenticateApiRequest, apiJsonResponse, apiErrorResponse, corsHeaders } from "@/lib/api-keys/middleware";

export const Route = createFileRoute("/api/v1/authors")({
	server: {
		handlers: {
			OPTIONS: async ({ request }) => {
				return new Response(null, { status: 204, headers: corsHeaders(request, null) });
			},

			GET: async ({ request }) => {
				const authResult = await authenticateApiRequest(request);
				if (!authResult.ok) return apiErrorResponse(authResult);

				const { apiKey, rateLimit } = authResult.data;

				// Authors who have published posts on this site with external/both visibility
				const rows = await db
					.selectDistinctOn([authorProfiles.id], {
						id: authorProfiles.id,
						username: authorProfiles.username,
						displayName: authorProfiles.displayName,
						bio: authorProfiles.bio,
						avatarUrl: authorProfiles.avatarUrl,
						website: authorProfiles.website,
						twitterHandle: authorProfiles.twitterHandle,
						githubHandle: authorProfiles.githubHandle,
						postCount: authorProfiles.postCount,
					})
					.from(authorProfiles)
					.innerJoin(posts, eq(posts.authorId, authorProfiles.userId))
					.where(
						sql`${posts.siteId} = ${apiKey.siteId}
						AND ${posts.status} = 'published'
						AND ${posts.visibility} IN ('external', 'both')`,
					);

				return apiJsonResponse(
					{
						data: rows,
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
