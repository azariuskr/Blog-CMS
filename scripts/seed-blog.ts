import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	authorProfiles,
	categories,
	postTags,
	posts,
	tags,
	tenants,
	sites,
	user,
} from "../src/lib/db/schema";
import {
	BLOG_SEED_AUTHORS,
	BLOG_SEED_CATEGORIES,
	BLOG_SEED_POSTS,
	BLOG_SEED_TAGS,
} from "../src/lib/blog/seed-data";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

const sql = postgres(databaseUrl);
const db = drizzle({ client: sql, schema: { user, authorProfiles, categories, tags, posts, postTags, tenants, sites } });

const DEFAULT_TENANT_ID = "f1843afa-81d3-4b51-aaf4-72a9345ed301";
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

	const owner = BLOG_SEED_AUTHORS[0];
	await db
		.insert(user)
		.values({
			id: owner.id,
			name: owner.name,
			email: owner.email,
			emailVerified: true,
			role: "admin",
		})
		.onConflictDoUpdate({
			target: user.id,
			set: { name: owner.name, email: owner.email, role: "admin" },
		});

	await db
		.insert(tenants)
		.values({
			id: DEFAULT_TENANT_ID,
			slug: "default-blog-tenant",
			name: "Default Blog Tenant",
			ownerId: owner.id,
		})
		.onConflictDoUpdate({
			target: tenants.slug,
			set: { name: "Default Blog Tenant", ownerId: owner.id },
		});

	await db
		.insert(sites)
		.values({
			id: DEFAULT_SITE_ID,
			tenantId: DEFAULT_TENANT_ID,
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
				role: "user",
			})
			.onConflictDoUpdate({
				target: user.id,
				set: { name: author.name, email: author.email, image: avatarUrl },
			});

		await db
			.insert(authorProfiles)
			.values({
				userId: author.id,
				username: author.username,
				displayName: author.name,
				bio: author.bio,
				avatarUrl,
			})
			.onConflictDoUpdate({
				target: authorProfiles.username,
				set: {
					displayName: author.name,
					bio: author.bio,
					avatarUrl,
					userId: author.id,
				},
			});
	}

	for (const category of BLOG_SEED_CATEGORIES) {
		await db
			.insert(categories)
			.values({ ...category, siteId: DEFAULT_SITE_ID })
			.onConflictDoUpdate({
				target: [categories.slug, categories.siteId],
				set: {
					name: category.name,
					description: category.description,
					color: category.color,
				},
			});
	}

	for (const tag of BLOG_SEED_TAGS) {
		await db
			.insert(tags)
			.values({ ...tag, siteId: DEFAULT_SITE_ID })
			.onConflictDoUpdate({
				target: [tags.slug, tags.siteId],
				set: { name: tag.name },
			});
	}

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
					categoryId: post.categoryId,
					publishedAt: new Date(post.publishedAt),
				},
			});

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

	console.log("[seed-blog] done");
	await sql.end();
}

run().catch(async (error) => {
	console.error("[seed-blog] failed", error);
	await sql.end();
	process.exit(1);
});
