import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	CreditCard,
	Search,
	ExternalLink,
	CheckCircle,
	Clock,
	XCircle,
	RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { useAdminPayments } from "@/lib/ecommerce/queries";
import { formatPrice, ROUTES } from "@/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/app-layout";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/(authenticated)/admin/finance/payments")({
	component: PaymentsPage,
});

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
	completed: { icon: CheckCircle, label: "Completed", className: "text-green-600 bg-green-50" },
	pending: { icon: Clock, label: "Pending", className: "text-yellow-600 bg-yellow-50" },
	failed: { icon: XCircle, label: "Failed", className: "text-red-600 bg-red-50" },
	refunded: { icon: RotateCcw, label: "Refunded", className: "text-gray-600 bg-gray-50" },
};

function PaymentsPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchInput, setSearchInput] = useState("");

	const filters = {
		page,
		limit: pageSize,
		search: search || undefined,
		status: statusFilter !== "all" ? [statusFilter as "pending" | "completed" | "failed" | "refunded"] : undefined,
	};

	const { data: paymentsData, isLoading } = useAdminPayments(filters);
	const payments = paymentsData?.ok ? paymentsData.data : null;

	const handleSearch = () => {
		setSearch(searchInput);
		setPage(1);
	};

	return (
		<PageContainer title="Payments" description="All order payment transactions">

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap items-center gap-3">
						<div className="relative flex-1 min-w-[200px]">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								placeholder="Search by order number or payment ID..."
								className="pl-10"
							/>
						</div>
						<Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="failed">Failed</SelectItem>
								<SelectItem value="refunded">Refunded</SelectItem>
							</SelectContent>
						</Select>
						<Button onClick={handleSearch} variant="secondary" size="sm">
							Search
						</Button>
						{(search || statusFilter !== "all") && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setSearch("");
									setSearchInput("");
									setStatusFilter("all");
									setPage(1);
								}}
							>
								Clear
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Payments Table */}
			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="space-y-3 p-6">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="h-12 animate-pulse rounded bg-muted" />
							))}
						</div>
					) : !payments?.items?.length ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<CreditCard className="h-12 w-12 text-muted-foreground/30" />
							<p className="mt-4 text-sm text-muted-foreground">No payments found</p>
						</div>
					) : (
						<>
							{/* Desktop table */}
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
											<th className="px-6 py-3">Order</th>
											<th className="px-6 py-3">Provider</th>
											<th className="px-6 py-3">Status</th>
											<th className="px-6 py-3 text-right">Amount</th>
											<th className="px-6 py-3">Date</th>
											<th className="px-6 py-3" />
										</tr>
									</thead>
									<tbody className="divide-y">
										{payments.items.map((p: any) => {
											const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
											const StatusIcon = statusCfg.icon;
											return (
												<tr key={p.id} className="transition-colors hover:bg-muted/50">
													<td className="px-6 py-4">
														<Link
															to={`/admin/orders/${p.orderId}` as string}
															className="font-medium text-primary hover:underline"
														>
															{p.orderNumber}
														</Link>
														{p.customerEmail && (
															<p className="text-xs text-muted-foreground">{p.customerEmail}</p>
														)}
													</td>
													<td className="px-6 py-4">
														<span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
															{p.provider}
														</span>
													</td>
													<td className="px-6 py-4">
														<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
															<StatusIcon className="h-3 w-3" />
															{statusCfg.label}
														</span>
													</td>
													<td className="px-6 py-4 text-right font-medium">
														{formatPrice(p.amount)}
														<p className="text-xs text-muted-foreground uppercase">{p.currency}</p>
													</td>
													<td className="px-6 py-4 text-sm text-muted-foreground">
														{new Date(p.createdAt).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
															year: "numeric",
														})}
														{p.paidAt && (
															<p className="text-xs">
																Paid {new Date(p.paidAt).toLocaleDateString()}
															</p>
														)}
													</td>
													<td className="px-6 py-4">
														<Link
															to={`/admin/orders/${p.orderId}` as string}
															className="text-muted-foreground hover:text-foreground"
														>
															<ExternalLink className="h-4 w-4" />
														</Link>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							{payments.totalPages != null && (
								<div className="flex items-center justify-between border-t px-6 py-3">
									<div className="flex items-center gap-2">
										<p className="hidden text-sm font-medium sm:block">Rows per page</p>
										<Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
											<SelectTrigger className="h-8 w-17.5">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[5, 10, 20, 50].map((size) => (
													<SelectItem key={size} value={String(size)}>{size}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-center gap-6 lg:gap-8">
										<div className="flex items-center justify-center text-sm font-medium">
											Page {page} of {Math.max(1, payments.totalPages)}
										</div>
										<div className="flex items-center gap-2">
											<Button variant="outline" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)}>
												<span className="sr-only">First page</span>
												<ChevronsLeft className="h-4 w-4" />
											</Button>
											<Button variant="outline" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
												<span className="sr-only">Previous page</span>
												<ChevronLeft className="h-4 w-4" />
											</Button>
											<Button variant="outline" className="h-8 w-8 p-0" disabled={page >= payments.totalPages} onClick={() => setPage(page + 1)}>
												<span className="sr-only">Next page</span>
												<ChevronRight className="h-4 w-4" />
											</Button>
											<Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" disabled={page >= payments.totalPages} onClick={() => setPage(payments.totalPages)}>
												<span className="sr-only">Last page</span>
												<ChevronsRight className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</PageContainer>
	);
}
