import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { file } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage/client";
import { getStorageProvider } from "@/lib/storage/config";
import { LocalStorage } from "@/lib/storage/local";

export const Route = createFileRoute("/api/storage/files/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const url = new URL(request.url);
				const token = url.searchParams.get("token");
				const expires = url.searchParams.get("expires");

				// Get the file key from the splat param
				const key = params._splat;
				if (!key) {
					return new Response("Missing file key", { status: 400 });
				}

				const storage = getStorage();
				const provider = getStorageProvider();

				// For local storage, verify signed token
				if (provider === "local" && storage instanceof LocalStorage) {
					if (token && expires) {
						const expiresNum = Number.parseInt(expires, 10);
						if (Number.isNaN(expiresNum)) {
							return new Response("Invalid expires parameter", { status: 400 });
						}
						if (!storage.verifySignedToken(key, token, expiresNum)) {
							return new Response("Invalid or expired token", { status: 403 });
						}
					} else {
						// No token: require auth and ownership check below
					}
				}

				// If no valid signed token, require auth and verify ownership
				const hasSignedToken =
					!!token &&
					!!expires &&
					provider === "local" &&
					storage instanceof LocalStorage;
				if (!hasSignedToken) {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					const user = session?.user;
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const [owned] = await db
						.select({ id: file.id })
						.from(file)
						.where(and(eq(file.userId, user.id), eq(file.storagePath, key)))
						.limit(1);

					if (!owned) {
						return new Response("File not found", { status: 404 });
					}
				}

				// Get file stream
				const result = await storage.getFileStream(key);
				if (!result) {
					return new Response("File not found", { status: 404 });
				}

				const body = Readable.toWeb(result.stream) as ReadableStream;

				return new Response(body, {
					headers: {
						"Content-Type": result.contentType,
						"Content-Length": result.size.toString(),
						"Cache-Control": "private, max-age=3600",
					},
				});
			},
		},
	},
});
