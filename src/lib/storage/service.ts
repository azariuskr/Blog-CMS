import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { STORAGE_API, STORAGE_PATHS, type StoragePath } from "@/constants";
import { env } from "@/env/server";
import { withBasePath } from "@/lib/url/with-base-path";
import { db } from "@/lib/db";
import { file, storageQuota, user } from "@/lib/db/schema";
import {
	sendFileUploadedEvent,
	sendUserAvatarUploadedEvent,
} from "@/lib/inngest/events";
import { getStorage } from "./client";
import { getStorageConfig } from "./config";
import {
	isAllowedImageSize,
	isAllowedImageType,
	processAvatar,
} from "./image-processing";
import type { FileCategory } from "./types";
import { getStoragePathForCategory } from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface UploadAvatarInput {
	file: Buffer;
	filename: string;
	mimeType: string;
	userId: string;
}

export interface UploadAvatarResult {
	fileId: string;
	storagePath: string;
	imageUrl: string;
}

export interface UploadFileInput {
	file: Buffer;
	filename: string;
	mimeType: string;
	userId: string;
	category: FileCategory;
	/** Optional: org ID for org-shared assets */
	orgId?: string;
	/** Whether asset should be visible to all org members */
	isOrgShared?: boolean;
}

export interface UploadFileResult {
	fileId: string;
	storagePath: string;
	storageUrl: string;
	mimeType: string;
	sizeBytes: number;
}

export interface DeleteResult {
	success: boolean;
}

// ============================================================================
// Quota Management
// ============================================================================

/** Default quota limits by role (bytes) */
const ROLE_QUOTA_LIMITS: Record<string, number> = {
	admin: 10 * 1024 * 1024 * 1024,    // 10 GB
	editor: 2 * 1024 * 1024 * 1024,     // 2 GB
	author: 512 * 1024 * 1024,           // 512 MB
	user: 100 * 1024 * 1024,             // 100 MB
};

/** Get or create a quota record for a user or org */
async function getOrCreateQuota(ownerType: "user" | "org", ownerId: string): Promise<typeof storageQuota.$inferSelect> {
	const existing = await db
		.select()
		.from(storageQuota)
		.where(and(eq(storageQuota.ownerType, ownerType), eq(storageQuota.ownerId, ownerId)))
		.limit(1);

	if (existing[0]) return existing[0];

	const [created] = await db
		.insert(storageQuota)
		.values({ ownerType, ownerId })
		.onConflictDoNothing()
		.returning();

	if (created) return created;

	// Concurrent insert race — fetch again
	const [fetched] = await db
		.select()
		.from(storageQuota)
		.where(and(eq(storageQuota.ownerType, ownerType), eq(storageQuota.ownerId, ownerId)))
		.limit(1);
	return fetched;
}

/** Check whether an upload would exceed the quota; throws if it would */
export async function enforceQuota(userId: string, additionalBytes: number): Promise<void> {
	const quota = await getOrCreateQuota("user", userId);
	if (quota.usedBytes + additionalBytes > quota.limitBytes) {
		const usedMb = Math.round(quota.usedBytes / 1024 / 1024);
		const limitMb = Math.round(quota.limitBytes / 1024 / 1024);
		throw new Error(`Storage quota exceeded: ${usedMb} MB used of ${limitMb} MB limit`);
	}
}

/** Update quota after upload/delete */
async function adjustQuota(ownerType: "user" | "org", ownerId: string, deltaBytes: number, deltaCount: number): Promise<void> {
	await db
		.insert(storageQuota)
		.values({ ownerType, ownerId, usedBytes: Math.max(0, deltaBytes), fileCount: Math.max(0, deltaCount) })
		.onConflictDoUpdate({
			target: [storageQuota.ownerType, storageQuota.ownerId],
			set: {
				usedBytes: sql`GREATEST(0, ${storageQuota.usedBytes} + ${deltaBytes})`,
				fileCount: sql`GREATEST(0, ${storageQuota.fileCount} + ${deltaCount})`,
				updatedAt: new Date(),
			},
		});
}

/** Get quota info for a user */
export async function getUserQuota(userId: string): Promise<{ usedBytes: number; limitBytes: number; fileCount: number; percentUsed: number }> {
	const quota = await getOrCreateQuota("user", userId);
	return {
		usedBytes: quota.usedBytes,
		limitBytes: quota.limitBytes,
		fileCount: quota.fileCount,
		percentUsed: Math.round((quota.usedBytes / quota.limitBytes) * 100),
	};
}

/** Set a user's quota limit (admin operation) */
export async function setUserQuotaLimit(userId: string, limitBytes: number): Promise<void> {
	await db
		.insert(storageQuota)
		.values({ ownerType: "user", ownerId: userId, limitBytes })
		.onConflictDoUpdate({
			target: [storageQuota.ownerType, storageQuota.ownerId],
			set: { limitBytes, updatedAt: new Date() },
		});
}

/** Set quota limit based on user role */
export async function applyRoleQuota(userId: string, role: string): Promise<void> {
	const limitBytes = ROLE_QUOTA_LIMITS[role] ?? ROLE_QUOTA_LIMITS.user;
	await setUserQuotaLimit(userId, limitBytes);
}

// ============================================================================
// Deletion Safety
// ============================================================================

/** Check if a file's public URL is referenced in any post content or featured image */
async function isFileInUse(storageUrl: string): Promise<boolean> {
	const { posts } = await import("@/lib/db/schema");
	const refs = await db
		.select({ id: posts.id })
		.from(posts)
		.where(
			sql`(${posts.featuredImageUrl} = ${storageUrl} OR ${posts.content} LIKE ${"%" + storageUrl + "%"} OR ${posts.blocks}::text LIKE ${"%" + storageUrl + "%"})`
		)
		.limit(1);
	return refs.length > 0;
}

// ============================================================================
// Path Generation (existing — unchanged below)
// ============================================================================

/**
 * Generate a unique storage path for a file
 */
export function generateStoragePath(
	category: StoragePath,
	userId: string,
	filename: string,
): string {
	const fileId = crypto.randomBytes(16).toString("hex");
	const ext = filename.split(".").pop() || "";
	return `${category}/${userId}/${Date.now()}-${fileId}.${ext}`;
}

/**
 * Get the public URL for a storage key
 */
export function getPublicUrl(key: string): string {
	const config = getStorageConfig();

	// These are URL *paths* served by our app. When the app is hosted under a
	// subpath (e.g. /blog behind Traefik), we must prefix them.
	if (config.provider === "minio") {
		return withBasePath(env.VITE_BASE_URL, `${STORAGE_API.FILES}/${key}`);
	}

	return withBasePath(env.VITE_BASE_URL, `${config.local.publicUrlPrefix}/${key}`);
}

/**
 * Get the avatar URL for a user (with cache busting)
 */
export function getAvatarUrl(userId: string, timestamp?: Date): string {
	const ts = timestamp?.getTime() || Date.now();
	return withBasePath(env.VITE_BASE_URL, `${STORAGE_API.AVATAR(userId)}?v=${ts}`);
}

// ============================================================================
// Avatar Operations
// ============================================================================

/**
 * Upload and process an avatar image
 */
export async function uploadAvatar(
	input: UploadAvatarInput,
): Promise<UploadAvatarResult> {
	const { file: fileBuffer, filename, mimeType, userId } = input;
	const storage = getStorage();

	// Validate
	if (!isAllowedImageType(mimeType)) {
		throw new Error(`Invalid image type: ${mimeType}`);
	}
	if (!isAllowedImageSize(fileBuffer.length)) {
		throw new Error("Image too large");
	}

	// Get current avatar for cleanup later
	const [currentUser] = await db
		.select({
			avatarPath: user.avatarPath,
			avatarOriginalPath: user.avatarOriginalPath,
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	const oldPaths = [
		currentUser?.avatarPath,
		currentUser?.avatarOriginalPath,
	].filter(Boolean) as string[];

	// Process image
	const processed = await processAvatar(fileBuffer);

	// Generate path and upload
	const storagePath = generateStoragePath(
		STORAGE_PATHS.AVATAR,
		userId,
		filename,
	).replace(/\.\w+$/, ".webp"); // Ensure .webp extension

	await storage.upload(storagePath, processed.buffer, processed.mimeType);

	// Create file record
	const [newFile] = await db
		.insert(file)
		.values({
			userId,
			filename: storagePath.split("/").pop() || storagePath,
			originalName: filename,
			mimeType: processed.mimeType,
			sizeBytes: processed.buffer.length,
			storagePath,
			storageUrl: getPublicUrl(storagePath),
			isPublic: false,
			metadata: JSON.stringify({
				category: "avatar",
				processedAt: new Date().toISOString(),
				width: processed.width,
				height: processed.height,
			}),
		})
		.returning();

	// Update user record
	const now = new Date();
	const imageUrl = getAvatarUrl(userId, now);

	await db
		.update(user)
		.set({
			avatarPath: storagePath,
			avatarUpdatedAt: now,
			image: imageUrl,
		})
		.where(eq(user.id, userId));

	// Cleanup old avatars
	for (const oldPath of oldPaths) {
		if (oldPath !== storagePath) {
			await deleteStorageFile(oldPath, userId).catch((err) =>
				console.error(`Failed to delete old avatar: ${oldPath}`, err),
			);
		}
	}

	// Trigger async processing for additional sizes (optional)
	await sendUserAvatarUploadedEvent({
		userId,
		storagePath,
		contentType: processed.mimeType,
	}).catch((err) => console.error("Failed to send avatar event:", err));

	return {
		fileId: newFile.id,
		storagePath,
		imageUrl,
	};
}

/**
 * Delete user's avatar
 */
export async function deleteAvatar(userId: string): Promise<DeleteResult> {
	const storage = getStorage();

	// Get current avatar paths
	const [currentUser] = await db
		.select({
			avatarPath: user.avatarPath,
			avatarOriginalPath: user.avatarOriginalPath,
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (!currentUser?.avatarPath && !currentUser?.avatarOriginalPath) {
		return { success: true };
	}

	const pathsToDelete = [
		currentUser.avatarPath,
		currentUser.avatarOriginalPath,
	].filter(Boolean) as string[];

	// Delete from storage
	for (const path of pathsToDelete) {
		try {
			await storage.delete(path);
		} catch (error) {
			console.error(`Failed to delete avatar from storage: ${path}`, error);
		}
	}

	// Delete file records
	for (const path of pathsToDelete) {
		await db
			.delete(file)
			.where(and(eq(file.userId, userId), eq(file.storagePath, path)))
			.catch((err) => console.error(`Failed to delete file record: ${path}`, err));
	}

	// Clear user avatar fields
	await db
		.update(user)
		.set({
			avatarPath: null,
			avatarOriginalPath: null,
			avatarUpdatedAt: new Date(),
			image: null,
		})
		.where(eq(user.id, userId));

	return { success: true };
}

// ============================================================================
// Generic File Operations
// ============================================================================

/**
 * Upload a file to storage — with quota check and org scoping
 */
export async function uploadFile(
	input: UploadFileInput,
): Promise<UploadFileResult> {
	const { file: fileBuffer, filename, mimeType, userId, category, orgId, isOrgShared } = input;
	const storage = getStorage();

	// Enforce quota before uploading
	await enforceQuota(userId, fileBuffer.length);

	// Generate path
	const categoryPath = getStoragePathForCategory(category) as StoragePath;
	const storagePath = generateStoragePath(categoryPath, userId, filename);

	// Upload
	await storage.upload(storagePath, fileBuffer, mimeType);

	// Create file record
	const [newFile] = await db
		.insert(file)
		.values({
			userId,
			orgId: orgId ?? null,
			isOrgShared: isOrgShared ?? false,
			filename: storagePath.split("/").pop() || storagePath,
			originalName: filename,
			mimeType,
			sizeBytes: fileBuffer.length,
			storagePath,
			storageUrl: getPublicUrl(storagePath),
			isPublic: false,
			metadata: JSON.stringify({
				category,
				uploadedAt: new Date().toISOString(),
			}),
		})
		.returning();

	// Update quota
	await adjustQuota("user", userId, newFile.sizeBytes, 1).catch((err) =>
		console.error("Failed to update quota:", err),
	);
	if (orgId) {
		await adjustQuota("org", orgId, newFile.sizeBytes, 1).catch((err) =>
			console.error("Failed to update org quota:", err),
		);
	}

	await sendFileUploadedEvent({
		userId,
		fileId: newFile.id,
		key: storagePath,
		mimeType,
		category,
	}).catch((err) => console.error("Failed to send file uploaded event:", err));

	return {
		fileId: newFile.id,
		storagePath,
		storageUrl: newFile.storageUrl,
		mimeType: newFile.mimeType,
		sizeBytes: newFile.sizeBytes,
	};
}

/**
 * Delete a file by ID — with deletion safety check
 */
export async function deleteFile(
	fileId: string,
	userId: string,
	options?: { force?: boolean },
): Promise<DeleteResult> {
	const storage = getStorage();

	// Get file record (exclude soft-deleted)
	const [userFile] = await db
		.select()
		.from(file)
		.where(and(eq(file.id, fileId), eq(file.userId, userId), isNull(file.deletedAt)))
		.limit(1);

	if (!userFile) {
		throw new Error("File not found");
	}

	// Deletion safety: block if the file is referenced in content
	if (!options?.force) {
		const inUse = await isFileInUse(userFile.storageUrl);
		if (inUse) {
			throw new Error(
				"Cannot delete: this file is referenced in post content. Remove all references first or use force=true.",
			);
		}
	}

	// Soft-delete first (preserves audit trail)
	await db
		.update(file)
		.set({ deletedAt: new Date() })
		.where(eq(file.id, fileId));

	// Hard-delete from storage
	await storage.delete(userFile.storagePath);

	// Delete variants if they exist
	if (userFile.metadata) {
		try {
			const metadata = JSON.parse(userFile.metadata);
			if (metadata.variants) {
				await Promise.all(
					metadata.variants.map((v: { key: string }) =>
						storage.delete(v.key).catch((err) =>
							console.error(`Failed to delete variant: ${v.key}`, err)
						),
					),
				);
			}
		} catch {
			// Ignore metadata parse errors
		}
	}

	// Hard-delete DB record
	await db.delete(file).where(eq(file.id, fileId));

	// Update quota
	await adjustQuota("user", userId, -userFile.sizeBytes, -1).catch((err) =>
		console.error("Failed to update quota after delete:", err),
	);
	if (userFile.orgId) {
		await adjustQuota("org", userFile.orgId, -userFile.sizeBytes, -1).catch((err) =>
			console.error("Failed to update org quota after delete:", err),
		);
	}

	return { success: true };
}

/**
 * Delete a file by storage path (internal use)
 */
async function deleteStorageFile(
	storagePath: string,
	userId: string,
): Promise<void> {
	const storage = getStorage();

	try {
		await storage.delete(storagePath);
	} catch (error) {
		console.error(`Failed to delete file from storage: ${storagePath}`, error);
	}

	// Delete file record if exists
	await db
		.delete(file)
		.where(and(eq(file.userId, userId), eq(file.storagePath, storagePath)))
		.catch((err) => console.error(`Failed to delete file record: ${storagePath}`, err));
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(storagePath: string): Promise<boolean> {
	const storage = getStorage();
	return storage.exists(storagePath);
}

/**
 * Get a presigned download URL for a file
 */
export async function getDownloadUrl(
	fileId: string,
	userId: string,
	expiresIn = 3600,
): Promise<{ url: string; expiresAt: Date }> {
	const storage = getStorage();

	const [userFile] = await db
		.select()
		.from(file)
		.where(and(eq(file.id, fileId), eq(file.userId, userId)))
		.limit(1);

	if (!userFile) {
		throw new Error("File not found");
	}

	const url = await storage.getPresignedUrl(userFile.storagePath, expiresIn);

	return {
		url,
		expiresAt: new Date(Date.now() + expiresIn * 1000),
	};
}

/**
 * Admin: Get a presigned download URL for any file
 */
export async function getAdminDownloadUrl(
	fileId: string,
	expiresIn = 3600,
): Promise<{ url: string; expiresAt: Date }> {
	const storage = getStorage();

	const [storedFile] = await db
		.select()
		.from(file)
		.where(eq(file.id, fileId))
		.limit(1);

	if (!storedFile) {
		throw new Error("File not found");
	}

	const url = await storage.getPresignedUrl(storedFile.storagePath, expiresIn);

	return {
		url,
		expiresAt: new Date(Date.now() + expiresIn * 1000),
	};
}
