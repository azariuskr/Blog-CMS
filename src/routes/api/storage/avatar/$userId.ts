import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { type AppRole, ROLES, STORAGE_CACHE } from "@/constants";
import { auth } from "@/lib/auth/auth";
import { hasMinimumRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { file, user } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage/client";

export const Route = createFileRoute("/api/storage/avatar/$userId")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
					query: {
						disableCookieCache: true,
					},
					returnHeaders: true,
				});
				const cookies = session.headers?.getSetCookie?.() ?? [];
				const currentUser = session.response?.user;

				if (!currentUser) {
					return new Response("Unauthorized", { status: 401 });
				}

				const requesterRole = currentUser.role as AppRole | undefined;
				const isSelf = params.userId === currentUser.id;
				const canViewOthers = requesterRole
					? hasMinimumRole(requesterRole, ROLES.ADMIN)
					: false;

				if (!isSelf && !canViewOthers) {
					return new Response("Forbidden", { status: 403 });
				}

				const targetUserId = params.userId;

				// Get user's avatar path and updatedAt for ETag
				const [u] = await db
					.select({
						avatarPath: user.avatarPath,
						avatarOriginalPath: user.avatarOriginalPath,
						avatarUpdatedAt: user.avatarUpdatedAt,
					})
					.from(user)
					.where(eq(user.id, targetUserId))
					.limit(1);

				const storagePath = u?.avatarPath ?? u?.avatarOriginalPath;
				if (!storagePath) {
					return new Response("Not found", { status: 404 });
				}

				// Generate ETag from avatarUpdatedAt or path
				const etagSource = u?.avatarUpdatedAt?.getTime?.() ?? storagePath;
				const etag = `"${Buffer.from(String(etagSource)).toString("base64").slice(0, 16)}"`;

				// Check If-None-Match for 304 response
				const ifNoneMatch = request.headers.get("If-None-Match");
				if (ifNoneMatch === etag) {
					return new Response(null, {
						status: 304,
						headers: {
							ETag: etag,
							"Cache-Control": `private, max-age=${STORAGE_CACHE.AVATAR_MAX_AGE}, stale-while-revalidate=${STORAGE_CACHE.AVATAR_STALE_WHILE_REVALIDATE}`,
						},
					});
				}

				// Get file metadata
				const [meta] = await db
					.select({ mimeType: file.mimeType })
					.from(file)
					.where(
						and(
							eq(file.userId, targetUserId),
							eq(file.storagePath, storagePath),
						),
					)
					.limit(1);

				const storage = getStorage();

				// Get file stream with error handling
				const result = await (async () => {
					try {
						return await storage.getFileStream(storagePath);
					} catch (error) {
						console.error(
							`Failed to get avatar stream for path ${storagePath}:`,
							error,
						);
						return null;
					}
				})();

				if (!result) {
					console.warn(`Avatar not found in storage: ${storagePath}`);
					return new Response("Not found", { status: 404 });
				}

				const contentType =
					meta?.mimeType ||
					result.contentType ||
					(storagePath.endsWith(".webp") ? "image/webp" : "image/jpeg");

				let body: ReadableStream;
				try {
					body = Readable.toWeb(result.stream) as ReadableStream;
				} catch (error) {
					console.error("Failed to convert stream:", error);
					return new Response("Stream error", { status: 500 });
				}

				const responseHeaders = new Headers({
					"Content-Type": contentType,
					"Content-Length": result.size.toString(),
					"Cache-Control": `private, max-age=${STORAGE_CACHE.AVATAR_MAX_AGE}, stale-while-revalidate=${STORAGE_CACHE.AVATAR_STALE_WHILE_REVALIDATE}`,
					ETag: etag,
					Vary: "Accept",
				});

				for (const cookie of cookies) {
					responseHeaders.append("Set-Cookie", cookie);
				}

				return new Response(body, { headers: responseHeaders });
			},
		},
	},
});
