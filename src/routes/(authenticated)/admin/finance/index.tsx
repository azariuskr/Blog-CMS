import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CreditCard,
	DollarSign,
	FileText,
	LineChart,
	TrendingDown,
	TrendingUp,
	ArrowRight,
} from "lucide-react";
import { usePaymentStats } from "@/lib/ecommerce/queries";
import { ROUTES } from "@/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/finance/")({
	component: FinanceOverviewPage,
});

function FinanceOverviewPage() {
	const { data: statsData, isLoading } = usePaymentStats();
	const stats = statsData?.ok ? statsData.data : null;

	return (
		<PageContainer title="Billing & Finance" description="Overview of payments, invoices, and financial data.">

			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? "..." : stats?.allTime.totalAmountFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.allTime.completedCount ?? 0} completed payments
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
							{isLoading ? "..." : stats?.allTime.netRevenueFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							After refunds
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Refunded</CardTitle>
						<TrendingDown className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? "..." : stats?.allTime.totalRefundedFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.allTime.refundedCount ?? 0} refunds
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
							{isLoading ? "..." : stats?.last30Days.totalAmountFormatted ?? "$0.00"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.last30Days.count ?? 0} transactions
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Links */}
			<div className="grid gap-4 md:grid-cols-3">
				{[
					{
						label: "Payments",
						description: "View all order payments and transactions",
						icon: CreditCard,
						to: ROUTES.ADMIN.FINANCE_PAYMENTS,
						color: "bg-blue-50 text-blue-600",
					},
					{
						label: "Invoices",
						description: "Manage and download order invoices",
						icon: FileText,
						to: ROUTES.ADMIN.FINANCE_INVOICES,
						color: "bg-emerald-50 text-emerald-600",
					},
					{
						label: "Financial Reports",
						description: "Revenue analytics, top products, and trends",
						icon: LineChart,
						to: ROUTES.ADMIN.FINANCE_REPORTS,
						color: "bg-purple-50 text-purple-600",
					},
				].map((action) => (
					<Link
						key={action.label}
						to={action.to as string}
						className="group flex items-center gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-accent"
					>
						<div className={`flex h-12 w-12 items-center justify-center rounded-lg ${action.color}`}>
							<action.icon className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-semibold">{action.label}</p>
							<p className="text-xs text-muted-foreground">{action.description}</p>
						</div>
						<ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</Link>
				))}
			</div>

			{/* Payment Status Breakdown */}
			{stats && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Payment Status Breakdown</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{[
								{ label: "Pending", count: stats.allTime.pendingCount, color: "text-yellow-600 bg-yellow-50" },
								{ label: "Completed", count: stats.allTime.completedCount, color: "text-green-600 bg-green-50" },
								{ label: "Failed", count: stats.allTime.failedCount, color: "text-red-600 bg-red-50" },
								{ label: "Refunded", count: stats.allTime.refundedCount, color: "text-gray-600 bg-gray-50" },
							].map((s) => (
								<div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
									<p className="text-2xl font-bold">{s.count}</p>
									<p className="text-sm font-medium">{s.label}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</PageContainer>
	);
}
