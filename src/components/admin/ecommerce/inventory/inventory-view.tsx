import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { AlertTriangle, ArrowUpDown, Download, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableColumnHeader, DataTablePagination } from "@/components/admin/data-table";
import { useTableFilters } from "@/hooks/use-table-url-state";
import { PriceDisplay, StockBadge } from "@/components/admin/ecommerce/shared";
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
import { useHasPermission } from "@/hooks/auth-hooks";
import { useFilters } from "@/lib/filters/core";
import type { InventoryFilters } from "@/lib/filters/schemas";
import { InventoryFiltersSchema } from "@/lib/filters/schemas";
import { useAdminInventory } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import { AdjustStockDialog } from "@/components/admin/ecommerce/overlays";

interface InventoryViewProps {
	search?: InventoryFilters;
}

interface InventoryRowModel {
	id: string;
	sku: string;
	productId: string;
	productName: string;
	variantName: string | null;
	stock: number;
	reservedStock: number;
	availableStock: number;
	price: number;
	lowStockThreshold: number;
	imageUrl: string | null;
}

export function InventoryView({ search }: InventoryViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...InventoryFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: InventoryFilters) => InventoryFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { pagination, onPaginationChange } = useTableFilters({
		filters,
		setFilters,
		pagination: { pageKey: "page", pageSizeKey: "limit", defaultPage: 1, defaultPageSize: 10 },
	});

	const canAdjust = useHasPermission({ inventory: ["adjust"] });

	const { data: inventoryData, isLoading } = useAdminInventory(filters);
	const inventory: InventoryRowModel[] = (inventoryData?.ok ? inventoryData.data.items : []) as InventoryRowModel[];
	const totalPages = inventoryData?.ok ? inventoryData.data.totalPages : 1;
	const lowStockCount = inventoryData?.ok ? (inventoryData.data as any).lowStockCount ?? 0 : 0;

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

	const columns = useMemo<ColumnDef<InventoryRowModel>[]>(
		() => [
			{
				accessorKey: "sku",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="SKU" />
				),
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.original.sku}</span>
				),
			},
			{
				accessorKey: "productName",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Product" />
				),
				cell: ({ row }) => {
					const item = row.original;
					return (
						<div className="flex items-center gap-3">
							{item.imageUrl ? (
								<img
									src={item.imageUrl}
									alt={item.productName}
									className="h-10 w-10 rounded-md object-cover"
								/>
							) : (
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
									<Package className="h-4 w-4 text-muted-foreground" />
								</div>
							)}
							<div className="min-w-0">
								<div className="truncate font-medium">{item.productName}</div>
								{item.variantName && (
									<div className="truncate text-sm text-muted-foreground">
										{item.variantName}
									</div>
								)}
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "stock",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Total Stock" />
				),
				cell: ({ row }) => (
					<span className="font-medium">{row.original.stock}</span>
				),
			},
			{
				accessorKey: "reservedStock",
				header: "Reserved",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.reservedStock}
					</span>
				),
			},
			{
				accessorKey: "availableStock",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Available" />
				),
				cell: ({ row }) => (
					<StockBadge
						stock={row.original.availableStock}
						lowStockThreshold={row.original.lowStockThreshold}
					/>
				),
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Price" />
				),
				cell: ({ row }) => <PriceDisplay cents={row.original.price} />,
			},
			{
				id: "actions",
				cell: ({ row }) => {
					if (!canAdjust) return null;
					return (
						<Button
							variant="outline"
							size="sm"
							onClick={() => open("adjustStock", row.original)}
						>
							<ArrowUpDown className="mr-2 h-3 w-3" />
							Adjust
						</Button>
					);
				},
			},
		],
		[canAdjust, open],
	);

	const stableData = useMemo(() => inventory, [inventory]);

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
				sortBy: first.id as InventoryFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
	<>
		<PageContainer
			title="Inventory"
			description="Manage product stock levels"
			actions={
				<Button variant="outline">
					<Download className="mr-2 h-4 w-4" />
					Export
				</Button>
			}
		>
			{lowStockCount > 0 && (
				<Card className="mb-6 border-orange-200 bg-orange-50">
					<CardContent className="flex items-center gap-3 py-4">
						<AlertTriangle className="h-5 w-5 text-orange-600" />
						<div>
							<p className="font-medium text-orange-800">
								{lowStockCount} items with low stock
							</p>
							<p className="text-sm text-orange-600">
								Review these items to avoid stockouts
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="ml-auto"
							onClick={() => setFilters({ lowStock: true, page: 1 })}
						>
							View Low Stock
						</Button>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search by SKU or product..."
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
									className="max-w-sm"
								/>
								<div className="flex gap-2">
									<Button
										variant={filters.lowStock ? "default" : "outline"}
										size="sm"
										onClick={() =>
											setFilters({
												lowStock: filters.lowStock ? undefined : true,
												page: 1,
											})
										}
									>
										Low Stock
									</Button>
									<Button
										variant={filters.outOfStock ? "default" : "outline"}
										size="sm"
										onClick={() =>
											setFilters({
												outOfStock: filters.outOfStock ? undefined : true,
												page: 1,
											})
										}
									>
										Out of Stock
									</Button>
								</div>
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
													No inventory items found.
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

		<AdjustStockDialog />
	</>
	);
}
