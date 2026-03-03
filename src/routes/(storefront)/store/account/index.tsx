import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MapPin, Package } from "lucide-react";
import { useUser } from "@/hooks/auth-hooks";
import { useMyOrders, useWishlist, useAddresses } from "@/lib/ecommerce/queries";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(storefront)/store/account/")({
	component: AccountOverview,
});

function AccountOverview() {
	const user = useUser();
	const { data: ordersData } = useMyOrders({ page: 1 });
	const { data: wishlistData } = useWishlist();
	const { data: addressData } = useAddresses();

	const recentOrders = ordersData?.ok ? ordersData.data?.items?.slice(0, 3) ?? [] : [];
	const totalOrders = ordersData?.ok ? ordersData.data?.total ?? 0 : 0;
	const wishlistCount = wishlistData?.ok ? wishlistData.data?.productIds?.length ?? 0 : 0;
	const addressCount = addressData?.ok ? addressData.data?.addresses?.length ?? 0 : 0;

	const statusColors: Record<string, string> = {
		pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
		confirmed: "bg-blue-50 text-blue-700 border-blue-200",
		processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
		shipped: "bg-purple-50 text-purple-700 border-purple-200",
		delivered: "bg-green-50 text-green-700 border-green-200",
		cancelled: "bg-red-50 text-red-700 border-red-200",
		refunded: "bg-gray-50 text-gray-700 border-gray-200",
	};

	return (
		<div className="space-y-6">
			{/* Welcome */}
			<div className="rounded-2xl border border-[var(--sf-border-light)] bg-gradient-to-r from-[var(--sf-rose-light)] to-[var(--sf-bg)] p-6">
				<h2
					className="text-xl font-bold text-[var(--sf-text)]"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					Welcome back, {user?.name?.split(" ")[0] || "there"}!
				</h2>
				<p className="mt-1 text-sm text-[var(--sf-text-muted)]">
					Manage your orders, addresses, and wishlist all in one place.
				</p>
			</div>

			{/* Quick stats */}
			<div className="grid grid-cols-3 gap-4">
				<Link
					to={ROUTES.STORE.ACCOUNT.ORDERS as string}
					className="group rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-4 transition-colors hover:border-[var(--sf-rose)]"
				>
					<Package className="h-5 w-5 text-[var(--sf-rose)]" />
					<p className="mt-2 text-2xl font-bold text-[var(--sf-text)]">{totalOrders}</p>
					<p className="text-xs text-[var(--sf-text-muted)]">Orders</p>
				</Link>
				<Link
					to="/store/wishlist"
					className="group rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-4 transition-colors hover:border-[var(--sf-rose)]"
				>
					<Heart className="h-5 w-5 text-[var(--sf-rose)]" />
					<p className="mt-2 text-2xl font-bold text-[var(--sf-text)]">{wishlistCount}</p>
					<p className="text-xs text-[var(--sf-text-muted)]">Wishlist</p>
				</Link>
				<Link
					to={ROUTES.STORE.ACCOUNT.ADDRESSES as string}
					className="group rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-4 transition-colors hover:border-[var(--sf-rose)]"
				>
					<MapPin className="h-5 w-5 text-[var(--sf-rose)]" />
					<p className="mt-2 text-2xl font-bold text-[var(--sf-text)]">{addressCount}</p>
					<p className="text-xs text-[var(--sf-text-muted)]">Addresses</p>
				</Link>
			</div>

			{/* Recent Orders */}
			<div>
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-[var(--sf-text)]">Recent Orders</h3>
					{totalOrders > 3 && (
						<Link
							to={ROUTES.STORE.ACCOUNT.ORDERS as string}
							className="text-xs font-medium text-[var(--sf-rose)] hover:underline"
						>
							View all
						</Link>
					)}
				</div>

				{recentOrders.length === 0 ? (
					<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-8 text-center">
						<Package className="mx-auto h-10 w-10 text-[var(--sf-border)]" />
						<p className="mt-3 text-sm text-[var(--sf-text-muted)]">
							No orders yet. Start shopping!
						</p>
						<Link
							to={"/store/products" as string}
							className="sf-btn-primary mt-4 inline-block text-sm"
						>
							Browse Products
						</Link>
					</div>
				) : (
					<div className="space-y-3">
						{recentOrders.map((o: any) => (
							<Link
								key={o.id}
								to={ROUTES.STORE.ACCOUNT.ORDER_DETAIL(o.id) as string}
								className="flex items-center justify-between rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-4 transition-colors hover:border-[var(--sf-rose)]"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="text-sm font-semibold text-[var(--sf-text)]">
											{o.orderNumber}
										</p>
										<span
											className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColors[o.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
										>
											{o.status}
										</span>
									</div>
									<p className="mt-1 truncate text-xs text-[var(--sf-text-muted)]">
										{o.itemSummary} &middot; {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
									</p>
								</div>
								<div className="ml-4 text-right">
									<p className="text-sm font-bold text-[var(--sf-text)]">
										{o.totalFormatted}
									</p>
									<p className="text-[10px] text-[var(--sf-text-muted)]">
										{new Date(o.createdAt).toLocaleDateString()}
									</p>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
