/**
 * Commerce Schema
 *
 * Covers one-time product sales, courses, affiliate tracking, and bundles.
 * Designed to extend the billing system without replacing it —
 * subscriptions remain in Better Auth / billing.schema.ts.
 *
 * Future implementation phases:
 *  Phase A — Digital asset sales (products + purchases + download tokens)
 *  Phase B — Courses (courses + lessons + enrollments + lesson progress)
 *  Phase C — Affiliate program (affiliate codes + referrals + commissions)
 *  Phase D — Bundles (bundle + bundle items)
 */

import { relations } from "drizzle-orm";
import {
	pgTable,
	pgEnum,
	text,
	varchar,
	integer,
	boolean,
	timestamp,
	json,
	index,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

// =============================================================================
// Enums
// =============================================================================

export const productTypeEnum = pgEnum("product_type", [
	"download",   // PDF, template, zip file, etc.
	"template",   // standalone design / code template
	"course_access", // one-time purchase of a specific course
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
	"completed",
	"refunded",
	"disputed",
]);

export const enrollmentSourceEnum = pgEnum("enrollment_source", [
	"subscription", // included in Pro / Enterprise plan
	"purchase",     // bought individually
	"gift",         // gifted by admin
]);

export const commissionStatusEnum = pgEnum("commission_status", [
	"pending",  // conversion happened, waiting for payout window
	"paid",     // transferred to affiliate
	"reversed", // subscription was refunded
]);

// =============================================================================
// Phase A — Digital Products & Purchases
// =============================================================================

/**
 * Sellable products: downloads, templates, one-off course access.
 * Subscription-gated content lives in the billing system.
 */
export const products = pgTable(
	"products",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		type: productTypeEnum("type").notNull(),
		priceCents: integer("price_cents").notNull(),
		currency: varchar("currency", { length: 10 }).notNull().default("usd"),
		// Storage: R2/S3 object key — never exposed to clients directly
		fileKey: text("file_key"),
		fileMimeType: varchar("file_mime_type", { length: 100 }),
		fileSizeBytes: integer("file_size_bytes"),
		// Provider price IDs — set after creating products in Stripe/Polar
		stripePriceId: text("stripe_price_id"),
		polarProductId: text("polar_product_id"),
		// Optional: cover image for product listings
		coverImageUrl: text("cover_image_url"),
		// Whether this product appears in the public store
		isActive: boolean("is_active").notNull().default(true),
		metadata: json("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
	},
	(t) => [
		index("products_slug_idx").on(t.slug),
		index("products_type_idx").on(t.type),
		index("products_is_active_idx").on(t.isActive),
	],
);

/**
 * One-time purchase records (not subscriptions).
 * One row per user per product per payment.
 */
export const purchases = pgTable(
	"purchases",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		pricePaidCents: integer("price_paid_cents").notNull(),
		currency: varchar("currency", { length: 10 }).notNull().default("usd"),
		provider: varchar("provider", { length: 20 }).notNull(), // stripe | polar
		providerPaymentId: text("provider_payment_id").notNull(),
		providerSessionId: text("provider_session_id"),
		status: purchaseStatusEnum("status").notNull().default("completed"),
		refundedAt: timestamp("refunded_at"),
		metadata: json("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("purchases_user_id_idx").on(t.userId),
		index("purchases_product_id_idx").on(t.productId),
		uniqueIndex("purchases_provider_payment_id_uidx").on(t.providerPaymentId),
	],
);

/**
 * Short-lived single-use tokens for secure file downloads.
 * Generated on demand after verifying purchase ownership.
 * Expire after 15 minutes and can only be used once.
 */
export const downloadTokens = pgTable(
	"download_tokens",
	{
		id: text("id").primaryKey(), // crypto.randomBytes(32).toString('hex')
		purchaseId: uuid("purchase_id")
			.notNull()
			.references(() => purchases.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at").notNull(),
		usedAt: timestamp("used_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("download_tokens_user_id_idx").on(t.userId),
		index("download_tokens_expires_at_idx").on(t.expiresAt),
	],
);

// =============================================================================
// Phase B — Courses
// =============================================================================

/**
 * Courses can be:
 *  - Free for all subscribers (isIncludedInPro = true)
 *  - Enterprise-only (isIncludedInEnterprise = true, isIncludedInPro = false)
 *  - Purchasable individually (priceCents > 0 + stripePriceId set)
 */
export const courses = pgTable(
	"courses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 255 }).notNull().unique(),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description"),
		excerpt: text("excerpt"),
		coverImageUrl: text("cover_image_url"),
		// Pricing — 0 means free for the subscription tier that includes it
		priceCents: integer("price_cents").notNull().default(0),
		currency: varchar("currency", { length: 10 }).notNull().default("usd"),
		// Plan access control
		isIncludedInPro: boolean("is_included_in_pro").notNull().default(false),
		isIncludedInEnterprise: boolean("is_included_in_enterprise").notNull().default(true),
		// Provider IDs for standalone course purchases
		stripePriceId: text("stripe_price_id"),
		polarProductId: text("polar_product_id"),
		// Authorship
		authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
		// Publishing
		publishedAt: timestamp("published_at"),
		isActive: boolean("is_active").notNull().default(true),
		metadata: json("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
	},
	(t) => [
		index("courses_slug_idx").on(t.slug),
		index("courses_author_id_idx").on(t.authorId),
		index("courses_is_active_idx").on(t.isActive),
	],
);

/**
 * Individual lessons within a course.
 * isFree = true makes the lesson a public preview.
 */
export const lessons = pgTable(
	"lessons",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		slug: varchar("slug", { length: 255 }).notNull(),
		title: varchar("title", { length: 255 }).notNull(),
		// Block JSON array (same schema as blog posts) or MDX string
		blocks: json("blocks").$type<unknown[]>().default([]),
		content: text("content"), // rendered MDX / HTML fallback
		videoUrl: text("video_url"),
		durationSeconds: integer("duration_seconds"),
		sortOrder: integer("sort_order").notNull().default(0),
		isFree: boolean("is_free").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
	},
	(t) => [
		index("lessons_course_id_idx").on(t.courseId),
		uniqueIndex("lessons_course_slug_uidx").on(t.courseId, t.slug),
	],
);

/**
 * Tracks which users are enrolled in which courses and how.
 */
export const enrollments = pgTable(
	"enrollments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		source: enrollmentSourceEnum("source").notNull().default("subscription"),
		purchaseId: uuid("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
		enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
	},
	(t) => [
		uniqueIndex("enrollments_user_course_uidx").on(t.userId, t.courseId),
		index("enrollments_course_id_idx").on(t.courseId),
	],
);

/**
 * Per-lesson completion tracking.
 */
export const lessonProgress = pgTable(
	"lesson_progress",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		lessonId: uuid("lesson_id")
			.notNull()
			.references(() => lessons.id, { onDelete: "cascade" }),
		completedAt: timestamp("completed_at"),
		lastViewedAt: timestamp("last_viewed_at").defaultNow(),
	},
	(t) => [
		uniqueIndex("lesson_progress_pk").on(t.userId, t.lessonId),
	],
);

// =============================================================================
// Phase C — Affiliate Program
// =============================================================================

/**
 * Affiliate codes issued to approved affiliates.
 * Affiliates share their code link; conversions are tracked via referrals.
 */
export const affiliateCodes = pgTable(
	"affiliate_codes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		code: varchar("code", { length: 50 }).notNull().unique(),
		// Commission as integer percentage: 20 = 20%
		commissionPercent: integer("commission_percent").notNull().default(20),
		// Lifetime commission cap in cents (null = unlimited)
		maxLifetimeCents: integer("max_lifetime_cents"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("affiliate_codes_user_id_idx").on(t.userId),
		uniqueIndex("affiliate_codes_code_uidx").on(t.code),
	],
);

/**
 * One row per click on an affiliate link.
 * convertedAt is set when the referred user makes a purchase or subscribes.
 */
export const referrals = pgTable(
	"referrals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		affiliateCodeId: uuid("affiliate_code_id")
			.notNull()
			.references(() => affiliateCodes.id, { onDelete: "restrict" }),
		// Null until the visitor creates an account
		referredUserId: text("referred_user_id")
			.references(() => user.id, { onDelete: "set null" }),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		clickedAt: timestamp("clicked_at").defaultNow().notNull(),
		convertedAt: timestamp("converted_at"),
		// The purchase or subscription that triggered the conversion
		purchaseId: uuid("purchase_id")
			.references(() => purchases.id, { onDelete: "set null" }),
	},
	(t) => [
		index("referrals_affiliate_code_idx").on(t.affiliateCodeId),
		index("referrals_referred_user_idx").on(t.referredUserId),
		index("referrals_converted_at_idx").on(t.convertedAt),
	],
);

/**
 * Commission payouts owed to affiliates.
 * Created when a referral converts; marked paid after bank transfer / Stripe payout.
 */
export const commissions = pgTable(
	"commissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		affiliateCodeId: uuid("affiliate_code_id")
			.notNull()
			.references(() => affiliateCodes.id, { onDelete: "restrict" }),
		referralId: uuid("referral_id")
			.notNull()
			.references(() => referrals.id, { onDelete: "restrict" }),
		amountCents: integer("amount_cents").notNull(),
		currency: varchar("currency", { length: 10 }).notNull().default("usd"),
		status: commissionStatusEnum("status").notNull().default("pending"),
		paidAt: timestamp("paid_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("commissions_affiliate_code_idx").on(t.affiliateCodeId),
		index("commissions_status_idx").on(t.status),
	],
);

// =============================================================================
// Phase D — Bundles
// =============================================================================

/**
 * A bundle groups products and/or courses at a discount.
 * It can optionally grant a subscription tier.
 */
export const bundles = pgTable(
	"bundles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		coverImageUrl: text("cover_image_url"),
		priceCents: integer("price_cents").notNull(),
		// Shown crossed-out to highlight the discount
		compareAtPriceCents: integer("compare_at_price_cents"),
		currency: varchar("currency", { length: 10 }).notNull().default("usd"),
		stripePriceId: text("stripe_price_id"),
		polarProductId: text("polar_product_id"),
		// If true, purchasing this bundle activates a subscription plan
		grantsSubscription: boolean("grants_subscription").notNull().default(false),
		subscriptionPlanId: text("subscription_plan_id"), // "pro" | "enterprise"
		// Subscription duration in days when granted via bundle (null = forever)
		subscriptionDurationDays: integer("subscription_duration_days"),
		isActive: boolean("is_active").notNull().default(true),
		// Optional expiry for limited-time offers
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
	},
	(t) => [
		index("bundles_slug_idx").on(t.slug),
		index("bundles_is_active_idx").on(t.isActive),
	],
);

/**
 * The products and courses included in each bundle.
 */
export const bundleItems = pgTable(
	"bundle_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		bundleId: uuid("bundle_id")
			.notNull()
			.references(() => bundles.id, { onDelete: "cascade" }),
		// Either productId or courseId must be set, not both
		productId: uuid("product_id")
			.references(() => products.id, { onDelete: "cascade" }),
		courseId: uuid("course_id")
			.references(() => courses.id, { onDelete: "cascade" }),
	},
	(t) => [
		index("bundle_items_bundle_id_idx").on(t.bundleId),
	],
);

// =============================================================================
// Metered Free Reads (billing.schema extension — lives here for locality)
// =============================================================================

/**
 * Tracks premium article reads for free users.
 * Free users get FREE_READS_PER_MONTH reads per calendar month.
 * The unique index on (userId, postId, periodStart) prevents double-counting.
 */
export const freeReads = pgTable(
	"free_reads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// postId references posts table — not imported here to avoid circular deps
		postId: uuid("post_id").notNull(),
		readAt: timestamp("read_at").defaultNow().notNull(),
		// First day of the calendar month (UTC) this read belongs to
		periodStart: timestamp("period_start").notNull(),
	},
	(t) => [
		index("free_reads_user_period_idx").on(t.userId, t.periodStart),
		uniqueIndex("free_reads_user_post_period_uidx").on(t.userId, t.postId, t.periodStart),
	],
);

// =============================================================================
// Relations
// =============================================================================

export const productsRelations = relations(products, ({ many }) => ({
	purchases: many(purchases),
	bundleItems: many(bundleItems),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
	user: one(user, { fields: [purchases.userId], references: [user.id] }),
	product: one(products, { fields: [purchases.productId], references: [products.id] }),
}));

export const downloadTokensRelations = relations(downloadTokens, ({ one }) => ({
	purchase: one(purchases, { fields: [downloadTokens.purchaseId], references: [purchases.id] }),
	user: one(user, { fields: [downloadTokens.userId], references: [user.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
	author: one(user, { fields: [courses.authorId], references: [user.id] }),
	lessons: many(lessons),
	enrollments: many(enrollments),
	bundleItems: many(bundleItems),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
	course: one(courses, { fields: [lessons.courseId], references: [courses.id] }),
	progress: many(lessonProgress),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
	user: one(user, { fields: [enrollments.userId], references: [user.id] }),
	course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
	purchase: one(purchases, { fields: [enrollments.purchaseId], references: [purchases.id] }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
	user: one(user, { fields: [lessonProgress.userId], references: [user.id] }),
	lesson: one(lessons, { fields: [lessonProgress.lessonId], references: [lessons.id] }),
}));

export const affiliateCodesRelations = relations(affiliateCodes, ({ one, many }) => ({
	user: one(user, { fields: [affiliateCodes.userId], references: [user.id] }),
	referrals: many(referrals),
	commissions: many(commissions),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
	affiliateCode: one(affiliateCodes, { fields: [referrals.affiliateCodeId], references: [affiliateCodes.id] }),
	referredUser: one(user, { fields: [referrals.referredUserId], references: [user.id] }),
	purchase: one(purchases, { fields: [referrals.purchaseId], references: [purchases.id] }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
	affiliateCode: one(affiliateCodes, { fields: [commissions.affiliateCodeId], references: [affiliateCodes.id] }),
	referral: one(referrals, { fields: [commissions.referralId], references: [referrals.id] }),
}));

export const bundlesRelations = relations(bundles, ({ many }) => ({
	items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
	bundle: one(bundles, { fields: [bundleItems.bundleId], references: [bundles.id] }),
	product: one(products, { fields: [bundleItems.productId], references: [products.id] }),
	course: one(courses, { fields: [bundleItems.courseId], references: [courses.id] }),
}));
