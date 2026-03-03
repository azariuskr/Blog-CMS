import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { Heart, MapPin, Package, User } from "lucide-react";
import { authQueryOptions } from "@/lib/auth/queries";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(storefront)/store/account")({
	beforeLoad: async ({ context }) => {
		const auth =
			context.user ??
			(await context.queryClient.ensureQueryData(authQueryOptions()));
		if (!auth?.user) {
			throw redirect({ to: "/auth/login" as string });
		}
	},
	component: AccountLayout,
});

const NAV_ITEMS = [
	{ label: "Overview", to: ROUTES.STORE.ACCOUNT.BASE, icon: User },
	{ label: "Orders", to: ROUTES.STORE.ACCOUNT.ORDERS, icon: Package },
	{ label: "Addresses", to: ROUTES.STORE.ACCOUNT.ADDRESSES, icon: MapPin },
	{ label: "Wishlist", to: "/store/wishlist", icon: Heart },
];

function AccountLayout() {
	const location = useLocation();

	return (
		<div className="sf-container py-10">
			<h1
				className="mb-6 text-2xl font-bold"
				style={{ fontFamily: "'Varela Round', sans-serif" }}
			>
				My Account
			</h1>

			<div className="flex flex-col gap-8 lg:flex-row">
				{/* Sidebar */}
				<nav className="flex gap-2 overflow-x-auto lg:w-56 lg:flex-shrink-0 lg:flex-col lg:overflow-visible">
					{NAV_ITEMS.map((item) => {
						const isActive =
							item.to === ROUTES.STORE.ACCOUNT.BASE
								? location.pathname === item.to
								: location.pathname.startsWith(item.to);
						return (
							<Link
								key={item.to}
								to={item.to as string}
								className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
									isActive
										? "bg-[var(--sf-rose-light)] text-[var(--sf-rose)]"
										: "text-[var(--sf-text-muted)] hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
								}`}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* Content */}
				<div className="min-w-0 flex-1">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
