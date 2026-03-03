import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { STORAGE_API, STORAGE_PATHS, type StoragePath } from "@/constants";
import { env } from "@/env/server";
import { withBasePath } from "@/lib/url/with-base-path";
import { db } from "@/lib/db";
import { file, user } from "@/lib/db/schema";
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
// Path Generation
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
	// subpath (e.g. /template behind Traefik), we must prefix them.
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
 * Upload a file to storage
 */
export async function uploadFile(
	input: UploadFileInput,
): Promise<UploadFileResult> {
	const { file: fileBuffer, filename, mimeType, userId, category } = input;
	const storage = getStorage();

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
 * Delete a file by ID
 */
export async function deleteFile(
	fileId: string,
	userId: string,
): Promise<DeleteResult> {
	const storage = getStorage();

	// Get file record
	const [userFile] = await db
		.select()
		.from(file)
		.where(and(eq(file.id, fileId), eq(file.userId, userId)))
		.limit(1);

	if (!userFile) {
		throw new Error("File not found");
	}

	// Delete from storage
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

	// Delete from database
	await db.delete(file).where(eq(file.id, fileId));

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
