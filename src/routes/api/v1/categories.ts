import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { authenticateApiRequest, apiJsonResponse, apiErrorResponse, corsHeaders } from "@/lib/api-keys/middleware";

export const Route = createFileRoute("/api/v1/categories")({
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
						id: categories.id,
						name: categories.name,
						slug: categories.slug,
						description: categories.description,
						color: categories.color,
						postCount: categories.postCount,
					})
					.from(categories)
					.where(eq(categories.siteId, apiKey.siteId));

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
