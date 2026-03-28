import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	authorProfiles,
	categories,
	comments,
	postTags,
	posts,
	reactions,
	tags,
	sites,
	user,
} from "../src/lib/db/schema";
import {
	BLOG_SEED_AUTHORS,
	BLOG_SEED_CATEGORIES,
	BLOG_SEED_COMMENTS,
	BLOG_SEED_POSTS,
	BLOG_SEED_REACTIONS,
	BLOG_SEED_TAGS,
} from "../src/lib/blog/seed-data";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

const sql_client = postgres(databaseUrl);
const db = drizzle({ client: sql_client, schema: { user, authorProfiles, categories, tags, posts, postTags, sites, comments, reactions } });

const DEFAULT_SITE_ID = "f1843afa-81d3-4b51-aaf4-72a9345ed302";

async function uploadRemoteAsset(url: string, key: string): Promise<string> {
	const [{ getStorage }, { getPublicUrl }] = await Promise.all([
		import("../src/lib/storage/client"),
		import("../src/lib/storage/service"),
	]);
	const storage = getStorage();
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
	const arrayBuffer = await response.arrayBuffer();
	const contentType = response.headers.get("content-type") ?? "image/jpeg";
	await storage.upload(key, Buffer.from(arrayBuffer), contentType);
	return getPublicUrl(key);
}

async function maybeUploadAsset(url: string, key: string, enabled: boolean): Promise<string> {
	if (!enabled) return url;
	try {
		return await uploadRemoteAsset(url, key);
	} catch (error) {
		console.warn(`[seed-blog] asset upload failed for ${url}, keeping remote URL`, error);
		return url;
	}
}

async function run() {
	const uploadAssets = process.env.BLOG_SEED_UPLOAD_ASSETS !== "false";
	console.log(`[seed-blog] starting (uploadAssets=${uploadAssets})`);

	// ── Site ────────────────────────────────────────────────────────────────
	await db
		.insert(sites)
		.values({
			id: DEFAULT_SITE_ID,
			slug: "main",
			name: "Main Blog",
			description: "Seeded blog site",
			status: "active",
			subdomain: "main-blog",
		})
		.onConflictDoUpdate({
			target: sites.subdomain,
			set: { name: "Main Blog", description: "Seeded blog site", status: "active" },
		});
	console.log("[seed-blog] site ok");

	// ── Authors ─────────────────────────────────────────────────────────────
	for (const author of BLOG_SEED_AUTHORS) {
		const avatarUrl = await maybeUploadAsset(
			author.avatarUrl,
			`blog-seed/authors/${author.username}/avatar.jpg`,
			uploadAssets,
		);

		await db
			.insert(user)
			.values({
				id: author.id,
				name: author.name,
				email: author.email,
				emailVerified: true,
				image: avatarUrl,
				role: author.role ?? "user",
			})
			.onConflictDoUpdate({
				target: user.id,
				set: { name: author.name, email: author.email, image: avatarUrl, role: author.role ?? "user" },
			});

		await db
			.insert(authorProfiles)
			.values({
				userId: author.id,
				username: author.username,
				displayName: author.name,
				bio: author.bio,
				avatarUrl,
				twitterHandle: author.twitterHandle ?? null,
				githubHandle: author.githubHandle ?? null,
				website: author.website ?? null,
				applicationStatus: "approved",
			})
			.onConflictDoUpdate({
				target: authorProfiles.username,
				set: {
					displayName: author.name,
					bio: author.bio,
					avatarUrl,
					userId: author.id,
					twitterHandle: author.twitterHandle ?? null,
					githubHandle: author.githubHandle ?? null,
					website: author.website ?? null,
					applicationStatus: "approved",
				},
			});
	}
	console.log(`[seed-blog] authors ok (${BLOG_SEED_AUTHORS.length})`);

	// ── Categories ──────────────────────────────────────────────────────────
	for (const category of BLOG_SEED_CATEGORIES) {
		await db
			.insert(categories)
			.values({ ...category, siteId: DEFAULT_SITE_ID })
			.onConflictDoUpdate({
				target: [categories.slug, categories.siteId],
				set: { name: category.name, description: category.description, color: category.color },
			});
	}
	console.log(`[seed-blog] categories ok (${BLOG_SEED_CATEGORIES.length})`);

	// ── Tags ────────────────────────────────────────────────────────────────
	for (const tag of BLOG_SEED_TAGS) {
		await db
			.insert(tags)
			.values({ ...tag, siteId: DEFAULT_SITE_ID })
			.onConflictDoUpdate({
				target: [tags.slug, tags.siteId],
				set: { name: tag.name },
			});
	}
	console.log(`[seed-blog] tags ok (${BLOG_SEED_TAGS.length})`);

	// ── Posts ───────────────────────────────────────────────────────────────
	for (const post of BLOG_SEED_POSTS) {
		const featuredImageUrl = await maybeUploadAsset(
			post.featuredImageUrl,
			`blog-seed/posts/${post.slug}/featured.jpg`,
			uploadAssets,
		);

		await db
			.insert(posts)
			.values({
				id: post.id,
				siteId: DEFAULT_SITE_ID,
				authorId: post.authorId,
				title: post.title,
				slug: post.slug,
				excerpt: post.excerpt,
				content: post.blocks.map((b) => b.content).join("\n\n"),
				blocks: post.blocks,
				featuredImageUrl,
				status: post.status,
				isFeatured: post.isFeatured ?? false,
				viewCount: post.viewCount ?? 0,
				readTimeMinutes: post.readTimeMinutes ?? Math.ceil(post.blocks.length * 0.6),
				categoryId: post.categoryId,
				publishedAt: new Date(post.publishedAt),
			})
			.onConflictDoUpdate({
				target: posts.id,
				set: {
					title: post.title,
					excerpt: post.excerpt,
					content: post.blocks.map((b) => b.content).join("\n\n"),
					blocks: post.blocks,
					featuredImageUrl,
					status: post.status,
					isFeatured: post.isFeatured ?? false,
					viewCount: post.viewCount ?? 0,
					readTimeMinutes: post.readTimeMinutes ?? Math.ceil(post.blocks.length * 0.6),
					categoryId: post.categoryId,
					publishedAt: new Date(post.publishedAt),
				},
			});

		// Post tags — insert only if missing (no conflict target on composite PK)
		for (const tagId of post.tagIds) {
			const existing = await db
				.select({ postId: postTags.postId })
				.from(postTags)
				.where(and(eq(postTags.postId, post.id), eq(postTags.tagId, tagId)))
				.limit(1);
			if (existing.length === 0) {
				await db.insert(postTags).values({ postId: post.id, tagId });
			}
		}
	}
	console.log(`[seed-blog] posts ok (${BLOG_SEED_POSTS.length})`);

	// ── Comments ────────────────────────────────────────────────────────────
	for (const comment of BLOG_SEED_COMMENTS) {
		await db
			.insert(comments)
			.values({
				id: comment.id,
				postId: comment.postId,
				authorId: comment.authorId,
				content: comment.content,
				status: comment.status,
			})
			.onConflictDoNothing({ target: comments.id });
	}
	console.log(`[seed-blog] comments ok (${BLOG_SEED_COMMENTS.length})`);

	// ── Reactions ───────────────────────────────────────────────────────────
	for (const reaction of BLOG_SEED_REACTIONS) {
		await db
			.insert(reactions)
			.values({
				postId: reaction.postId,
				userId: reaction.userId,
				type: reaction.type,
			})
			.onConflictDoNothing();   // unique on (post_id, user_id, type)
	}
	console.log(`[seed-blog] reactions ok (${BLOG_SEED_REACTIONS.length})`);

	// ── Sync denormalised counts ─────────────────────────────────────────────
	// likeCount: count of reaction rows per post
	await sql_client`
		UPDATE posts p
		SET    like_count = sub.cnt
		FROM   (
		  SELECT post_id, COUNT(*) AS cnt
		  FROM   reactions
		  WHERE  type = 'like'
		  GROUP  BY post_id
		) sub
		WHERE p.id = sub.post_id
	`;

	// commentCount: count of approved comments per post
	await sql_client`
		UPDATE posts p
		SET    comment_count = sub.cnt
		FROM   (
		  SELECT post_id, COUNT(*) AS cnt
		  FROM   comments
		  WHERE  status = 'approved'
		  GROUP  BY post_id
		) sub
		WHERE p.id = sub.post_id
	`;

	// postCount on author profiles
	await sql_client`
		UPDATE author_profiles ap
		SET    post_count = sub.cnt
		FROM   (
		  SELECT author_id, COUNT(*) AS cnt
		  FROM   posts
		  WHERE  status = 'published'
		  GROUP  BY author_id
		) sub
		WHERE ap.user_id = sub.author_id
	`;

	console.log("[seed-blog] counts synced");
	console.log("[seed-blog] done ✓");
	await sql_client.end();
}

run().catch(async (error) => {
	console.error("[seed-blog] failed", error);
	await sql_client.end();
	process.exit(1);
});
