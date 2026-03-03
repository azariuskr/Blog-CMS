import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Download,
	FileText,
	Search,
	ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useAdminInvoices } from "@/lib/ecommerce/queries";
import { formatPrice, ROUTES } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/finance/invoices")({
	component: InvoicesPage,
});

const ORDER_STATUS_BADGE: Record<string, string> = {
	confirmed: "bg-blue-50 text-blue-700",
	processing: "bg-indigo-50 text-indigo-700",
	shipped: "bg-purple-50 text-purple-700",
	delivered: "bg-green-50 text-green-700",
};

function InvoicesPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");

	const filters = {
		page,
		limit: pageSize,
		search: search || undefined,
	};

	const { data: invoicesData, isLoading } = useAdminInvoices(filters);
	const invoices = invoicesData?.ok ? invoicesData.data : null;

	const handleSearch = () => {
		setSearch(searchInput);
		setPage(1);
	};

	return (
		<PageContainer title="Invoices" description="Invoices generated from completed orders">

			{/* Search */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center gap-3">
						<div className="relative flex-1 min-w-[200px]">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								placeholder="Search by order number or email..."
								className="pl-10"
							/>
						</div>
						<Button onClick={handleSearch} variant="secondary" size="sm">
							Search
						</Button>
						{search && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
							>
								Clear
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Invoices Table */}
			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="space-y-3 p-6">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="h-12 animate-pulse rounded bg-muted" />
							))}
						</div>
					) : !invoices?.items?.length ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<FileText className="h-12 w-12 text-muted-foreground/30" />
							<p className="mt-4 text-sm text-muted-foreground">No invoices found</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
											<th className="px-6 py-3">Invoice #</th>
											<th className="px-6 py-3">Customer</th>
											<th className="px-6 py-3">Status</th>
											<th className="px-6 py-3 text-right">Subtotal</th>
											<th className="px-6 py-3 text-right">Discount</th>
											<th className="px-6 py-3 text-right">Tax</th>
											<th className="px-6 py-3 text-right">Total</th>
											<th className="px-6 py-3">Date</th>
											<th className="px-6 py-3" />
										</tr>
									</thead>
									<tbody className="divide-y">
										{invoices.items.map((inv: any) => {
											const billingName = inv.billingAddress
												? `${inv.billingAddress.firstName} ${inv.billingAddress.lastName}`
												: inv.customerEmail ?? "Guest";
											return (
												<tr key={inv.id} className="transition-colors hover:bg-muted/50">
													<td className="px-6 py-4">
														<span className="font-mono text-sm font-medium">
															INV-{inv.orderNumber}
														</span>
													</td>
													<td className="px-6 py-4">
														<p className="text-sm font-medium">{billingName}</p>
														{inv.customerEmail && (
															<p className="text-xs text-muted-foreground">{inv.customerEmail}</p>
														)}
													</td>
													<td className="px-6 py-4">
														<span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ORDER_STATUS_BADGE[inv.status] ?? "bg-gray-50 text-gray-700"}`}>
															{inv.status}
														</span>
													</td>
													<td className="px-6 py-4 text-right text-sm">
														{formatPrice(inv.subtotal)}
													</td>
													<td className="px-6 py-4 text-right text-sm">
														{inv.discount > 0 ? (
															<span className="text-emerald-600">-{formatPrice(inv.discount)}</span>
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</td>
													<td className="px-6 py-4 text-right text-sm">
														{inv.tax > 0 ? formatPrice(inv.tax) : (
															<span className="text-muted-foreground">-</span>
														)}
													</td>
													<td className="px-6 py-4 text-right font-medium">
														{formatPrice(inv.total)}
													</td>
													<td className="px-6 py-4 text-sm text-muted-foreground">
														{new Date(inv.createdAt).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
															year: "numeric",
														})}
													</td>
													<td className="px-6 py-4">
														<div className="flex items-center gap-2">
															<Link
																to={`/admin/orders/${inv.id}` as string}
																className="text-muted-foreground hover:text-foreground"
																title="View order"
															>
																<ExternalLink className="h-4 w-4" />
															</Link>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							{invoices.totalPages != null && (
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
											Page {page} of {Math.max(1, invoices.totalPages)}
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
											<Button variant="outline" className="h-8 w-8 p-0" disabled={page >= invoices.totalPages} onClick={() => setPage(page + 1)}>
												<span className="sr-only">Next page</span>
												<ChevronRight className="h-4 w-4" />
											</Button>
											<Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" disabled={page >= invoices.totalPages} onClick={() => setPage(invoices.totalPages)}>
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
