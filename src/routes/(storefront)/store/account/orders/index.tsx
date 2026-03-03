import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Package, Truck } from "lucide-react";
import { useMyOrders } from "@/lib/ecommerce/queries";
import { ROUTES } from "@/constants";

const searchSchema = z.object({
	page: z.number().int().positive().optional().default(1),
	status: z
		.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
		.optional(),
});

export const Route = createFileRoute("/(storefront)/store/account/orders/")({
	validateSearch: (search) => searchSchema.parse(search),
	component: OrdersPage,
});

const STATUS_TABS = [
	{ label: "All", value: undefined },
	{ label: "Pending", value: "pending" as const },
	{ label: "Processing", value: "processing" as const },
	{ label: "Shipped", value: "shipped" as const },
	{ label: "Delivered", value: "delivered" as const },
	{ label: "Cancelled", value: "cancelled" as const },
];

const statusColors: Record<string, string> = {
	pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
	confirmed: "bg-blue-50 text-blue-700 border-blue-200",
	processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
	shipped: "bg-purple-50 text-purple-700 border-purple-200",
	delivered: "bg-green-50 text-green-700 border-green-200",
	cancelled: "bg-red-50 text-red-700 border-red-200",
	refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

function OrdersPage() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const { data: ordersData, isLoading } = useMyOrders({
		page: search.page,
		status: search.status,
	});

	const orders = ordersData?.ok ? ordersData.data?.items ?? [] : [];
	const totalPages = ordersData?.ok ? ordersData.data?.totalPages ?? 1 : 1;
	const total = ordersData?.ok ? ordersData.data?.total ?? 0 : 0;

	return (
		<div className="space-y-5">
			<div>
				<h2
					className="text-lg font-bold text-[var(--sf-text)]"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					My Orders
				</h2>
				<p className="text-sm text-[var(--sf-text-muted)]">
					{total} order{total !== 1 ? "s" : ""}
				</p>
			</div>

			{/* Status tabs */}
			<div className="flex gap-2 overflow-x-auto pb-1">
				{STATUS_TABS.map((tab) => {
					const isActive = search.status === tab.value;
					return (
						<button
							key={tab.label}
							onClick={() =>
								navigate({
									to: ROUTES.STORE.ACCOUNT.ORDERS as string,
									search: { status: tab.value, page: 1 } as any,
								})
							}
							className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
								isActive
									? "bg-[var(--sf-rose)] text-white"
									: "bg-[var(--sf-border-light)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]"
							}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Orders list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-2xl bg-[var(--sf-border-light)]"
						/>
					))}
				</div>
			) : orders.length === 0 ? (
				<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-12 text-center">
					<Package className="mx-auto h-12 w-12 text-[var(--sf-border)]" />
					<p className="mt-3 text-sm font-medium text-[var(--sf-text-muted)]">
						{search.status ? "No orders with this status" : "No orders yet"}
					</p>
					{!search.status && (
						<Link
							to={"/store/products" as string}
							className="sf-btn-primary mt-4 inline-block text-sm"
						>
							Start Shopping
						</Link>
					)}
				</div>
			) : (
				<div className="space-y-3">
					{orders.map((o: any) => (
						<Link
							key={o.id}
							to={ROUTES.STORE.ACCOUNT.ORDER_DETAIL(o.id) as string}
							className="block rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-4 transition-colors hover:border-[var(--sf-rose)]"
						>
							<div className="flex items-start justify-between">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="text-sm font-semibold text-[var(--sf-text)]">
											{o.orderNumber}
										</p>
										<span
											className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColors[o.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
										>
											{o.status}
										</span>
									</div>
									<p className="mt-1 text-xs text-[var(--sf-text-muted)]">
										Placed {new Date(o.createdAt).toLocaleDateString(undefined, {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</p>
									<p className="mt-1 truncate text-xs text-[var(--sf-text-muted)]">
										{o.itemSummary}
										{o.itemCount > 3 ? ` +${o.itemCount - 3} more` : ""}
									</p>
								</div>
								<div className="ml-4 text-right">
									<p className="text-sm font-bold text-[var(--sf-text)]">
										{o.totalFormatted}
									</p>
									<p className="text-[10px] text-[var(--sf-text-muted)]">
										{o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
									</p>
								</div>
							</div>

							{/* Tracking info */}
							{o.trackingNumber && (
								<div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--sf-border-light)] px-3 py-2 text-xs">
									<Truck className="h-3.5 w-3.5 text-[var(--sf-rose)]" />
									<span className="text-[var(--sf-text-muted)]">
										{o.carrier}: {o.trackingNumber}
									</span>
								</div>
							)}
						</Link>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2 pt-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
						<button
							key={p}
							onClick={() =>
								navigate({
									to: ROUTES.STORE.ACCOUNT.ORDERS as string,
									search: { ...search, page: p } as any,
								})
							}
							className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
								p === search.page
									? "bg-[var(--sf-rose)] text-white"
									: "bg-[var(--sf-border-light)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]"
							}`}
						>
							{p}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
