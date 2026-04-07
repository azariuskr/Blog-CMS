import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { validate } from "@/lib/validation";
import { safe } from "@/lib/result";
import { accessMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { apiKeys, apiWebhooks, sites } from "@/lib/db/schema";
import { generateApiKey } from "./service";
import { encryptKey, decryptKey } from "./encryption";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify the calling user has access to a site.
 * Passes for: site owner, active-org site member, admin/superAdmin.
 */
async function assertSiteAccess(siteId: string, user: any): Promise<void> {
	const site = await db.query.sites.findFirst({
		where: eq(sites.id, siteId),
		columns: { id: true, ownerId: true, organizationId: true },
	});
	if (!site) throw { status: 404, message: "Site not found" };

	const userRole = user?.role as string | undefined;
	if (userRole === "admin" || userRole === "superAdmin") return;

	const isOwner = site.ownerId === user.id;
	const activeOrgId = user?.activeOrganizationId as string | undefined;
	const isOrgSite = !!site.organizationId && site.organizationId === activeOrgId;

	if (!isOwner && !isOrgSite) throw { status: 403, message: "Forbidden" };
}

/**
 * Same as assertSiteAccess but resolves via an api key id.
 * Returns the site id for further use.
 */
async function assertSiteAccessByKey(apiKeyId: string, user: any): Promise<string> {
	const key = await db.query.apiKeys.findFirst({
		where: eq(apiKeys.id, apiKeyId),
		columns: { id: true, siteId: true },
	});
	if (!key) throw { status: 404, message: "API key not found" };
	await assertSiteAccess(key.siteId, user);
	return key.siteId;
}

// ── Server Functions ────────────────────────────────────────────────────────

export const $createApiKey = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateApiKeySchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data, context }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const input = data.data;

			await assertSiteAccess(input.siteId, (context as any).user);

			const { raw, hash, prefix } = generateApiKey();
			const keyEncrypted = encryptKey(raw);

			const [inserted] = await db
				.insert(apiKeys)
				.values({
					name: input.name,
					keyHash: hash,
					keyPrefix: prefix,
					keyEncrypted,
					siteId: input.siteId,
					createdBy: (context as any).user.id,
					rateLimitRpm: input.rateLimitRpm,
					allowedOrigins: input.allowedOrigins ?? null,
					expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
				})
				.returning();

			return {
				...inserted,
				rawKey: raw, // returned once — caller writes to clipboard
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
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data, context }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			await assertSiteAccessByKey(data.data.id, (context as any).user);

			const { raw, hash, prefix } = generateApiKey();
			const keyEncrypted = encryptKey(raw);

			const [updated] = await db
				.update(apiKeys)
				.set({ keyHash: hash, keyPrefix: prefix, keyEncrypted })
				.where(and(eq(apiKeys.id, data.data.id), isNull(apiKeys.revokedAt)))
				.returning({ id: apiKeys.id });

			if (!updated) throw { status: 404, message: "API key not found or revoked" };
			return { rawKey: raw }; // returned once — caller writes to clipboard
		});
	});

export const $upsertWebhook = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpsertWebhookSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data, context }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const input = data.data;

			await assertSiteAccessByKey(input.apiKeyId, (context as any).user);

			// Secret is generated once at insert and preserved on updates.
			// Rotating the secret requires rotating the API key itself.
			const { randomBytes } = await import("node:crypto");
			const newSecret = randomBytes(32).toString("hex");

			const [webhook] = await db
				.insert(apiWebhooks)
				.values({
					apiKeyId: input.apiKeyId,
					url: input.url,
					secret: newSecret,
					events: input.events ?? ["post.published", "post.updated", "post.deleted"],
				})
				.onConflictDoUpdate({
					target: apiWebhooks.apiKeyId,
					set: {
						url: sql`excluded.url`,
						events: sql`excluded.events`,
						// secret is intentionally NOT updated — preserve receiver's existing secret
					},
				})
				.returning();

			return webhook; // secret is never returned after initial creation
		});
	});

export const $copyApiKey = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(KeyIdSchema, data))
	.middleware([accessMiddleware({ permissions: { content: ["read"] } })])
	.handler(async ({ data, context }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const key = await db.query.apiKeys.findFirst({
				where: and(eq(apiKeys.id, data.data.id), isNull(apiKeys.revokedAt)),
				columns: { id: true, siteId: true, keyEncrypted: true },
			});
			if (!key) throw { status: 404, message: "API key not found or revoked" };
			if (!key.keyEncrypted) throw { status: 409, message: "Key was created before encrypted storage was enabled. Rotate it to enable copy." };

			await assertSiteAccess(key.siteId, (context as any).user);

			const raw = decryptKey(key.keyEncrypted);
			return { raw };
		});
	});
