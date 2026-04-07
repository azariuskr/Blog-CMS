import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { STORAGE_PATHS, VALID_UPLOAD_PREFIXES } from "@/constants";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { storageQuota, user as userTable } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage/client";
import {
	isAllowedImageSize,
	isAllowedImageType,
	processAvatar,
	processImage,
	IMAGE_PRESETS,
} from "@/lib/storage/image-processing";
import { getPublicUrl, getUserStorageLimit } from "@/lib/storage/service";

export const Route = createFileRoute("/api/storage/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// ---------------------------------------------------------------
				// 1. Authentication
				// ---------------------------------------------------------------
				const session = await auth.api.getSession({ headers: request.headers });
				const sessionUser = session?.user;
				if (!sessionUser) {
					return new Response("Unauthorized", { status: 401 });
				}

				// ---------------------------------------------------------------
				// 2. Parse form data
				// ---------------------------------------------------------------
				const formData = await request.formData();
				const storagePath = formData.get("storagePath");
				const uploadedFile = formData.get("file");
				const contentType = formData.get("contentType");

				if (typeof storagePath !== "string" || !storagePath.length) {
					return new Response("Missing storagePath", { status: 400 });
				}
				if (!(uploadedFile instanceof File)) {
					return new Response("Missing file", { status: 400 });
				}

				// ---------------------------------------------------------------
				// 3. Validate path structure: {category}/{userId}/...
				// ---------------------------------------------------------------
				const pathParts = storagePath.split("/");
				const category = pathParts[0];
				const pathUserId = pathParts[1];

				const isValidCategory = (
					value: string,
				): value is (typeof VALID_UPLOAD_PREFIXES)[number] =>
					(VALID_UPLOAD_PREFIXES as readonly string[]).includes(value);

				if (!isValidCategory(category)) {
					return new Response(`Invalid storage category: ${category}`, { status: 400 });
				}

				if (pathUserId !== sessionUser.id) {
					return new Response("Invalid storagePath - user mismatch", { status: 403 });
				}

				// ---------------------------------------------------------------
				// 4. Role-based category access
				//    Regular users (role = "user") may only upload avatars.
				//    Media / attachment / document require author role or above.
				// ---------------------------------------------------------------
				const [userRecord] = await db
					.select({ role: userTable.role, subscriptionStatus: userTable.subscriptionStatus })
					.from(userTable)
					.where(eq(userTable.id, sessionUser.id))
					.limit(1);

				const role = userRecord?.role ?? "user";
				const subscriptionStatus = userRecord?.subscriptionStatus ?? false;

				const MEDIA_CATEGORIES = [STORAGE_PATHS.MEDIA, STORAGE_PATHS.ATTACHMENT, STORAGE_PATHS.DOCUMENT];
				if (MEDIA_CATEGORIES.includes(category as any) && role === "user") {
					return new Response("Media uploads require an author account or higher.", { status: 403 });
				}

				// ---------------------------------------------------------------
				// 5. Quota enforcement (server-side, cannot be bypassed)
				// ---------------------------------------------------------------
				const rawBuffer = Buffer.from(new Uint8Array(await uploadedFile.arrayBuffer()));
				const incomingBytes = rawBuffer.length;
				const limitBytes = getUserStorageLimit(role, subscriptionStatus);

				if (limitBytes !== null) {
					// Get current usage (or 0 if no record yet)
					const [quotaRow] = await db
						.select({ usedBytes: storageQuota.usedBytes })
						.from(storageQuota)
						.where(
							and(
								eq(storageQuota.ownerType, "user"),
								eq(storageQuota.ownerId, sessionUser.id),
							),
						)
						.limit(1);

					const usedBytes = Number(quotaRow?.usedBytes ?? 0);

					if (usedBytes + incomingBytes > limitBytes) {
						const usedMb = (usedBytes / 1024 / 1024).toFixed(1);
						const limitMb = limitBytes >= 1024 * 1024 * 1024
							? `${(limitBytes / 1024 / 1024 / 1024).toFixed(0)}GB`
							: `${(limitBytes / 1024 / 1024).toFixed(0)}MB`;
						return new Response(
							`Storage quota exceeded: ${usedMb} MB used of ${limitMb} limit`,
							{ status: 413 },
						);
					}
				}

				// ---------------------------------------------------------------
				// 6. Process image (Sharp optimisation / format conversion)
				// ---------------------------------------------------------------
				const mimeType = typeof contentType === "string" ? contentType : uploadedFile.type;
				let buffer = rawBuffer;
				let finalMimeType = mimeType;
				let finalPath = storagePath;

				if (category === STORAGE_PATHS.AVATAR && mimeType.startsWith("image/")) {
					if (!isAllowedImageType(mimeType)) {
						return new Response("Invalid image type for avatar", { status: 400 });
					}
					if (!isAllowedImageSize(buffer.length)) {
						return new Response("Image too large for avatar", { status: 400 });
					}
					const processed = await processAvatar(buffer);
					buffer = Buffer.from(processed.buffer);
					finalMimeType = processed.mimeType;
					finalPath = storagePath.replace(/\.\w+$/, ".webp");
				}

				if (
					(category === STORAGE_PATHS.MEDIA || category === STORAGE_PATHS.ATTACHMENT) &&
					mimeType.startsWith("image/")
				) {
					if (!isAllowedImageType(mimeType)) {
						return new Response("Invalid image type", { status: 400 });
					}
					const processed = await processImage(buffer, IMAGE_PRESETS.optimized);
					buffer = Buffer.from(processed.buffer);
					finalMimeType = processed.mimeType;
					finalPath = storagePath.replace(/\.\w+$/, ".webp");
				}

				// ---------------------------------------------------------------
				// 7. Upload to storage backend
				// ---------------------------------------------------------------
				const storage = getStorage();
				await storage.upload(finalPath, buffer, finalMimeType);

				const finalSizeBytes = buffer.length;

				// ---------------------------------------------------------------
				// 8. Update quota usage (best-effort, non-blocking)
				//    File DB record is created by $completeFileUpload / $completeAvatarUpload
				//    after the client confirms the upload. We only track quota here.
				// ---------------------------------------------------------------
				db.insert(storageQuota)
					.values({
						ownerType: "user",
						ownerId: sessionUser.id,
						usedBytes: finalSizeBytes,
						limitBytes: limitBytes ?? 10 * 1024 * 1024 * 1024,
						fileCount: 1,
					})
					.onConflictDoUpdate({
						target: [storageQuota.ownerType, storageQuota.ownerId],
						set: {
							usedBytes: sql`GREATEST(0, ${storageQuota.usedBytes} + ${finalSizeBytes})`,
							fileCount: sql`GREATEST(0, ${storageQuota.fileCount} + 1)`,
							limitBytes: limitBytes ?? sql`${storageQuota.limitBytes}`,
							updatedAt: new Date(),
						},
					})
					.catch((err) => console.error("[upload] quota update failed:", err));

				// ---------------------------------------------------------------
				// 9. Return result
				// ---------------------------------------------------------------
				const etag = crypto.createHash("md5").update(buffer).digest("hex");

				return Response.json({
					ok: true,
					storagePath: finalPath,
					contentType: finalMimeType,
					sizeBytes: finalSizeBytes,
					etag,
				});
			},
		},
	},
});
