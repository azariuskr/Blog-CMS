import { createHmac } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiWebhooks, apiKeys } from "@/lib/db/schema";

export function signPayload(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliverWebhook(
	webhook: { id: string; url: string; secret: string },
	event: string,
	postData: Record<string, unknown>,
): Promise<{ statusCode: number; success: boolean }> {
	const payload = JSON.stringify({
		event,
		timestamp: new Date().toISOString(),
		...postData,
	});

	const signature = signPayload(payload, webhook.secret);

	try {
		const response = await fetch(webhook.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-BlogCMS-Signature": signature,
				"X-BlogCMS-Event": event,
			},
			body: payload,
			signal: AbortSignal.timeout(10_000), // 10s timeout
		});

		const statusCode = response.status;

		// Update last fired info
		await db
			.update(apiWebhooks)
			.set({ lastFiredAt: new Date(), lastStatusCode: statusCode })
			.where(eq(apiWebhooks.id, webhook.id));

		return { statusCode, success: statusCode >= 200 && statusCode < 300 };
	} catch (error) {
		await db
			.update(apiWebhooks)
			.set({ lastFiredAt: new Date(), lastStatusCode: 0 })
			.where(eq(apiWebhooks.id, webhook.id));

		return { statusCode: 0, success: false };
	}
}

export async function getActiveWebhooksForSite(
	siteId: string,
	event: string,
): Promise<Array<{ id: string; url: string; secret: string }>> {
	const rows = await db
		.select({
			id: apiWebhooks.id,
			url: apiWebhooks.url,
			secret: apiWebhooks.secret,
			events: apiWebhooks.events,
		})
		.from(apiWebhooks)
		.innerJoin(apiKeys, eq(apiWebhooks.apiKeyId, apiKeys.id))
		.where(
			and(
				eq(apiKeys.siteId, siteId),
				eq(apiWebhooks.isActive, true),
			),
		);

	return rows.filter((r) => r.events?.includes(event));
}
