import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Box,
	CreditCard,
	DollarSign,
	FileText,
	Package,
	ShoppingCart,
	Star,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	useOrderStats,
	useAdminOrders,
	useAdminReviews,
	useDailyRevenue,
	usePaymentStats,
} from "@/lib/ecommerce/queries";
import { useDashboardUserStats } from "@/lib/auth/queries";
import { formatPrice, ROUTES } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/")({
	component: AdminDashboardPage,
});

const STATUS_COLORS: Record<string, string> = {
	pending: "#eab308",
	confirmed: "#3b82f6",
	processing: "#6366f1",
	shipped: "#a855f7",
	delivered: "#22c55e",
	cancelled: "#ef4444",
	refunded: "#6b7280",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-700",
	confirmed: "bg-blue-100 text-blue-700",
	processing: "bg-indigo-100 text-indigo-700",
	shipped: "bg-purple-100 text-purple-700",
	delivered: "bg-green-100 text-green-700",
	cancelled: "bg-red-100 text-red-700",
	refunded: "bg-gray-100 text-gray-700",
};

function formatChartDate(dateStr: string) {
	const date = new Date(dateStr + "T00:00:00");
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatChartCurrency(value: number) {
	return `$${(value / 100).toFixed(0)}`;
}

function AdminDashboardPage() {
	const { data: statsData, isLoading: statsLoading } = useOrderStats();
	const { data: paymentStatsData } = usePaymentStats();
	const { data: userStatsData, isLoading: userStatsLoading } = useDashboardUserStats();
	const { data: recentOrdersData } = useAdminOrders({ page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" });
	const { data: pendingReviewsData } = useAdminReviews({ page: 1, limit: 5, approved: false });
	const { data: dailyRevenueData } = useDailyRevenue(30);

	const stats = statsData?.ok ? statsData.data : null;
	const paymentStats = paymentStatsData?.ok ? paymentStatsData.data : null;
	const userStats = userStatsData?.ok ? userStatsData.data : null;
	const recentOrders = recentOrdersData?.ok ? recentOrdersData.data?.items ?? [] : [];
	const pendingReviews = pendingReviewsData?.ok ? pendingReviewsData.data?.items ?? [] : [];
	const dailyRevenue = dailyRevenueData?.ok ? dailyRevenueData.data : [];

	const statusChartData = stats
		? Object.entries(stats.statusCounts)
				.filter(([, cnt]) => (cnt as number) > 0)
				.map(([status, cnt]) => ({
					name: status.charAt(0).toUpperCase() + status.slice(1),
					value: cnt as number,
					color: STATUS_COLORS[status] ?? "#6b7280",
				}))
		: [];

	const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

	return (
		<PageContainer title="Dashboard" description={`Welcome back. Here's your store overview for ${monthName}.`}>

			{/* Primary KPIs: Revenue */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">This Month</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statsLoading ? "..." : stats?.month.revenueFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.month.orderCount ?? 0} orders
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">This Week</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statsLoading ? "..." : stats?.week.revenueFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.week.orderCount ?? 0} orders
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Today</CardTitle>
						<CreditCard className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statsLoading ? "..." : stats?.today.revenueFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.today.orderCount ?? 0} orders
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
						<ShoppingCart className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statsLoading ? "..." : (stats?.pendingCount ?? 0) + (stats?.needsFulfillment ?? 0)}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.pendingCount ?? 0} pending, {stats?.needsFulfillment ?? 0} to fulfill
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Billing & Finance */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">Billing & Finance</h2>
					<Link
						to={ROUTES.ADMIN.FINANCE_PAYMENTS as string}
						className="text-xs font-medium text-primary hover:underline"
					>
						View payments
					</Link>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
							<DollarSign className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{paymentStats?.allTime.totalAmountFormatted ?? "$0.00"}
							</div>
							<p className="text-xs text-muted-foreground">
								{paymentStats?.allTime.completedCount ?? 0} completed payments
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{paymentStats?.allTime.netRevenueFormatted ?? "$0.00"}
							</div>
							<p className="text-xs text-muted-foreground">After refunds</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Refunded</CardTitle>
							<TrendingDown className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{paymentStats?.allTime.totalRefundedFormatted ?? "$0.00"}
							</div>
							<p className="text-xs text-muted-foreground">
								{paymentStats?.allTime.refundedCount ?? 0} refunds
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
							<CreditCard className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{paymentStats?.last30Days.totalAmountFormatted ?? "$0.00"}
							</div>
							<p className="text-xs text-muted-foreground">
								{paymentStats?.last30Days.count ?? 0} transactions
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Payment Status Breakdown */}
				{paymentStats && (
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[
							{ label: "Pending", count: paymentStats.allTime.pendingCount, color: "text-yellow-600 bg-yellow-50" },
							{ label: "Completed", count: paymentStats.allTime.completedCount, color: "text-green-600 bg-green-50" },
							{ label: "Failed", count: paymentStats.allTime.failedCount, color: "text-red-600 bg-red-50" },
							{ label: "Refunded", count: paymentStats.allTime.refundedCount, color: "text-gray-600 bg-gray-50" },
						].map((s) => (
							<div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
								<p className="text-2xl font-bold">{s.count}</p>
								<p className="text-sm font-medium">{s.label}</p>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Users */}
			<Card className="bg-blue-50/30">
				<CardContent className="flex items-center justify-between pt-5 pb-4">
					<div>
						<p className="text-xs font-medium text-muted-foreground">Total Users</p>
						<p className="mt-1 text-lg font-bold">
							{userStatsLoading ? "..." : userStats?.totalUsers ?? 0}
						</p>
						<p className="text-[10px] text-muted-foreground">
							{userStats?.activeCount ?? 0} active
						</p>
					</div>
					<Users className="h-5 w-5 text-blue-500" />
				</CardContent>
			</Card>

			{/* Revenue Chart + Order Status */}
			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Revenue (Last 30 Days)</CardTitle>
						<CardDescription>Daily revenue trend</CardDescription>
					</CardHeader>
					<CardContent>
						{dailyRevenue.length > 0 ? (
							<ResponsiveContainer width="100%" height={280}>
								<AreaChart data={dailyRevenue}>
									<defs>
										<linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
									<XAxis
										dataKey="date"
										tickFormatter={formatChartDate}
										tick={{ fontSize: 12 }}
										interval="preserveStartEnd"
										className="fill-muted-foreground"
									/>
									<YAxis
										tickFormatter={formatChartCurrency}
										tick={{ fontSize: 12 }}
										className="fill-muted-foreground"
									/>
									<Tooltip
										formatter={(value: number) => [formatPrice(value), "Revenue"]}
										labelFormatter={formatChartDate}
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
											borderRadius: "8px",
											fontSize: "12px",
										}}
									/>
									<Area
										type="monotone"
										dataKey="revenue"
										stroke="#3b82f6"
										strokeWidth={2}
										fill="url(#revenueGradient)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						) : (
							<div className="flex h-[280px] items-center justify-center text-muted-foreground">
								No revenue data yet
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Order Status</CardTitle>
						<CardDescription>Distribution by status</CardDescription>
					</CardHeader>
					<CardContent>
						{statusChartData.length > 0 ? (
							<div className="flex flex-col items-center">
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={statusChartData}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={80}
											dataKey="value"
											paddingAngle={2}
										>
											{statusChartData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip
											formatter={(value: number) => [value, "Orders"]}
											contentStyle={{
												backgroundColor: "hsl(var(--card))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "8px",
												fontSize: "12px",
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
								<div className="mt-2 flex flex-wrap justify-center gap-2">
									{statusChartData.map((entry) => (
										<div key={entry.name} className="flex items-center gap-1.5 text-xs">
											<div
												className="h-2.5 w-2.5 rounded-full"
												style={{ backgroundColor: entry.color }}
											/>
											<span className="text-muted-foreground">
												{entry.name} ({entry.value})
											</span>
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="flex h-[200px] items-center justify-center text-muted-foreground">
								No order data yet
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Orders per Day */}
			{dailyRevenue.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Orders per Day</CardTitle>
						<CardDescription>Daily order count (last 30 days)</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={180}>
							<BarChart data={dailyRevenue}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="date"
									tickFormatter={formatChartDate}
									tick={{ fontSize: 12 }}
									interval="preserveStartEnd"
									className="fill-muted-foreground"
								/>
								<YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
								<Tooltip
									formatter={(value: number) => [value, "Orders"]}
									labelFormatter={formatChartDate}
									contentStyle={{
										backgroundColor: "hsl(var(--card))",
										border: "1px solid hsl(var(--border))",
										borderRadius: "8px",
										fontSize: "12px",
									}}
								/>
								<Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}

			{/* Quick Actions */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[
					{ label: "Products", icon: Box, to: ROUTES.ADMIN.PRODUCTS, color: "bg-blue-50 text-blue-600" },
					{ label: "Orders", icon: Package, to: ROUTES.ADMIN.ORDERS, color: "bg-purple-50 text-purple-600" },
					{ label: "Payments", icon: Wallet, to: ROUTES.ADMIN.FINANCE_PAYMENTS, color: "bg-emerald-50 text-emerald-600" },
					{ label: "Reports", icon: FileText, to: ROUTES.ADMIN.FINANCE_REPORTS, color: "bg-amber-50 text-amber-600" },
				].map((action) => (
					<Link
						key={action.label}
						to={action.to as string}
						className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
					>
						<div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
							<action.icon className="h-5 w-5" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium">{action.label}</p>
						</div>
						<ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</Link>
				))}
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Recent Orders */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">Recent Orders</CardTitle>
						<Link
							to={ROUTES.ADMIN.ORDERS as string}
							className="text-xs font-medium text-primary hover:underline"
						>
							View all
						</Link>
					</CardHeader>
					<CardContent>
						{recentOrders.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
						) : (
							<div className="space-y-3">
								{recentOrders.map((o: any) => (
									<Link
										key={o.id}
										to={`/admin/orders/${o.id}` as string}
										className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
									>
										<div className="space-y-1">
											<p className="text-sm font-medium">{o.orderNumber}</p>
											<p className="text-xs text-muted-foreground">
												{o.user?.name || o.guestEmail || "Guest"}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-semibold">{formatPrice(o.total)}</p>
											<span
												className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_COLORS[o.status] ?? "bg-gray-100 text-gray-700"}`}
											>
												{o.status}
											</span>
										</div>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Pending Reviews */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">
							Pending Reviews
							{pendingReviews.length > 0 && (
								<span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
									{pendingReviews.length}
								</span>
							)}
						</CardTitle>
						<Link
							to={ROUTES.ADMIN.REVIEWS as string}
							className="text-xs font-medium text-primary hover:underline"
						>
							View all
						</Link>
					</CardHeader>
					<CardContent>
						{pendingReviews.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No reviews awaiting approval
							</p>
						) : (
							<div className="space-y-3">
								{pendingReviews.map((r: any) => (
									<div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
										<div className="flex">
											{Array.from({ length: 5 }).map((_, i) => (
												<svg
													key={i}
													className={`h-3.5 w-3.5 ${i < r.rating ? "text-amber-400" : "text-gray-200"}`}
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
												</svg>
											))}
										</div>
										<div className="flex-1 space-y-1">
											<p className="text-sm font-medium line-clamp-1">{r.title || "No title"}</p>
											<p className="text-xs text-muted-foreground line-clamp-2">{r.content}</p>
											<p className="text-[10px] text-muted-foreground">
												by {r.userName ?? r.userEmail} on {r.productName}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</PageContainer>
	);
}
