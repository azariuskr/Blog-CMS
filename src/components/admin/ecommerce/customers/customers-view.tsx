import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Download, Eye, Mail, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableColumnHeader, DataTablePagination } from "@/components/admin/data-table";
import { useTableFilters } from "@/hooks/use-table-url-state";
import { PriceDisplay } from "@/components/admin/ecommerce/shared";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { ThrottledAvatar } from "@/components/shared/ThrottledAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/lib/filters/core";
import type { EcommerceCustomerFilters } from "@/lib/filters/schemas";
import { EcommerceCustomerFiltersSchema } from "@/lib/filters/schemas";
import { useAdminCustomers } from "@/lib/ecommerce/queries";
import { ROUTES } from "@/constants";
import { formatDate } from "@/lib/utils";

interface CustomersViewProps {
	search?: EcommerceCustomerFilters;
}

interface CustomerRowModel {
	id: string;
	name: string | null;
	email: string;
	image: string | null;
	orderCount: number;
	totalSpent: number;
	lastOrderAt: Date | null;
	createdAt: Date;
}

export function CustomersView({ search }: CustomersViewProps) {
	const navigate = useNavigate();

	const defaultSearch = useMemo(
		() => ({ ...EcommerceCustomerFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: EcommerceCustomerFilters) => EcommerceCustomerFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { pagination, onPaginationChange } = useTableFilters({
		filters,
		setFilters,
		pagination: { pageKey: "page", pageSizeKey: "limit", defaultPage: 1, defaultPageSize: 10 },
	});

	const { data: customersData, isLoading } = useAdminCustomers(filters);
	const customers: CustomerRowModel[] = (customersData?.ok
		? customersData.data.items.map((c: any) => ({
				id: c.id,
				name: c.name,
				email: c.email,
				image: c.image,
				orderCount: c.orderCount,
				totalSpent: c.totalSpent,
				lastOrderAt: c.lastOrderAt ? new Date(c.lastOrderAt) : null,
				createdAt: new Date(c.createdAt),
			}))
		: []) as CustomerRowModel[];
	const totalPages = customersData?.ok ? customersData.data.totalPages : 1;

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [searchValue, setSearchValue] = useState(filters.search ?? "");

	const sorting = useMemo<SortingState>(() => {
		if (!filters.sortBy) return [];
		return [
			{
				id: filters.sortBy,
				desc: filters.sortOrder === "desc",
			},
		];
	}, [filters.sortBy, filters.sortOrder]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchValue !== filters.search) {
				setFilters({ search: searchValue || undefined, page: 1 });
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [searchValue, filters.search, setFilters]);

	const columns = useMemo<ColumnDef<CustomerRowModel>[]>(
		() => [
			{
				accessorKey: "email",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Customer" />
				),
				cell: ({ row }) => {
					const customer = row.original;
					const initials =
						customer.name?.charAt(0).toUpperCase() ??
						customer.email.charAt(0).toUpperCase();
					return (
						<div className="flex items-center gap-3">
							<ThrottledAvatar
								className="h-10 w-10"
								src={customer.image ?? undefined}
								alt={customer.name ?? customer.email}
								fallback={initials}
							/>
							<div className="min-w-0">
								<div className="truncate font-medium">
									{customer.name ?? "Guest"}
								</div>
								<div className="truncate text-sm text-muted-foreground">
									{customer.email}
								</div>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "orderCount",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Orders" />
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<ShoppingBag className="h-4 w-4 text-muted-foreground" />
						<span>{row.original.orderCount}</span>
					</div>
				),
			},
			{
				accessorKey: "totalSpent",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Total Spent" />
				),
				cell: ({ row }) => (
					<PriceDisplay cents={row.original.totalSpent} className="font-medium" />
				),
			},
			{
				accessorKey: "lastOrderAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Last Order" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.lastOrderAt
							? formatDate(row.original.lastOrderAt)
							: "Never"}
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Customer Since" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{formatDate(row.original.createdAt)}
					</span>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const customer = row.original;

					const actionGroups: ActionMenuGroup[] = [
						{
							label: "Actions",
							items: [
								{
									label: "View Orders",
									icon: Eye,
									onClick: () => {
										navigate({ to: ROUTES.ADMIN.ORDERS, search: { search: customer.email } });
									},
								},
								{
									label: "Send Email",
									icon: Mail,
									onClick: () => {
										window.location.href = `mailto:${customer.email}`;
									},
								},
							],
						},
					];

					return <BaseActionMenu groups={actionGroups} />;
				},
			},
		],
		[],
	);

	const stableData = useMemo(() => customers, [customers]);

	const table = useReactTable({
		data: stableData,
		columns,
		state: {
			sorting,
			pagination,
			columnVisibility,
		},
		manualPagination: true,
		manualFiltering: true,
		manualSorting: true,
		pageCount: totalPages,
		onPaginationChange,
		onSortingChange: (updater) => {
			const next = typeof updater === "function" ? updater(sorting) : updater;
			const first = next[0];

			if (!first?.id) {
				setFilters({
					page: undefined,
					sortBy: undefined,
					sortOrder: undefined,
				});
				return;
			}

			setFilters({
				page: undefined,
				sortBy: first.id as EcommerceCustomerFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<PageContainer
			title="Customers"
			description="View customer information and order history"
			actions={
				<Button variant="outline">
					<Download className="mr-2 h-4 w-4" />
					Export
				</Button>
			}
		>
			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search customers..."
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
									className="max-w-sm"
								/>
								<Button
									variant={filters.hasOrders ? "default" : "outline"}
									size="sm"
									onClick={() =>
										setFilters({
											hasOrders: filters.hasOrders ? undefined : true,
											page: 1,
										})
									}
								>
									With Orders
								</Button>
							</div>

							<div className="rounded-md border">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<TableHead key={header.id}>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
													</TableHead>
												))}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										{table.getRowModel().rows?.length ? (
											table.getRowModel().rows.map((row) => (
												<TableRow key={row.id}>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</TableCell>
													))}
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell
													colSpan={columns.length}
													className="h-24 text-center"
												>
													No customers found.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>

							<DataTablePagination table={table} pageCount={totalPages} pagination={pagination} />
						</div>
					</LoadingSwap>
				</CardContent>
			</Card>
		</PageContainer>
	);
}
