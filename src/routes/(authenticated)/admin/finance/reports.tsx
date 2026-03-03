import { createFileRoute } from "@tanstack/react-router";
import {
	DollarSign,
	Package,
	PercentIcon,
	ShoppingCart,
	Tag,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
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
import { useFinancialReport } from "@/lib/ecommerce/queries";
import { formatPrice } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/finance/reports")({
	component: FinancialReportsPage,
});

type Period = "7d" | "30d" | "90d" | "12m" | "all";

const PERIOD_LABELS: Record<Period, string> = {
	"7d": "7 Days",
	"30d": "30 Days",
	"90d": "90 Days",
	"12m": "12 Months",
	all: "All Time",
};

const PROVIDER_COLORS: Record<string, string> = {
	stripe: "#635bff",
	polar: "#0ea5e9",
	other: "#6b7280",
};

function formatChartDate(dateStr: string) {
	if (dateStr.length === 7) {
		// YYYY-MM format (monthly)
		const [year, month] = dateStr.split("-");
		return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
	}
	const date = new Date(dateStr + "T00:00:00");
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatChartCurrency(value: number) {
	return `$${(value / 100).toFixed(0)}`;
}

function FinancialReportsPage() {
	const [period, setPeriod] = useState<Period>("30d");
	const { data: reportData, isLoading } = useFinancialReport(period);
	const report = reportData?.ok ? reportData.data : null;

	return (
		<PageContainer title="Financial Reports" description="Revenue analytics, product performance, and trends">

			{/* Period Selector */}
			<div className="flex flex-wrap gap-2">
				{(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
					<Button
						key={p}
						variant={period === p ? "default" : "outline"}
						size="sm"
						onClick={() => setPeriod(p)}
					>
						{PERIOD_LABELS[p]}
					</Button>
				))}
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="pt-6">
								<div className="h-16 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			) : !report ? (
				<Card>
					<CardContent className="py-16 text-center text-muted-foreground">
						No data available for this period
					</CardContent>
				</Card>
			) : (
				<>
					{/* KPI Cards */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{report.revenue.grossRevenueFormatted}</div>
								<p className="text-xs text-muted-foreground">
									{report.revenue.totalOrders} orders
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{report.revenue.netRevenueFormatted}</div>
								<p className="text-xs text-muted-foreground">
									After {report.cancellations.refundedCount} refunds
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
								<ShoppingCart className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{report.revenue.avgOrderValueFormatted}</div>
								<p className="text-xs text-muted-foreground">
									Per order average
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Refunds</CardTitle>
								<TrendingDown className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{report.cancellations.refundedAmountFormatted}</div>
								<p className="text-xs text-muted-foreground">
									{report.cancellations.cancelledCount} cancelled, {report.cancellations.refundedCount} refunded
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Revenue Breakdown */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card className="bg-blue-50/50">
							<CardContent className="pt-6">
								<p className="text-xs font-medium text-muted-foreground">Subtotal</p>
								<p className="mt-1 text-lg font-bold">{report.revenue.subtotalFormatted}</p>
							</CardContent>
						</Card>
						<Card className="bg-emerald-50/50">
							<CardContent className="pt-6">
								<p className="text-xs font-medium text-muted-foreground">Discounts Given</p>
								<p className="mt-1 text-lg font-bold text-emerald-700">-{report.revenue.totalDiscountFormatted}</p>
							</CardContent>
						</Card>
						<Card className="bg-amber-50/50">
							<CardContent className="pt-6">
								<p className="text-xs font-medium text-muted-foreground">Shipping Revenue</p>
								<p className="mt-1 text-lg font-bold">{report.revenue.totalShippingFormatted}</p>
							</CardContent>
						</Card>
						<Card className="bg-purple-50/50">
							<CardContent className="pt-6">
								<p className="text-xs font-medium text-muted-foreground">Tax Collected</p>
								<p className="mt-1 text-lg font-bold">{report.revenue.totalTaxFormatted}</p>
							</CardContent>
						</Card>
					</div>

					{/* Revenue Chart */}
					{report.revenueByPeriod.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Revenue Trend</CardTitle>
								<CardDescription>
									{period === "12m" || period === "all" ? "Monthly" : "Daily"} revenue over {PERIOD_LABELS[period].toLowerCase()}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart data={report.revenueByPeriod}>
										<defs>
											<linearGradient id="finRevenueGradient" x1="0" y1="0" x2="0" y2="1">
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
											formatter={(value: number, name: string) => [
												formatPrice(value),
												name === "revenue" ? "Revenue" : name === "discount" ? "Discounts" : "Orders",
											]}
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
											fill="url(#finRevenueGradient)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					)}

					{/* Orders per Period */}
					{report.revenueByPeriod.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Orders per {period === "12m" || period === "all" ? "Month" : "Day"}</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={report.revenueByPeriod}>
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

					<div className="grid gap-6 lg:grid-cols-2">
						{/* Top Products */}
						{report.topProducts.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-base flex items-center gap-2">
										<Package className="h-4 w-4" />
										Top Products by Revenue
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{report.topProducts.map((p: any, i: number) => (
											<div key={p.productName} className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
														{i + 1}
													</span>
													<div>
														<p className="text-sm font-medium">{p.productName}</p>
														<p className="text-xs text-muted-foreground">
															{p.totalQuantity} units in {p.orderCount} orders
														</p>
													</div>
												</div>
												<span className="text-sm font-bold">{p.totalRevenueFormatted}</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Payment Provider Breakdown */}
						{report.paymentBreakdown.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-base flex items-center gap-2">
										<PercentIcon className="h-4 w-4" />
										Payment Providers
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col items-center">
										<ResponsiveContainer width="100%" height={180}>
											<PieChart>
												<Pie
													data={report.paymentBreakdown}
													cx="50%"
													cy="50%"
													innerRadius={45}
													outerRadius={70}
													dataKey="totalAmount"
													paddingAngle={2}
												>
													{report.paymentBreakdown.map((entry: any) => (
														<Cell
															key={entry.provider}
															fill={PROVIDER_COLORS[entry.provider] ?? PROVIDER_COLORS.other}
														/>
													))}
												</Pie>
												<Tooltip
													formatter={(value: number) => [formatPrice(value), "Amount"]}
													contentStyle={{
														backgroundColor: "hsl(var(--card))",
														border: "1px solid hsl(var(--border))",
														borderRadius: "8px",
														fontSize: "12px",
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
										<div className="mt-2 flex flex-wrap justify-center gap-4">
											{report.paymentBreakdown.map((p: any) => (
												<div key={p.provider} className="text-center">
													<div className="flex items-center gap-1.5">
														<div
															className="h-2.5 w-2.5 rounded-full"
															style={{ backgroundColor: PROVIDER_COLORS[p.provider] ?? PROVIDER_COLORS.other }}
														/>
														<span className="text-xs font-medium capitalize">{p.provider}</span>
													</div>
													<p className="text-sm font-bold">{p.totalAmountFormatted}</p>
													<p className="text-xs text-muted-foreground">{p.count} payments</p>
												</div>
											))}
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Coupon Usage */}
					{report.couponUsage.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Tag className="h-4 w-4" />
									Coupon Performance
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
												<th className="px-4 py-2">Code</th>
												<th className="px-4 py-2 text-right">Uses</th>
												<th className="px-4 py-2 text-right">Discount Given</th>
												<th className="px-4 py-2 text-right">Order Value</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{report.couponUsage.map((c: any) => (
												<tr key={c.couponCode} className="hover:bg-muted/50">
													<td className="px-4 py-2">
														<span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
															{c.couponCode}
														</span>
													</td>
													<td className="px-4 py-2 text-right text-sm">{c.usageCount}</td>
													<td className="px-4 py-2 text-right text-sm text-emerald-600">
														-{c.totalDiscountFormatted}
													</td>
													<td className="px-4 py-2 text-right text-sm font-medium">
														{c.totalOrderValueFormatted}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</PageContainer>
	);
}
