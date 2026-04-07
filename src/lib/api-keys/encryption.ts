import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env/server";

const ALGO = "aes-256-gcm";

/**
 * Encrypt a raw API key for persistent storage.
 * Format: iv(24 hex chars) + authTag(32 hex chars) + ciphertext(hex)
 */
export function encryptKey(raw: string): string {
	const key = Buffer.from(env.API_KEY_ENCRYPTION_SECRET, "hex"); // 32 bytes = 64 hex chars
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALGO, key, iv);
	const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

/**
 * Decrypt a stored encrypted API key back to the raw value.
 */
export function decryptKey(stored: string): string {
	const key = Buffer.from(env.API_KEY_ENCRYPTION_SECRET, "hex");
	const iv = Buffer.from(stored.slice(0, 24), "hex");
	const tag = Buffer.from(stored.slice(24, 56), "hex");
	const ciphertext = Buffer.from(stored.slice(56), "hex");
	const decipher = createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
