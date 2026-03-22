import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvent, cmsVersion, newsletterSubscribers, posts } from "@/lib/db/schema";
import { invalidateAllCmsCache } from "@/lib/cache/redis";
import { sendEmail } from "@/lib/email";
import { env } from "@/env/server";
import { inngest } from "./client";
import { getActiveWebhooksForSite, deliverWebhook } from "@/lib/api-keys/webhooks";

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

/**
 * Git-backed Publishing — triggered on post.published event.
 * Commits the post's MDX content to the site's configured git repository.
 * Stores the resulting gitSha + gitPath back on the posts row.
 */
export const blogGitPublishFunction = inngest.createFunction(
	{ id: "blog-git-publish", concurrency: { limit: 3 } },
	{ event: "blog/post.published" },
	async ({ event, step }) => {
		const { postId } = event.data as { postId: string };

		// Fetch post + site
		const postRow = await step.run("fetch-post", async () => {
			const row = await db.query.posts.findFirst({
				where: eq(posts.id, postId),
				with: { site: true },
			});
			if (!row) throw new Error(`Post ${postId} not found`);
			return row;
		});

		const site = (postRow as any).site;
		if (!site?.gitRepo) {
			return { skipped: true, reason: "No gitRepo configured on site" };
		}

		const gitRepo: string = site.gitRepo;
		const gitBranch: string = site.gitBranch ?? "main";
		const mdxContent: string = postRow.content ?? "";
		const filePath = `posts/${postRow.slug}.mdx`;

		const { gitSha } = await step.run("commit-to-git", async () => {
			// Dynamic imports keep the git libraries out of the main bundle
			const git = (await import("isomorphic-git")).default;
			const LightningFS = (await import("@isomorphic-git/lightning-fs")).default;

			const dir = `/tmp/git-publish-${postId}`;
			const fs = new LightningFS("git-publish");

			// Clone (shallow) or init
			try {
				await git.clone({
					fs,
					http: (await import("isomorphic-git/http/node")).default,
					dir,
					url: gitRepo,
					ref: gitBranch,
					singleBranch: true,
					depth: 1,
				});
			} catch {
				await git.init({ fs, dir, defaultBranch: gitBranch });
			}

			// Write MDX file
			await fs.promises.mkdir(`${dir}/posts`, { recursive: true } as any).catch(() => {});
			await fs.promises.writeFile(`${dir}/${filePath}`, mdxContent);

			// Stage + commit
			await git.add({ fs, dir, filepath: filePath });
			const sha = await git.commit({
				fs,
				dir,
				message: `publish: ${postRow.slug} — ${new Date().toISOString()}`,
				author: { name: "BlogCMS", email: "bot@blogcms.io" },
			});

			// Push (best-effort — requires token in gitRepo URL or env)
			try {
				await git.push({
					fs,
					http: (await import("isomorphic-git/http/node")).default,
					dir,
					remote: "origin",
					ref: gitBranch,
				});
			} catch (pushErr) {
				console.warn("Git push failed (non-fatal):", pushErr);
			}

			return { gitSha: sha };
		});

		// Store sha + path back on posts row
		await step.run("update-post-git-meta", async () => {
			await db
				.update(posts)
				.set({ gitSha, gitPath: filePath, updatedAt: new Date() })
				.where(eq(posts.id, postId));
		});

		return { ok: true, postId, gitSha, gitPath: filePath };
	},
);

/**
 * Blog Post Webhook Delivery — fires webhooks to external app endpoints
 * when a post is published, updated, or deleted.
 */
export const blogPostWebhookFunction = inngest.createFunction(
	{ id: "blog-post-webhook", retries: 3 },
	{ event: "blog/post.webhook" },
	async ({ event, step }) => {
		const { siteId, postId, postSlug, postTitle, eventType, publishedAt } = event.data as {
			siteId: string;
			postId: string;
			postSlug: string;
			postTitle: string;
			eventType: string;
			publishedAt?: string;
		};

		const webhooks = await step.run("get-active-webhooks", async () => {
			return getActiveWebhooksForSite(siteId, eventType);
		});

		if (webhooks.length === 0) return { delivered: 0 };

		const results = await Promise.all(
			webhooks.map((webhook) =>
				step.run(`deliver-${webhook.id}`, async () =>
					deliverWebhook(webhook, eventType, {
						siteId,
						post: { id: postId, slug: postSlug, title: postTitle, publishedAt },
					}),
				),
			),
		);

		return {
			delivered: results.filter((r) => r.success).length,
			total: results.length,
		};
	},
);

export const cmsFunctions = [
	cmsPublishedFunction,
	cmsVersionCleanupFunction,
	newsletterConfirmationFunction,
	newsletterConfirmFunction,
	blogSchedulePublishFunction,
	blogGitPublishFunction,
	blogPostWebhookFunction,
] as const;
