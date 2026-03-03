import { z } from "zod";

import { db } from "@/lib/db";
import { analyticsEvent } from "@/lib/db/schema";
import { inngest } from "./client";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

export type SendResult = { success: true } | { success: false; error: string };

/**
 * Schemas + inferred payload types
 */
export const userSignedUpSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
});
export type UserSignedUpPayload = z.infer<typeof userSignedUpSchema>;

export const userEmailVerifiedSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
});
export type UserEmailVerifiedPayload = z.infer<typeof userEmailVerifiedSchema>;

export const fileUploadedSchema = z.object({
    userId: z.string(),
    fileId: z.string(),
    key: z.string(),
    mimeType: z.string(),
    category: z.string(),
});
export type FileUploadedPayload = z.infer<typeof fileUploadedSchema>;

export const userAvatarUploadedSchema = z.object({
    userId: z.string(),
    storagePath: z.string(),
    contentType: z.string(),
});
export type UserAvatarUploadedPayload = z.infer<typeof userAvatarUploadedSchema>;

/**
 * Generic event sender builder:
 * - Validates input via Zod
 * - Sends Inngest event
 * - Logs analytics best-effort (only if data has userId)
 * - Returns a stable {success: ...} result shape
 */
function makeEventSender<TSchema extends z.ZodTypeAny>(
    eventName: string,
    schema: TSchema,
) {
    return async (payload: z.infer<TSchema>): Promise<SendResult> => {
        const data = schema.parse(payload);

        try {
            await inngest.send({ name: eventName, data });

            // Best-effort analytics logging when a userId exists
            const maybe = data as unknown as { userId?: string };
            if (maybe.userId) {
                await db.insert(analyticsEvent).values({
                    userId: maybe.userId,
                    eventName: "inngest.sent",
                    eventProperties: JSON.stringify({ name: eventName }),
                    context: "inngest",
                });
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error) };
        }
    };
}

/**
 * Concrete event senders
 */
export const sendUserSignedUpEvent = makeEventSender(
    "app/user.signed_up",
    userSignedUpSchema,
);

export const sendUserEmailVerifiedEvent = makeEventSender(
    "app/user.email_verified",
    userEmailVerifiedSchema,
);

export const sendFileUploadedEvent = makeEventSender(
    "app/file.uploaded",
    fileUploadedSchema,
);

export const sendUserAvatarUploadedEvent = makeEventSender(
    "app/user.avatar_uploaded",
    userAvatarUploadedSchema,
);
