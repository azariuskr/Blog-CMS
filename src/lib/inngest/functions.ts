import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvent, file, user } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { getStorage } from "@/lib/storage/client";
import { getStorageConfig } from "@/lib/storage/config";
import type { IStorage } from "@/lib/storage/types";
import { inngest } from "./client";

// Get storage instance (lazy initialization)
function getStorageInstance() {
    return getStorage();
}

// Helper to get public URL for a storage key
function getPublicUrl(key: string): string {
    const config = getStorageConfig();
    switch (config.provider) {
        case "minio":
            // MinIO typically uses presigned URLs, but we can construct a path
            return `/api/storage/files/${key}`;
        default:
            return `${config.local.publicUrlPrefix}/${key}`;
    }
}

// Process uploaded images (generate thumbnails, optimize, etc.)
export const fileUploadedFunction = inngest.createFunction(
    { id: "file-uploaded" },
    { event: "app/file.uploaded" },
    async ({ event, step }) => {
        const { userId, fileId, key, mimeType, category } = event.data as {
            userId: string;
            fileId: string;
            key: string;
            mimeType: string;
            category: string;
        };

        // Only process images
        if (!mimeType.startsWith("image/")) {
            return { ok: true, message: "Not an image, skipping processing" };
        }

        const storage = getStorageInstance();

        // Generate optimized versions
        const variants = await step.run("generate-variants", async () => {
            const sharp = (await import("sharp")).default;

            // download inside this step so Buffer never crosses step boundary
            const url = await storage.getPresignedUrl(key, 3600);
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to download original");
            const originalBuffer = Buffer.from(await response.arrayBuffer());

            const outputs: Array<{ key: string; size: number }> = [];

            if (category === "avatar") {
                const sizes = [128, 256, 512] as const;

                for (const size of sizes) {
                    const base = sharp(originalBuffer).rotate().resize(size, size, { fit: "cover" });

                    const webpBuf = await base.clone().webp({ quality: 85 }).toBuffer();
                    const webpKey = key.replace(/\.\w+$/, `-${size}.webp`);
                    await storage.upload(webpKey, webpBuf, "image/webp");
                    outputs.push({ key: webpKey, size: webpBuf.length });

                    try {
                        const avifBuf = await base.clone().avif({ quality: 65 }).toBuffer();
                        const avifKey = key.replace(/\.\w+$/, `-${size}.avif`);
                        await storage.upload(avifKey, avifBuf, "image/avif");
                        outputs.push({ key: avifKey, size: avifBuf.length });
                    } catch { }
                }
            } else {
                const optimized = await sharp(originalBuffer)
                    .rotate()
                    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();

                const optimizedKey = key.replace(/\.\w+$/, "-optimized.webp");
                await storage.upload(optimizedKey, optimized, "image/webp");
                outputs.push({ key: optimizedKey, size: optimized.length });

                const thumb = await sharp(originalBuffer)
                    .rotate()
                    .resize(400, 400, { fit: "cover" })
                    .webp({ quality: 80 })
                    .toBuffer();

                const thumbKey = key.replace(/\.\w+$/, "-thumb.webp");
                await storage.upload(thumbKey, thumb, "image/webp");
                outputs.push({ key: thumbKey, size: thumb.length });
            }

            return outputs;
        });

        // Update file record with processed variants
        await step.run("update-metadata", async () => {
            const metadata = {
                variants: variants.map((v) => ({
                    key: v.key,
                    size: v.size,
                    url: getPublicUrl(v.key),
                })),
                processed: true,
                processedAt: new Date().toISOString(),
            };

            await db
                .update(file)
                .set({ metadata: JSON.stringify(metadata) })
                .where(eq(file.id, fileId));

            // If avatar, update user table
            if (category === "avatar") {
                const defaultVariant = variants.find((v) =>
                    v.key.includes("-256.webp"),
                );
                if (defaultVariant) {
                    await db
                        .update(user)
                        .set({
                            avatarPath: defaultVariant.key,
                            avatarUpdatedAt: new Date(),
                            image: getPublicUrl(defaultVariant.key),
                        })
                        .where(eq(user.id, userId));
                }
            }
        });

        return { ok: true, variants: variants.length };
    },
);

export const userSignedUpFunction = inngest.createFunction(
    { id: "user-signed-up" },
    { event: "app/user.signed_up" },
    async ({ event, step }) => {
        const { userId, email, name } = event.data as {
            userId: string;
            email: string;
            name?: string;
        };

        // Send welcome email
        await step.run("send-welcome-email", async () => {
            await sendEmail({
                to: email,
                subject: "Welcome to TanStack SaaS Template",
                template: "welcome",
                data: {
                    userName: name || "there",
                    userEmail: email,
                },
                userId,
                context: "onboarding",
                eventProperties: { kind: "welcome" },
            });
        });

        // Log analytics event
        await step.run("log-analytics", async () => {
            await db.insert(analyticsEvent).values({
                userId,
                eventName: "user.signed_up",
                eventProperties: JSON.stringify({ email, name }),
                context: "auth",
            });
        });

        return { ok: true, userId };
    },
);

export const userEmailVerifiedFunction = inngest.createFunction(
    { id: "user-email-verified" },
    { event: "app/user.email_verified" },
    async ({ event, step }) => {
        const { userId, email } = event.data as {
            userId: string;
            email: string;
        };

        // Log analytics event
        await step.run("log-analytics", async () => {
            await db.insert(analyticsEvent).values({
                userId,
                eventName: "user.email_verified",
                eventProperties: JSON.stringify({ email }),
                context: "auth",
            });
        });

        return { ok: true, userId };
    },
);

export const userAvatarUploadedFunction = inngest.createFunction(
    { id: "user-avatar-uploaded" },
    { event: "app/user.avatar_uploaded" },
    async ({ event, step }) => {
        const { userId, storagePath, contentType } = event.data as {
            userId: string;
            storagePath: string;
            contentType: string;
        };

        // Log analytics event
        await step.run("log-analytics", async () => {
            await db.insert(analyticsEvent).values({
                userId,
                eventName: "avatar.uploaded",
                eventProperties: JSON.stringify({
                    storagePath,
                    contentType,
                }),
                context: "profile",
            });
        });

        // Generate additional sizes (optional, non-blocking)
        // Main 256px webp is already created during upload
        const variants = await step.run("generate-extra-sizes", async () => {
            const storage = getStorageInstance();

            // Get the uploaded avatar (already processed to 256px webp)
            if (!("getFile" in storage)) {
                return [];
            }

            const storageWithGetFile = storage as IStorage & {
                getFile: (key: string) => Promise<{ data: Buffer; contentType: string } | null>;
            };

            const result = await storageWithGetFile.getFile(storagePath);
            if (!result) {
                return [];
            }

            const sharp = (await import("sharp")).default;
            const outputs: Array<{ path: string; size: number }> = [];

            // Generate 128px and 512px variants
            for (const size of [128, 512] as const) {
                try {
                    const resized = await sharp(result.data)
                        .resize(size, size, { fit: "cover" })
                        .webp({ quality: 85 })
                        .toBuffer();

                    const variantPath = storagePath.replace(/\.webp$/, `-${size}.webp`);
                    await storage.upload(variantPath, resized, "image/webp");
                    outputs.push({ path: variantPath, size: resized.length });
                } catch {
                    // Non-critical, continue
                }
            }

            return outputs;
        });

        return { ok: true, variants: variants.length };
    },
);

// Import billing functions
import { billingFunctions } from "./billing";
// Import CMS functions
import { cmsFunctions } from "./cms";
export const inngestFunctions = [
    userSignedUpFunction,
    userEmailVerifiedFunction,
    fileUploadedFunction,
    userAvatarUploadedFunction,
    ...billingFunctions,
    ...cmsFunctions,
] as const;
