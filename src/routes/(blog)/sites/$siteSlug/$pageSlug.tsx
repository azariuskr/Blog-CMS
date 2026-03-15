/**
 * Public Puck page renderer.
 * Route: /(blog)/sites/$siteSlug/$pageSlug
 *
 * Fetches the page data from the DB and renders it with PuckPage.
 * Applies per-site theme tokens via inline CSS variables.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import type { Data } from "@measured/puck";
import { $getPageBySlug } from "@/lib/blog/functions";
import { PuckPage } from "@/lib/puck/render";

export const Route = createFileRoute("/(blog)/sites/$siteSlug/$pageSlug")({
	loader: async ({ params }) => {
		const result = await $getPageBySlug({
			data: { siteSlug: params.siteSlug, pageSlug: params.pageSlug },
		});
		if (!result?.ok || !result.data) throw notFound();
		return result.data;
	},
	notFoundComponent: () => (
		<div className="flex flex-col items-center justify-center min-h-[50vh]">
			<h1 className="headline-2 text-alice-blue mb-3">Page Not Found</h1>
			<p className="text-shadow-blue">This page doesn't exist or hasn't been published yet.</p>
		</div>
	),
	component: PuckPublicPage,
});

function PuckPublicPage() {
	const { site, page } = Route.useLoaderData();

	// Apply per-site theme tokens as CSS variables on the page wrapper
	const themeVars: React.CSSProperties = site.themeConfig
		? ({
				"--site-primary": site.themeConfig.primaryColor,
				"--site-accent": site.themeConfig.accentColor,
				"--site-font": site.themeConfig.fontFamily,
		  } as React.CSSProperties)
		: {};

	const puckData = (page.blocks as unknown as Data) ?? { content: [], root: { props: { title: page.title } }, zones: {} };

	return (
		<div style={themeVars}>
			<PuckPage data={puckData} />
		</div>
	);
}
