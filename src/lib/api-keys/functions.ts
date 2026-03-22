import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { validate } from "@/lib/validation";
import { safe } from "@/lib/result";
import { accessMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { apiKeys, apiWebhooks, sites } from "@/lib/db/schema";
import { generateApiKey } from "./service";

// ── Schemas ─────────────────────────────────────────────────────────────────

const CreateApiKeySchema = z.object({
	name: z.string().min(1).max(255),
	siteId: z.string().uuid(),
	rateLimitRpm: z.number().int().min(1).max(10000).optional().default(60),
	allowedOrigins: z.array(z.string().url()).optional(),
	expiresAt: z.string().datetime().optional(),
});

const ListApiKeysSchema = z.object({
	page: z.number().int().min(1).optional().default(1),
	limit: z.number().int().min(1).max(100).optional().default(20),
});

const KeyIdSchema = z.object({
	id: z.string().uuid(),
});

const UpsertWebhookSchema = z.object({
	apiKeyId: z.string().uuid(),
	url: z.string().url(),
	events: z.array(z.string()).min(1).optional(),
});

// ── Server Functions ────────────────────────────────────────────────────────

export const $createApiKey = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateApiKeySchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data, context }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const input = data.data;

			// Verify site exists
			const [site] = await db
				.select({ id: sites.id })
				.from(sites)
				.where(eq(sites.id, input.siteId))
				.limit(1);
			if (!site) throw { status: 404, message: "Site not found" };

			const { raw, hash, prefix } = generateApiKey();

			const [inserted] = await db
				.insert(apiKeys)
				.values({
					name: input.name,
					keyHash: hash,
					keyPrefix: prefix,
					siteId: input.siteId,
					createdBy: (context as any).user.id,
					rateLimitRpm: input.rateLimitRpm,
					allowedOrigins: input.allowedOrigins ?? null,
					expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
				})
				.returning();

			return {
				...inserted,
				rawKey: raw, // shown only once
			};
		});
	});

export const $listApiKeys = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ListApiKeysSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { page, limit } = data.data;
			const offset = (page - 1) * limit;

			const [{ count }] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(apiKeys);

			const rows = await db
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					keyPrefix: apiKeys.keyPrefix,
					siteId: apiKeys.siteId,
					siteName: sites.name,
					rateLimitRpm: apiKeys.rateLimitRpm,
					allowedOrigins: apiKeys.allowedOrigins,
					lastUsedAt: apiKeys.lastUsedAt,
					expiresAt: apiKeys.expiresAt,
					revokedAt: apiKeys.revokedAt,
					createdAt: apiKeys.createdAt,
				})
				.from(apiKeys)
				.innerJoin(sites, eq(apiKeys.siteId, sites.id))
				.orderBy(desc(apiKeys.createdAt))
				.limit(limit)
				.offset(offset);

			return {
				items: rows,
				total: count,
				page,
				limit,
				totalPages: Math.ceil(count / limit),
			};
		});
	});

export const $getApiKey = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(KeyIdSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const [row] = await db
				.select({
					key: apiKeys,
					siteName: sites.name,
					siteSlug: sites.slug,
				})
				.from(apiKeys)
				.innerJoin(sites, eq(apiKeys.siteId, sites.id))
				.where(eq(apiKeys.id, data.data.id))
				.limit(1);

			if (!row) throw { status: 404, message: "API key not found" };

			// Get webhooks for this key
			const webhooks = await db
				.select()
				.from(apiWebhooks)
				.where(eq(apiWebhooks.apiKeyId, data.data.id));

			return {
				...row.key,
				siteName: row.siteName,
				siteSlug: row.siteSlug,
				webhooks,
			};
		});
	});

export const $revokeApiKey = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(KeyIdSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const [updated] = await db
				.update(apiKeys)
				.set({ revokedAt: new Date() })
				.where(and(eq(apiKeys.id, data.data.id), isNull(apiKeys.revokedAt)))
				.returning({ id: apiKeys.id });

			if (!updated) throw { status: 404, message: "API key not found or already revoked" };
			return { revoked: true };
		});
	});

export const $rotateApiKey = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(KeyIdSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { raw, hash, prefix } = generateApiKey();

			const [updated] = await db
				.update(apiKeys)
				.set({ keyHash: hash, keyPrefix: prefix })
				.where(and(eq(apiKeys.id, data.data.id), isNull(apiKeys.revokedAt)))
				.returning({ id: apiKeys.id });

			if (!updated) throw { status: 404, message: "API key not found or revoked" };
			return { rawKey: raw }; // shown only once
		});
	});

export const $upsertWebhook = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertWebhookSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const input = data.data;

			// Generate HMAC secret
			const { randomBytes } = await import("node:crypto");
			const secret = randomBytes(32).toString("hex");

			const [webhook] = await db
				.insert(apiWebhooks)
				.values({
					apiKeyId: input.apiKeyId,
					url: input.url,
					secret,
					events: input.events ?? ["post.published", "post.updated", "post.deleted"],
				})
				.onConflictDoNothing()
				.returning();

			return { ...webhook, secret }; // secret shown only once
		});
	});
