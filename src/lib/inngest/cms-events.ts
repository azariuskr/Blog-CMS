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

// =============================================================================
// CMS Event Schemas
// =============================================================================

export const cmsProfilePublishedSchema = z.object({
	profileId: z.string(),
	version: z.number(),
	userId: z.string(),
});
export type CmsProfilePublishedPayload = z.infer<typeof cmsProfilePublishedSchema>;

export const cmsVersionCleanupSchema = z.object({
	profileId: z.string(),
	keepCount: z.number().int().positive().default(20),
});
export type CmsVersionCleanupPayload = z.infer<typeof cmsVersionCleanupSchema>;

// =============================================================================
// Event Senders
// =============================================================================

function makeEventSender<TSchema extends z.ZodTypeAny>(
	eventName: string,
	schema: TSchema,
) {
	return async (payload: z.infer<TSchema>): Promise<SendResult> => {
		const data = schema.parse(payload);

		try {
			await inngest.send({ name: eventName, data });

			// Best-effort analytics logging
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

export const sendCmsProfilePublishedEvent = makeEventSender(
	"cms/profile.published",
	cmsProfilePublishedSchema,
);

export const sendCmsVersionCleanupEvent = makeEventSender(
	"cms/version.cleanup",
	cmsVersionCleanupSchema,
);
