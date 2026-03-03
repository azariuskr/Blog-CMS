import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StorefrontNav } from "@/components/storefront/storefront-nav";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import "@/i18n";

export const Route = createFileRoute("/(storefront)")({
	component: StorefrontLayout,
});

function StorefrontLayout() {
	return (
		<div className="storefront flex min-h-screen flex-col">
			<StorefrontNav />
			<main className="flex-1">
				<Outlet />
			</main>
			<StorefrontFooter />
		</div>
	);
}
