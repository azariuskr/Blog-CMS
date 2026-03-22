import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, organization } from "./auth.schema";

// ─── Enums ─────────────────────────────────────────────────────────────────

export const postStatusEnum = pgEnum("post_status", [
	"draft",
	"review",
	"scheduled",
	"published",
	"archived",
]);

export const pageStatusEnum = pgEnum("page_status", ["draft", "published"]);

export const commentStatusEnum = pgEnum("comment_status", [
	"pending",
	"approved",
	"spam",
	"deleted",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
	"like",
	"love",
	"celebrate",
	"insightful",
	"curious",
]);

export const siteStatusEnum = pgEnum("site_status", [
	"active",
	"suspended",
	"pending",
]);

export const domainStatusEnum = pgEnum("domain_status", [
	"pending",
	"verified",
	"failed",
]);

export const blockTypeEnum = pgEnum("block_type", [
	"heading",
	"paragraph",
	"code",
	"image",
	"video",
	"alert",
	"callout",
	"blockquote",
	"divider",
	"list",
	"embed",
	"math",
	"diagram",
	"table",
]);

export const postVisibilityEnum = pgEnum("post_visibility", [
	"public",
	"external",
	"both",
]);

// ─── Sites ──────────────────────────────────────────────────────────────────

export const sites = pgTable(
	"sites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
		slug: varchar("slug", { length: 63 }).notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		status: siteStatusEnum("status").notNull().default("active"),
		subdomain: varchar("subdomain", { length: 63 }),
		faviconUrl: text("favicon_url"),
		coverUrl: text("cover_url"),
		themeConfig: jsonb("theme_config")
			.$type<{
				primaryColor: string;
				accentColor: string;
				fontFamily: string;
				layout: "classic" | "magazine" | "minimal" | "portfolio";
				darkMode: boolean;
			}>()
			.default({
				primaryColor: "hsl(199,89%,49%)",
				accentColor: "hsl(180,70%,45%)",
				fontFamily: "Noto Sans",
				layout: "classic",
				darkMode: true,
			}),
		navConfig: jsonb("nav_config")
			.$type<
				Array<{
					label: string;
					href: string;
					external?: boolean;
				}>
			>()
			.default([]),
		footerConfig: jsonb("footer_config")
			.$type<{
				copyright: string;
				links: Array<{ label: string; href: string }>;
			}>()
			.default({ copyright: "", links: [] }),
		seoConfig: jsonb("seo_config")
			.$type<{
				title: string;
				description: string;
				keywords: string[];
				ogImage: string;
			}>()
			.default({ title: "", description: "", keywords: [], ogImage: "" }),
		gitRepo: text("git_repo"),
		gitBranch: text("git_branch").default("main"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("sites_org_idx").on(t.organizationId),
		uniqueIndex("sites_subdomain_idx").on(t.subdomain),
	],
);

export const siteDomains = pgTable(
	"site_domains",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		domain: varchar("domain", { length: 255 }).notNull().unique(),
		status: domainStatusEnum("status").notNull().default("pending"),
		isPrimary: boolean("is_primary").notNull().default(false),
		verifiedAt: timestamp("verified_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [index("site_domains_site_idx").on(t.siteId)],
);

// ─── Author Profiles ─────────────────────────────────────────────────────────

export const authorProfiles = pgTable(
	"author_profiles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		username: varchar("username", { length: 50 }).notNull().unique(),
		displayName: varchar("display_name", { length: 100 }),
		bio: text("bio"),
		avatarUrl: text("avatar_url"),
		coverUrl: text("cover_url"),
		website: text("website"),
		twitterHandle: varchar("twitter_handle", { length: 50 }),
		githubHandle: varchar("github_handle", { length: 50 }),
		linkedinHandle: varchar("linkedin_handle", { length: 100 }),
		location: varchar("location", { length: 100 }),
		followersCount: integer("followers_count").notNull().default(0),
		followingCount: integer("following_count").notNull().default(0),
		postCount: integer("post_count").notNull().default(0),
		// Application flow
		applicationStatus: varchar("application_status", { length: 20 }), // "pending" | "approved" | "rejected" | null
		acceptedPolicy: boolean("accepted_policy").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		uniqueIndex("author_profiles_username_idx").on(t.username),
		index("author_profiles_user_idx").on(t.userId),
	],
);

// ─── Categories & Tags ───────────────────────────────────────────────────────

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id").references(() => sites.id, {
			onDelete: "set null",
		}),
		name: varchar("name", { length: 100 }).notNull(),
		slug: varchar("slug", { length: 100 }).notNull(),
		description: text("description"),
		color: varchar("color", { length: 20 }).default("#0ea5e9"),
		iconUrl: text("icon_url"),
		parentId: uuid("parent_id"),
		postCount: integer("post_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("categories_site_idx").on(t.siteId),
		uniqueIndex("categories_slug_site_idx").on(t.slug, t.siteId),
	],
);

export const tags = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id").references(() => sites.id, {
			onDelete: "set null",
		}),
		name: varchar("name", { length: 100 }).notNull(),
		slug: varchar("slug", { length: 100 }).notNull(),
		description: text("description"),
		postCount: integer("post_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("tags_site_idx").on(t.siteId),
		uniqueIndex("tags_slug_site_idx").on(t.slug, t.siteId),
	],
);

// ─── Posts ───────────────────────────────────────────────────────────────────

export const posts = pgTable(
	"posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id").references(() => sites.id, {
			onDelete: "set null",
		}),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		title: varchar("title", { length: 500 }).notNull(),
		slug: varchar("slug", { length: 500 }).notNull(),
		excerpt: text("excerpt"),
		content: text("content"), // raw MDX string
		blocks: jsonb("blocks")
			.$type<
				Array<{
					id: string;
					type: string;
					content: string;
					meta?: Record<string, unknown>;
				}>
			>()
			.default([]), // block editor JSON
		featuredImageUrl: text("featured_image_url"),
		featuredImageAlt: text("featured_image_alt"),
		status: postStatusEnum("status").notNull().default("draft"),
		visibility: postVisibilityEnum("visibility").notNull().default("public"),
		isPinned: boolean("is_pinned").notNull().default(false),
		isFeatured: boolean("is_featured").notNull().default(false),
		isPremium: boolean("is_premium").notNull().default(false),
		previewBlocks: integer("preview_blocks").notNull().default(3),
		allowComments: boolean("allow_comments").notNull().default(true),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		// SEO
		metaTitle: varchar("meta_title", { length: 500 }),
		metaDescription: text("meta_description"),
		// Stats
		viewCount: integer("view_count").notNull().default(0),
		likeCount: integer("like_count").notNull().default(0),
		commentCount: integer("comment_count").notNull().default(0),
		readTimeMinutes: integer("read_time_minutes"),
		// Git publishing
		gitSha: text("git_sha"),
		gitPath: text("git_path"),
		// Scheduling
		publishedAt: timestamp("published_at"),
		scheduledAt: timestamp("scheduled_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("posts_site_idx").on(t.siteId),
		index("posts_author_idx").on(t.authorId),
		index("posts_status_idx").on(t.status),
		index("posts_published_at_idx").on(t.publishedAt),
		uniqueIndex("posts_slug_site_idx").on(t.slug, t.siteId),
		index("posts_site_visibility_idx").on(t.siteId, t.visibility, t.status, t.publishedAt),
	],
);

export const postVersions = pgTable(
	"post_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		title: varchar("title", { length: 500 }).notNull(),
		content: text("content"),
		blocks: jsonb("blocks").$type<
			Array<{
				id: string;
				type: string;
				content: string;
				meta?: Record<string, unknown>;
			}>
		>(),
		changeNote: text("change_note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("post_versions_post_idx").on(t.postId),
		index("post_versions_created_at_idx").on(t.createdAt),
	],
);

export const cmsVersion = pgTable(
	"cms_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		profileId: text("profile_id").notNull(),
		version: integer("version").notNull(),
		data: jsonb("data"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("cms_versions_profile_idx").on(t.profileId),
		index("cms_versions_version_idx").on(t.version),
	],
);

export const postTags = pgTable(
	"post_tags",
	{
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(t) => [uniqueIndex("post_tags_pk").on(t.postId, t.tagId)],
);

// ─── Static Pages ────────────────────────────────────────────────────────────

export const pages = pgTable(
	"pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		title: varchar("title", { length: 500 }).notNull(),
		slug: varchar("slug", { length: 500 }).notNull(),
		content: text("content"),
		blocks: jsonb("blocks").$type<
			Array<{
				id: string;
				type: string;
				content: string;
				meta?: Record<string, unknown>;
			}>
		>(),
		status: pageStatusEnum("status").notNull().default("draft"),
		showInNav: boolean("show_in_nav").notNull().default(false),
		metaTitle: varchar("meta_title", { length: 500 }),
		metaDescription: text("meta_description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("pages_site_idx").on(t.siteId),
		uniqueIndex("pages_slug_site_idx").on(t.slug, t.siteId),
	],
);

// ─── Social ──────────────────────────────────────────────────────────────────

export const comments = pgTable(
	"comments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		parentId: uuid("parent_id"),
		content: text("content").notNull(),
		status: commentStatusEnum("status").notNull().default("approved"),
		likeCount: integer("like_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("comments_post_idx").on(t.postId),
		index("comments_author_idx").on(t.authorId),
		index("comments_parent_idx").on(t.parentId),
	],
);

export const reactions = pgTable(
	"reactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: reactionTypeEnum("type").notNull().default("like"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		uniqueIndex("reactions_uk").on(t.postId, t.userId, t.type),
		index("reactions_post_idx").on(t.postId),
	],
);

export const bookmarks = pgTable(
	"bookmarks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		uniqueIndex("bookmarks_uk").on(t.postId, t.userId),
		index("bookmarks_user_idx").on(t.userId),
	],
);

export const follows = pgTable(
	"follows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		followerId: text("follower_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		followingId: text("following_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		uniqueIndex("follows_uk").on(t.followerId, t.followingId),
		index("follows_follower_idx").on(t.followerId),
		index("follows_following_idx").on(t.followingId),
	],
);

// ─── Media ───────────────────────────────────────────────────────────────────

export const media = pgTable(
	"media",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id").references(() => sites.id, {
			onDelete: "set null",
		}),
		uploaderId: text("uploader_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		filename: varchar("filename", { length: 500 }).notNull(),
		originalName: varchar("original_name", { length: 500 }).notNull(),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		sizeBytes: integer("size_bytes").notNull(),
		url: text("url").notNull(),
		thumbnailUrl: text("thumbnail_url"),
		width: integer("width"),
		height: integer("height"),
		alt: text("alt"),
		caption: text("caption"),
		storageKey: text("storage_key").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("media_site_idx").on(t.siteId),
		index("media_uploader_idx").on(t.uploaderId),
	],
);

// ─── Newsletter ──────────────────────────────────────────────────────────────

export const newsletterSubscribers = pgTable(
	"newsletter_subscribers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id").references(() => sites.id, {
			onDelete: "cascade",
		}),
		email: varchar("email", { length: 255 }).notNull(),
		name: varchar("name", { length: 255 }),
		isConfirmed: boolean("is_confirmed").notNull().default(false),
		confirmToken: text("confirm_token"),
		subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
		unsubscribedAt: timestamp("unsubscribed_at"),
	},
	(t) => [
		uniqueIndex("newsletter_email_site_uk").on(t.email, t.siteId),
		index("newsletter_site_idx").on(t.siteId),
	],
);

// ─── API Keys (Headless CMS) ─────────────────────────────────────────────────

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		keyHash: text("key_hash").notNull().unique(),
		keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id),
		rateLimitRpm: integer("rate_limit_rpm").notNull().default(60),
		allowedOrigins: text("allowed_origins").array(),
		lastUsedAt: timestamp("last_used_at"),
		expiresAt: timestamp("expires_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("api_keys_site_idx").on(t.siteId),
	],
);

export const apiWebhooks = pgTable(
	"api_webhooks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		apiKeyId: uuid("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		secret: text("secret").notNull(),
		events: text("events")
			.array()
			.notNull()
			.default(["post.published", "post.updated", "post.deleted"]),
		isActive: boolean("is_active").notNull().default(true),
		lastFiredAt: timestamp("last_fired_at"),
		lastStatusCode: integer("last_status_code"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("api_webhooks_key_idx").on(t.apiKeyId),
	],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const sitesRelations = relations(sites, ({ one, many }) => ({
	organization: one(organization, {
		fields: [sites.organizationId],
		references: [organization.id],
	}),
	domains: many(siteDomains),
	posts: many(posts),
	pages: many(pages),
	categories: many(categories),
	tags: many(tags),
	media: many(media),
	apiKeys: many(apiKeys),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(user, { fields: [posts.authorId], references: [user.id] }),
	site: one(sites, { fields: [posts.siteId], references: [sites.id] }),
	category: one(categories, {
		fields: [posts.categoryId],
		references: [categories.id],
	}),
	tags: many(postTags),
	comments: many(comments),
	reactions: many(reactions),
	bookmarks: many(bookmarks),
	versions: many(postVersions),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
	tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(user, { fields: [comments.authorId], references: [user.id] }),
	replies: many(comments, { relationName: "replies" }),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "replies",
	}),
}));

export const authorProfilesRelations = relations(
	authorProfiles,
	({ one }) => ({
		user: one(user, {
			fields: [authorProfiles.userId],
			references: [user.id],
		}),
	}),
);

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	site: one(sites, { fields: [apiKeys.siteId], references: [sites.id] }),
	createdByUser: one(user, { fields: [apiKeys.createdBy], references: [user.id] }),
	webhooks: many(apiWebhooks),
}));

export const apiWebhooksRelations = relations(apiWebhooks, ({ one }) => ({
	apiKey: one(apiKeys, { fields: [apiWebhooks.apiKeyId], references: [apiKeys.id] }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostVersion = typeof postVersions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Media = typeof media.$inferSelect;
export type AuthorProfile = typeof authorProfiles.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiWebhook = typeof apiWebhooks.$inferSelect;
export type NewApiWebhook = typeof apiWebhooks.$inferInsert;
export type PostVisibility = (typeof postVisibilityEnum.enumValues)[number];

export type PostStatus = (typeof postStatusEnum.enumValues)[number];
export type ReactionType = (typeof reactionTypeEnum.enumValues)[number];
export type SiteStatus = (typeof siteStatusEnum.enumValues)[number];
export type DomainStatus = (typeof domainStatusEnum.enumValues)[number];

export type BlockData = {
	id: string;
	type:
		| "heading"
		| "paragraph"
		| "code"
		| "image"
		| "video"
		| "alert"
		| "callout"
		| "blockquote"
		| "divider"
		| "list"
		| "embed"
		| "math"
		| "diagram"
		| "table";
	content: string;
	meta?: {
		level?: 1 | 2 | 3 | 4 | 5 | 6; // for heading
		language?: string; // for code
		variant?: "info" | "warning" | "error" | "success"; // for alert/callout
		ordered?: boolean; // for list
		url?: string; // for image/video/embed
		alt?: string; // for image
		caption?: string; // for image
		[key: string]: unknown;
	};
};
