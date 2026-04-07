import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { PAGINATION, ROLES, STORAGE_API, STORAGE_PATHS } from "@/constants";
import { accessMiddleware, authMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { file, storageQuota, user as userTable } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/server";
import type { HttpError, Result } from "@/lib/result";
import { safe } from "@/lib/result";
import {
	ALLOWED_TYPES,
	type FileCategory,
	MAX_FILE_SIZE,
} from "@/lib/storage/types";
import { getStoragePathForCategory } from "@/lib/storage/utils";
import {
	deleteAvatar as deleteAvatarService,
	deleteFile as deleteFileService,
	generateStoragePath,
	getAdminDownloadUrl as getAdminDownloadUrlService,
	getDownloadUrl as getDownloadUrlService,
	getPublicUrl,
	getUserStorageLimit,
} from "./service";

// ============================================================================
// Schemas
// ============================================================================

const fileIdSchema = z.object({
	fileId: z.string().min(1, "File ID is required"),
});

const createAvatarUploadSchema = z.object({
	filename: z.string().min(1),
	contentType: z.string().min(1),
	fileSize: z.number().positive(),
});

const completeAvatarUploadSchema = z.object({
	storagePath: z.string().min(1),
	originalName: z.string().min(1),
	mimeType: z.string().min(1),
	sizeBytes: z.number().positive(),
});

const createFileUploadSchema = z.object({
	category: z.enum(["attachment", "document", "media"]),
	filename: z.string().min(1),
	contentType: z.string().min(1),
	fileSize: z.number().positive(),
});

const completeFileUploadSchema = z.object({
	category: z.enum(["attachment", "document", "media"]),
	storagePath: z.string().min(1),
	originalName: z.string().min(1),
	mimeType: z.string().min(1),
	sizeBytes: z.number().positive(),
});

const listUserFilesSchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(PAGINATION.MAX_LIMIT)
		.optional(),
});

// ============================================================================
// Avatar Server Functions
// ============================================================================

/**
 * Create avatar upload path (step 1 of upload flow)
 * Returns the path where the file should be uploaded
 */
export const $createAvatarUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createAvatarUploadSchema.parse(data))
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const { filename } = data;
		const userId = context.user.id;

		const storagePath = generateStoragePath(
			STORAGE_PATHS.AVATAR,
			userId,
			filename,
		);

		return {
			uploadUrl: STORAGE_API.UPLOAD,
			storagePath,
			fileId: storagePath.split("/").pop()?.split("-")[1] || "",
			expiresAt: new Date(Date.now() + 3600_000),
		};
	});

/**
 * Complete avatar upload (step 3 of upload flow)
 * Called after file is uploaded to storage, creates DB record
 */
export const $completeAvatarUpload = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => completeAvatarUploadSchema.parse(data))
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const { storagePath, originalName, mimeType, sizeBytes } = data;
		const userId = context.user.id;

		// Note: The actual processing happens in the upload route
		// This just verifies and creates the DB record
		const { fileExists } = await import("./service");
		const exists = await fileExists(storagePath);
		if (!exists) {
			throw new Error("Avatar file not found in storage");
		}

		// Create file record
		const [newFile] = await db
			.insert(file)
			.values({
				userId,
				filename: storagePath.split("/").pop() || storagePath,
				originalName,
				mimeType,
				sizeBytes,
				storagePath,
				storageUrl: getPublicUrl(storagePath),
				isPublic: false,
				metadata: JSON.stringify({
					category: "avatar",
					processedAt: new Date().toISOString(),
				}),
			})
			.returning();

		// Update user record
		const { user } = await import("@/lib/db/schema");
		const now = new Date();
		// App is hosted behind a basepath (e.g. /blog). Ensure returned URLs include it.
		const { env } = await import("@/env/server");
		const { withBasePath } = await import("@/lib/url/with-base-path");
		const imageUrl = withBasePath(
			env.VITE_BASE_URL,
			`${STORAGE_API.AVATAR(userId)}?v=${now.getTime()}`,
		);

		// Get old avatar paths for cleanup
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
		].filter((p) => p && p !== storagePath) as string[];

		await db
			.update(user)
			.set({
				avatarPath: storagePath,
				avatarUpdatedAt: now,
				image: imageUrl,
			})
			.where(eq(user.id, userId));

		// Cleanup old avatars
		if (oldPaths.length > 0) {
			const { getStorage } = await import("./client");
			const storage = getStorage();
			for (const oldPath of oldPaths) {
				storage.delete(oldPath).catch((err) =>
					console.error(`Failed to delete old avatar from storage: ${oldPath}`, err)
				);
				db.delete(file)
					.where(eq(file.storagePath, oldPath))
					.catch((err) =>
						console.error(`Failed to delete old avatar record: ${oldPath}`, err)
					);
			}
		}

		return {
			fileId: newFile.id,
			storagePath,
			imageUrl,
		};
	});

/**
 * Delete user's avatar
 */
export const $deleteAvatar = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return deleteAvatarService(context.user.id);
	});

// ============================================================================
// Generic File Server Functions
// ============================================================================

/**
 * Create a generic file upload path (step 1 of upload flow)
 * Returns the path where the file should be uploaded.
 */
export const $createFileUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createFileUploadSchema.parse(data))
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const { category, filename, contentType, fileSize } = data;
		const userId = context.user.id;

		// Server-side validation (don't rely on client)
		const allowedTypes = ALLOWED_TYPES[category] as readonly string[];
		const maxSize = MAX_FILE_SIZE[category];

		if (!allowedTypes.includes(contentType)) {
			throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
		}
		if (fileSize > maxSize) {
			throw new Error(`File too large. Maximum size: ${maxSize}`);
		}

		const prefix = getStoragePathForCategory(category as FileCategory);
		if (!prefix) {
			throw new Error("Storage category misconfigured");
		}
		const storagePath = generateStoragePath(prefix, userId, filename);

		return {
			uploadUrl: STORAGE_API.UPLOAD,
			storagePath,
			fileId: storagePath.split("/").pop()?.split("-")[1]?.split(".")[0] || "",
			expiresAt: new Date(Date.now() + 3600_000),
		};
	});

/**
 * Complete a generic file upload (step 3 of upload flow)
 * Called after file is uploaded to storage, creates DB record.
 */
export const $completeFileUpload = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => completeFileUploadSchema.parse(data))
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const { category, storagePath, originalName, mimeType, sizeBytes } = data;
		const userId = context.user.id;

		// Validate storagePath ownership + expected prefix: {prefix}/{userId}/...
		const [prefix, pathUserId] = storagePath.split("/");
		const expectedPrefix = getStoragePathForCategory(category as FileCategory);

		if (prefix !== expectedPrefix) {
			throw new Error(`Invalid storagePath category: ${prefix}`);
		}
		if (pathUserId !== userId) {
			throw new Error("Invalid storagePath - user mismatch");
		}

		const { fileExists, getPublicUrl } = await import("./service");
		const exists = await fileExists(storagePath);
		if (!exists) {
			throw new Error("File not found in storage");
		}

		const [newFile] = await db
			.insert(file)
			.values({
				userId,
				filename: storagePath.split("/").pop() || storagePath,
				originalName,
				mimeType,
				sizeBytes,
				storagePath,
				storageUrl: getPublicUrl(storagePath),
				isPublic: false,
				metadata: JSON.stringify({
					category,
					uploadedAt: new Date().toISOString(),
				}),
			})
			.returning();

		return {
			fileId: newFile.id,
			storagePath: newFile.storagePath,
			storageUrl: newFile.storageUrl,
		};
	});

/**
 * Get download URL for a file
 */
export const $getDownloadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => fileIdSchema.parse(data))
	.middleware([authMiddleware])
	.handler(
		async ({
			data,
			context,
		}): Promise<Result<{ url: string; expiresAt: Date }, HttpError>> => {
			return safe(() => getDownloadUrlService(data.fileId, context.user.id), {
				errorMessage: "Failed to get download URL",
			});
		},
	);

/**
 * List user's files
 */
export const $getUserFilesPaginated = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => listUserFilesSchema.parse(data))
	.middleware([authMiddleware])
	.handler(async ({ context, data }) => {
		const userId = context.user.id;

		const page = Math.max(1, data.page ?? PAGINATION.DEFAULT_PAGE);
		const limit = Math.min(
			PAGINATION.MAX_LIMIT,
			Math.max(1, data.limit ?? PAGINATION.DEFAULT_LIMIT),
		);
		const offset = (page - 1) * limit;

		const [{ total = 0 } = {}] = await db
			.select({ total: count() })
			.from(file)
			.where(eq(file.userId, userId));

		const files = await db
			.select()
			.from(file)
			.where(eq(file.userId, userId))
			.orderBy(desc(file.createdAt))
			.limit(limit)
			.offset(offset);

		return {
			ok: true as const,
			data: {
				items: files.map((f) => ({
					id: f.id,
					filename: f.filename,
					originalName: f.originalName,
					mimeType: f.mimeType,
					sizeBytes: f.sizeBytes,
					storageUrl: f.storageUrl,
					isPublic: f.isPublic,
					createdAt: f.createdAt,
					updatedAt: f.updatedAt,
					metadata: f.metadata ? JSON.parse(f.metadata) : null,
				})),
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	});

/**
 * Delete a file
 */
export const $deleteFile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => fileIdSchema.parse(data))
	.middleware([authMiddleware])
	.handler(
		async ({
			data,
			context,
		}): Promise<Result<{ success: boolean }, HttpError>> => {
			return safe(() => deleteFileService(data.fileId, context.user.id), {
				successMessage: "File deleted successfully",
				errorMessage: "Failed to delete file",
			});
		},
	);

// ============================================================================
// Admin Storage Functions
// ============================================================================

const adminListFilesSchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(PAGINATION.MAX_LIMIT)
		.optional(),
	category: z.enum(["all", "avatar", "media", "document", "attachment"]).optional(),
	search: z.string().optional(),
	userId: z.string().optional(), // filter to a specific user's files
});

const adminGetDownloadUrlSchema = z.object({
	fileId: z.string().min(1, "File ID is required"),
	expiresIn: z.coerce.number().int().positive().max(24 * 3600).optional(),
});

/**
 * Admin: List all files across all users, with category filtering
 */
export const $adminGetFiles = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => adminListFilesSchema.parse(data))
	.middleware([accessMiddleware({ minRole: ROLES.ADMIN })])
	.handler(async ({ data }) => {
		const page = Math.max(1, data.page ?? PAGINATION.DEFAULT_PAGE);
		const limit = Math.min(
			PAGINATION.MAX_LIMIT,
			Math.max(1, data.limit ?? PAGINATION.DEFAULT_LIMIT),
		);
		const offset = (page - 1) * limit;

		const conditions = [];

		// Category filter via metadata JSON
		if (data.category && data.category !== "all") {
			conditions.push(
				sql`${file.metadata}::jsonb->>'category' = ${data.category}`,
			);
		}

		// Filter to specific user
		if (data.userId) {
			conditions.push(eq(file.userId, data.userId));
		}

		// Search by filename
		if (data.search) {
			conditions.push(
				or(
					ilike(file.originalName, `%${data.search}%`),
					ilike(file.filename, `%${data.search}%`),
				)!,
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const [{ total = 0 } = {}] = await db
			.select({ total: count() })
			.from(file)
			.where(whereClause);

		const files = await db
			.select()
			.from(file)
			.where(whereClause)
			.orderBy(desc(file.createdAt))
			.limit(limit)
			.offset(offset);

		return {
			ok: true as const,
			data: {
				items: files.map((f) => ({
					id: f.id,
					userId: f.userId,
					filename: f.filename,
					originalName: f.originalName,
					mimeType: f.mimeType,
					sizeBytes: f.sizeBytes,
					storagePath: f.storagePath,
					storageUrl: f.storageUrl,
					isPublic: f.isPublic,
					createdAt: f.createdAt,
					updatedAt: f.updatedAt,
					metadata: f.metadata ? JSON.parse(f.metadata) : null,
				})),
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	});

/**
 * Admin: Delete any file (not just own)
 */
export const $adminDeleteFile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => fileIdSchema.parse(data))
	.middleware([accessMiddleware({ minRole: ROLES.ADMIN })])
	.handler(
		async ({ data }): Promise<Result<{ success: boolean }, HttpError>> => {
			return safe(async () => {
				const existing = await db.query.file.findFirst({
					where: eq(file.id, data.fileId),
				});
				if (!existing) throw { status: 404, message: "File not found" };

				// Delete from storage
				const { getStorage } = await import("./client");
				const storage = getStorage();
				await storage.delete(existing.storagePath).catch(() => {});

				// Delete DB record
				await db.delete(file).where(eq(file.id, data.fileId));

				return { success: true };
			}, {
				successMessage: "File deleted successfully",
				errorMessage: "Failed to delete file",
			});
		},
	);

/**
 * Admin: Generate presigned download URL for any file
 */
export const $adminGetDownloadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => adminGetDownloadUrlSchema.parse(data))
	.middleware([accessMiddleware({ minRole: ROLES.ADMIN })])
	.handler(async ({ data }) => {
		return safe(
			() => getAdminDownloadUrlService(data.fileId, data.expiresIn ?? 3600),
			{
				errorMessage: "Failed to generate download URL",
			},
		);
	});

// ============================================================================
// User quota — current user
// ============================================================================

/**
 * Get the current user's media quota info.
 * Returns used bytes, the effective limit (based on role + subscription),
 * file count, and a human-readable plan label.
 */
export const $getMyQuota = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return safe(async () => {
			const session = await getSession();
			const userId = session?.user?.id;
			if (!userId) throw new Error("Not authenticated");

			const [userRecord] = await db
				.select({ role: userTable.role, subscriptionStatus: userTable.subscriptionStatus })
				.from(userTable)
				.where(eq(userTable.id, userId))
				.limit(1);

			const role = userRecord?.role ?? "user";
			const subscriptionStatus = userRecord?.subscriptionStatus ?? false;
			const limitBytes = getUserStorageLimit(role, subscriptionStatus);

			const [quotaRow] = await db
				.select({ usedBytes: storageQuota.usedBytes, fileCount: storageQuota.fileCount })
				.from(storageQuota)
				.where(and(eq(storageQuota.ownerType, "user"), eq(storageQuota.ownerId, userId)))
				.limit(1);

			const usedBytes = Number(quotaRow?.usedBytes ?? 0);
			const fileCount = Number(quotaRow?.fileCount ?? 0);
			const percentUsed = limitBytes ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

			const planLabel =
				role === "admin" || role === "superAdmin" ? "Admin (Unlimited)" :
				role === "moderator" ? "Moderator (2 GB)" :
				subscriptionStatus ? "Pro (10 GB)" : "Free (100 MB)";

			return { usedBytes, limitBytes, fileCount, percentUsed, planLabel, role };
		});
	});

// ============================================================================
// Admin: users with quota summary (for admin user-picker)
// ============================================================================

/**
 * Admin: Get paginated list of users with their quota info.
 * Used by the admin media view user-picker.
 */
export const $getUsersWithQuota = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ minRole: ROLES.ADMIN })])
	.handler(async () => {
		return safe(async () => {
			const users = await db
				.select({
					id: userTable.id,
					name: userTable.name,
					email: userTable.email,
					image: userTable.image,
					role: userTable.role,
					subscriptionStatus: userTable.subscriptionStatus,
				})
				.from(userTable)
				.orderBy(userTable.name)
				.limit(200);

			// Fetch all quota rows in one query
			const quotaRows = await db
				.select()
				.from(storageQuota)
				.where(eq(storageQuota.ownerType, "user"));

			const quotaMap = new Map(quotaRows.map((q) => [q.ownerId, q]));

			return users.map((u) => {
				const quota = quotaMap.get(u.id);
				const usedBytes = Number(quota?.usedBytes ?? 0);
				const limitBytes = getUserStorageLimit(u.role, u.subscriptionStatus ?? false);
				const fileCount = Number(quota?.fileCount ?? 0);
				const percentUsed = limitBytes
					? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
					: 0;
				const planLabel =
					u.role === "admin" || u.role === "superAdmin" ? "Admin" :
					u.role === "moderator" ? "Moderator" :
					u.subscriptionStatus ? "Pro" : "Free";
				return { id: u.id, name: u.name, email: u.email, image: u.image, role: u.role, usedBytes, limitBytes, fileCount, percentUsed, planLabel };
			});
		});
	});
