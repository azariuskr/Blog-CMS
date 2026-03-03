import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { STORAGE_PATHS, VALID_UPLOAD_PREFIXES } from "@/constants";
import { auth } from "@/lib/auth/auth";
import { getStorage } from "@/lib/storage/client";
import {
	isAllowedImageSize,
	isAllowedImageType,
	processAvatar,
	processImage,
	IMAGE_PRESETS,
} from "@/lib/storage/image-processing";

export const Route = createFileRoute("/api/storage/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Auth check
				const session = await auth.api.getSession({
					headers: request.headers,
				});

				const user = session?.user;
				if (!user) {
					return new Response("Unauthorized", { status: 401 });
				}

				// Parse form data
				const formData = await request.formData();
				const storagePath = formData.get("storagePath");
				const uploadedFile = formData.get("file");
				const contentType = formData.get("contentType");

				// Validate inputs
				if (typeof storagePath !== "string" || !storagePath.length) {
					return new Response("Missing storagePath", { status: 400 });
				}
				if (!(uploadedFile instanceof File)) {
					return new Response("Missing file", { status: 400 });
				}

				// Validate path structure: {category}/{userId}/...
				const pathParts = storagePath.split("/");
				const category = pathParts[0];
				const pathUserId = pathParts[1];

				const isValidCategory = (
					value: string,
				): value is (typeof VALID_UPLOAD_PREFIXES)[number] =>
					(VALID_UPLOAD_PREFIXES as readonly string[]).includes(value);

				if (!isValidCategory(category)) {
					return new Response(`Invalid storage category: ${category}`, {
						status: 400,
					});
				}

				if (pathUserId !== user.id) {
					return new Response("Invalid storagePath - user mismatch", {
						status: 403,
					});
				}

				// Get file buffer
				const mimeType =
					typeof contentType === "string" ? contentType : uploadedFile.type;
				const arrayBuffer = await uploadedFile.arrayBuffer();
				let buffer = Buffer.from(new Uint8Array(arrayBuffer));
				let finalMimeType = mimeType;
				let finalPath = storagePath;

				// Process avatars with Sharp
				if (
					category === STORAGE_PATHS.AVATAR &&
					mimeType.startsWith("image/")
				) {
					// Validate image type
					if (!isAllowedImageType(mimeType)) {
						return new Response("Invalid image type for avatar", {
							status: 400,
						});
					}

					// Validate size
					if (!isAllowedImageSize(buffer.length)) {
						return new Response("Image too large for avatar", { status: 400 });
					}

					// Process
					const processed = await processAvatar(buffer);
					buffer = Buffer.from(processed.buffer);
					finalMimeType = processed.mimeType;
					finalPath = storagePath.replace(/\.\w+$/, ".webp");
				}

				// Process media images with Sharp (optimize for web)
				if (
					category === STORAGE_PATHS.MEDIA &&
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

				// Upload to storage
				const storage = getStorage();
				await storage.upload(finalPath, buffer, finalMimeType);

				// Generate ETag
				const etag = crypto.createHash("md5").update(buffer).digest("hex");

				return Response.json({
					ok: true,
					storagePath: finalPath,
					contentType: finalMimeType,
					sizeBytes: buffer.length,
					etag,
				});
			},
		},
	},
});
