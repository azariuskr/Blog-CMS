import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BetterAuthUiProviders } from "@/lib/auth/better-auth-ui-provider";
import { type AuthQueryResult, authQueryOptions } from "@/lib/auth/queries";
import { ImageLoadQueueProvider } from "@/lib/performance/image-load-queue";
import { GlobalSEO, OrganizationStructuredData } from "@/lib/seo";
import { appActions, appStore } from "@/lib/store/app";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles/index.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	user: AuthQueryResult;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ context }) => {
		const user = await context.queryClient.ensureQueryData(authQueryOptions());
		return { user };
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Varela+Round&display=swap",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { readonly children: React.ReactNode }) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => appActions.setTheme(appStore.state.theme);
		media.addEventListener("change", handler);
		return () => media.removeEventListener("change", handler);
	}, []);
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ScriptOnce>
					{`document.documentElement.classList.toggle('dark',
            localStorage.theme === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
          )`}
				</ScriptOnce>
				<GlobalSEO />
				<OrganizationStructuredData />
				<BetterAuthUiProviders>
					<ImageLoadQueueProvider>{children}</ImageLoadQueueProvider>
				</BetterAuthUiProviders>
				<Toaster richColors />
				{/* {isClient && import.meta.env.DEV ? (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				) : null} */}

				<Scripts />
			</body>
		</html>
	);
}
