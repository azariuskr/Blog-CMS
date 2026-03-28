/**
 * Restore blocks + content for posts that have empty blocks in the DB.
 * Sourced directly from BLOG_SEED_POSTS. Only touches posts with empty blocks.
 * Does NOT overwrite isPremium, previewBlocks, viewCount, or other live fields.
 */
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { posts } from "../src/lib/db/schema";
import { BLOG_SEED_POSTS } from "../src/lib/blog/seed-data";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const client = postgres(databaseUrl);
const db = drizzle({ client });

async function main() {
	// Find all published posts that have empty blocks array
	const emptyPosts = await db
		.select({ id: posts.id, slug: posts.slug, title: posts.title })
		.from(posts)
		.where(
			sql`jsonb_array_length(CASE WHEN ${posts.blocks} IS NOT NULL AND jsonb_typeof(${posts.blocks}) = 'array' THEN ${posts.blocks} ELSE '[]'::jsonb END) = 0`,
		);

	if (emptyPosts.length === 0) {
		console.log("[restore] No posts with empty blocks found.");
		await client.end();
		return;
	}

	console.log(`[restore] Found ${emptyPosts.length} post(s) with empty blocks:`);
	for (const p of emptyPosts) {
		console.log(`  - ${p.slug} (${p.id})`);
	}

	let restored = 0;
	let skipped = 0;

	for (const emptyPost of emptyPosts) {
		const seedPost = BLOG_SEED_POSTS.find((s) => s.id === emptyPost.id);

		if (!seedPost || !seedPost.blocks || seedPost.blocks.length === 0) {
			console.log(`  [SKIP] ${emptyPost.slug} — no seed blocks found`);
			skipped++;
			continue;
		}

		const restoredContent = seedPost.blocks.map((b) => b.content).join("\n\n");

		await db
			.update(posts)
			.set({
				blocks: seedPost.blocks as any,
				content: restoredContent,
				readTimeMinutes: seedPost.readTimeMinutes ?? Math.max(1, Math.ceil(seedPost.blocks.length * 0.6)),
				updatedAt: new Date(),
			})
			.where(eq(posts.id, emptyPost.id));

		console.log(`  [OK]   ${emptyPost.slug} — restored ${seedPost.blocks.length} blocks`);
		restored++;
	}

	console.log(`\n[restore] Done. Restored: ${restored}, Skipped: ${skipped}`);
	await client.end();
}

main().catch((err) => {
	console.error("[restore] Fatal error:", err);
	process.exit(1);
});
