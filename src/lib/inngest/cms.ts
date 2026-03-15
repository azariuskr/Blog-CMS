import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvent, cmsVersion, newsletterSubscribers, posts } from "@/lib/db/schema";
import { invalidateAllCmsCache } from "@/lib/cache/redis";
import { sendEmail } from "@/lib/email";
import { env } from "@/env/server";
import { inngest } from "./client";

/**
 * CMS Profile Published — runs after publishing a CMS profile.
 * Invalidates Redis cache and logs analytics.
 */
export const cmsPublishedFunction = inngest.createFunction(
	{ id: "cms-profile-published" },
	{ event: "cms/profile.published" },
	async ({ event, step }) => {
		const { profileId, version, userId } = event.data as {
			profileId: string;
			version: number;
			userId: string;
		};

		// Invalidate all CMS cache
		await step.run("invalidate-cms-cache", async () => {
			await invalidateAllCmsCache();
		});

		// Log analytics
		await step.run("log-analytics", async () => {
			await db.insert(analyticsEvent).values({
				userId,
				eventName: "cms.published",
				eventProperties: JSON.stringify({ profileId, version }),
				context: "cms",
			});
		});

		return { ok: true, profileId, version };
	},
);

/**
 * CMS Version Cleanup — removes old versions beyond a threshold.
 * Keeps the most recent N versions (default 20).
 */
export const cmsVersionCleanupFunction = inngest.createFunction(
	{ id: "cms-version-cleanup" },
	{ event: "cms/version.cleanup" },
	async ({ event, step }) => {
		const { profileId, keepCount } = event.data as {
			profileId: string;
			keepCount: number;
		};

		const threshold = keepCount || 20;

		const deleted = await step.run("delete-old-versions", async () => {
			const versions = await db
				.select({ id: cmsVersion.id, version: cmsVersion.version })
				.from(cmsVersion)
				.where(eq(cmsVersion.profileId, profileId))
				.orderBy(desc(cmsVersion.version));

			if (versions.length <= threshold) {
				return 0;
			}

			const toDelete = versions.slice(threshold);
			let deletedCount = 0;

			for (const v of toDelete) {
				await db.delete(cmsVersion).where(eq(cmsVersion.id, v.id));
				deletedCount++;
			}

			return deletedCount;
		});

		return { ok: true, profileId, deletedVersions: deleted };
	},
);

/**
 * Newsletter Subscriber Created — sends a confirmation email.
 */
export const newsletterConfirmationFunction = inngest.createFunction(
	{ id: "newsletter-send-confirmation" },
	{ event: "blog/newsletter.subscribed" },
	async ({ event, step }) => {
		const { email, name, subscriberId, token } = event.data as {
			email: string;
			name?: string;
			subscriberId: string;
			token: string;
		};

		const confirmUrl = `${env.VITE_BASE_URL}/newsletter/confirm?token=${token}`;

		await step.run("send-confirmation-email", async () => {
			await sendEmail({
				to: email,
				subject: "Please confirm your newsletter subscription",
				template: "newsletter-confirmation",
				data: { name: name ?? "", confirmUrl },
				context: "newsletter",
				eventProperties: { subscriberId, kind: "newsletter-confirmation" },
			});
		});

		return { ok: true, subscriberId };
	},
);

/**
 * Newsletter Confirm Token — verifies token, marks subscriber as confirmed.
 */
export const newsletterConfirmFunction = inngest.createFunction(
	{ id: "newsletter-confirm" },
	{ event: "blog/newsletter.confirm" },
	async ({ event, step }) => {
		const { token } = event.data as { token: string };

		await step.run("confirm-subscriber", async () => {
			await db
				.update(newsletterSubscribers)
				.set({ isConfirmed: true, confirmToken: null })
				.where(eq(newsletterSubscribers.confirmToken, token));
		});

		return { ok: true };
	},
);

/**
 * Blog Scheduled Posts Publisher — runs every minute.
 * Publishes all posts with status="scheduled" where scheduledAt <= now().
 */
export const blogSchedulePublishFunction = inngest.createFunction(
	{ id: "blog-schedule-publish" },
	{ cron: "* * * * *" },
	async ({ step }) => {
		const now = new Date();

		const scheduled = await step.run("find-scheduled-posts", async () => {
			return db.query.posts.findMany({
				where: and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, now)),
				columns: { id: true, title: true },
			});
		});

		if (scheduled.length === 0) return { published: 0 };

		await step.run("publish-scheduled-posts", async () => {
			for (const post of scheduled) {
				await db
					.update(posts)
					.set({ status: "published", publishedAt: now, updatedAt: now })
					.where(eq(posts.id, post.id));
			}
		});

		return { published: scheduled.length, postIds: scheduled.map((p) => p.id) };
	},
);

export const cmsFunctions = [
	cmsPublishedFunction,
	cmsVersionCleanupFunction,
	newsletterConfirmationFunction,
	newsletterConfirmFunction,
	blogSchedulePublishFunction,
] as const;
