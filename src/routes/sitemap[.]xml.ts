import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "@/env/server";

const BASE_URL = (env as any).VITE_BASE_URL ?? "http://localhost:3000";

function xmlEscape(str: string) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function buildSitemap(urls: Array<{ loc: string; lastmod?: string; priority?: string }>) {
	const items = urls
		.map(({ loc, lastmod, priority }) => {
			const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
			const priorityTag = priority ? `\n    <priority>${priority}</priority>` : "";
			return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}${priorityTag}\n  </url>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const publishedPosts = await db.query.posts.findMany({
					where: and(eq(posts.status, "published")),
					columns: { slug: true, updatedAt: true, publishedAt: true, authorId: true },
					with: { author: { columns: { id: true } } },
					orderBy: (p, { desc }) => [desc(p.publishedAt)],
					limit: 1000,
				});

				const authors = await db.query.authorProfiles.findMany({
					columns: { username: true, updatedAt: true },
				});

				const urls: Array<{ loc: string; lastmod?: string; priority?: string }> = [
					{ loc: `${BASE_URL}/`, priority: "1.0" },
					{ loc: `${BASE_URL}/blog`, priority: "0.9" },
				];

				// Author profile pages
				for (const author of authors) {
					urls.push({
						loc: `${BASE_URL}/@${author.username}`,
						lastmod: author.updatedAt?.toISOString().slice(0, 10),
						priority: "0.7",
					});
				}

				// Published posts
				for (const post of publishedPosts) {
					const date = (post.updatedAt ?? post.publishedAt)?.toISOString().slice(0, 10);
					urls.push({
						loc: `${BASE_URL}/blog/${post.slug}`,
						lastmod: date,
						priority: "0.8",
					});
				}

				return new Response(buildSitemap(urls), {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=3600, s-maxage=86400",
					},
				});
			},
		},
	},
});
