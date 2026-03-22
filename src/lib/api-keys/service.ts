import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, sites, type ApiKey } from "@/lib/db/schema";
import { Ok, unauthorized, type Result } from "@/lib/result";

const KEY_PREFIX = "bk_live_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
	const hex = randomBytes(32).toString("hex");
	const raw = `${KEY_PREFIX}${hex}`;
	const hash = hashApiKey(raw);
	return { raw, hash, prefix: KEY_PREFIX };
}

export function hashApiKey(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

export async function validateApiKey(
	raw: string,
): Promise<Result<ApiKey & { siteName: string }>> {
	const hash = hashApiKey(raw);

	const rows = await db
		.select({
			key: apiKeys,
			siteName: sites.name,
		})
		.from(apiKeys)
		.innerJoin(sites, eq(apiKeys.siteId, sites.id))
		.where(eq(apiKeys.keyHash, hash))
		.limit(1);

	if (rows.length === 0) {
		return unauthorized("Invalid API key");
	}

	const { key, siteName } = rows[0];

	if (key.revokedAt) {
		return unauthorized("API key has been revoked");
	}

	if (key.expiresAt && key.expiresAt < new Date()) {
		return unauthorized("API key has expired");
	}

	return Ok({ ...key, siteName });
}

export function resolveKeyFromRequest(request: Request): Result<string> {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return unauthorized("Missing or malformed Authorization header. Expected: Bearer <api_key>");
	}
	const raw = authHeader.slice(7).trim();
	if (!raw || !raw.startsWith(KEY_PREFIX)) {
		return unauthorized("Invalid API key format");
	}
	return Ok(raw);
}

export async function updateLastUsed(keyId: string): Promise<void> {
	try {
		await db
			.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, keyId));
	} catch {
		// fire-and-forget — do not block the request
	}
}
