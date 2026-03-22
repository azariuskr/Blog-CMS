import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { createServerFn } from "@tanstack/react-start";

const $confirmNewsletter = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z.object({ token: z.string().min(1) }).safeParse(data);
		return parsed.success ? { ok: true as const, data: parsed.data } : { ok: false as const, error: parsed.error };
	})
	.handler(async ({ data }) => {
		if (!data.ok) return { confirmed: false, error: "Invalid token" };
		const updated = await db
			.update(newsletterSubscribers)
			.set({ isConfirmed: true, confirmToken: null })
			.where(eq(newsletterSubscribers.confirmToken, data.data.token))
			.returning();
		if (updated.length === 0) return { confirmed: false, error: "Token not found or already used" };
		return { confirmed: true };
	});

export const Route = createFileRoute("/newsletter/confirm")({
	validateSearch: z.object({ token: z.string().optional() }),
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: async ({ deps }): Promise<{ confirmed: boolean; error?: string }> => {
		if (!deps.token) return { confirmed: false, error: "Missing token" };
		return $confirmNewsletter({ data: { token: deps.token } }) as any;
	},
	component: NewsletterConfirmPage,
});

function NewsletterConfirmPage() {
	const result = Route.useLoaderData() as any;
	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="max-w-md w-full text-center space-y-6">
				{result.confirmed ? (
					<>
						<div className="text-5xl">🎉</div>
						<h1 className="text-2xl font-bold">You're confirmed!</h1>
						<p className="text-muted-foreground">
							Thanks for confirming your subscription. You'll receive our latest posts in your inbox.
						</p>
						<Link to="/" className="inline-block underline text-primary">
							Back to home
						</Link>
					</>
				) : (
					<>
						<div className="text-5xl">⚠️</div>
						<h1 className="text-2xl font-bold">Confirmation failed</h1>
						<p className="text-muted-foreground">
							{result.error ?? "This link may have expired or already been used."}
						</p>
						<Link to="/" className="inline-block underline text-primary">
							Back to home
						</Link>
					</>
				)}
			</div>
		</div>
	);
}
