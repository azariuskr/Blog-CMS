import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { authenticateApiRequest, apiJsonResponse, apiErrorResponse, corsHeaders } from "@/lib/api-keys/middleware";

export const Route = createFileRoute("/api/v1/tags")({
	server: {
		handlers: {
			OPTIONS: async ({ request }) => {
				return new Response(null, { status: 204, headers: corsHeaders(request, null) });
			},

			GET: async ({ request }) => {
				const authResult = await authenticateApiRequest(request);
				if (!authResult.ok) return apiErrorResponse(authResult);

				const { apiKey, rateLimit } = authResult.data;

				const rows = await db
					.select({
						id: tags.id,
						name: tags.name,
						slug: tags.slug,
						postCount: tags.postCount,
					})
					.from(tags)
					.where(eq(tags.siteId, apiKey.siteId));

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
