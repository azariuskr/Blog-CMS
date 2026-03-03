import type { SortingState } from "@tanstack/react-table";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Archive, CheckCircle, FileEdit } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DataTableBulkActions,
	DataTablePagination,
	DataTableToolbar,
	DataTableViewOptions,
} from "@/components/admin/data-table";
import type { BulkOperation } from "@/components/admin/data-table/bulk-actions";
import type { ProductRowModel } from "@/components/admin/ecommerce/products/products-columns";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUSES } from "@/constants";
import { useTableFilters } from "@/hooks/use-table-url-state";
import type { ProductFilters } from "@/lib/filters/schemas";

interface ProductsTableProps {
	data: ProductRowModel[];
	columns: ColumnDef<ProductRowModel>[];
	filters: ProductFilters;
	setFilters: (updates: Partial<ProductFilters>) => void;
	isLoading?: boolean;
	bulkOperations: BulkOperation<ProductRowModel, { productId: string }>[];
	pageCount: number;
	facets?: {
		statusCounts?: Record<string, number>;
	} | null;
}

const PRODUCT_STATUS_OPTIONS = PRODUCT_STATUSES.map((status) => ({
	value: status,
	label: PRODUCT_STATUS_LABELS[status],
	icon:
		status === "active"
			? CheckCircle
			: status === "draft"
				? FileEdit
				: Archive,
}));

export function ProductsTable({
	data,
	columns,
	filters,
	setFilters,
	isLoading = false,
	bulkOperations,
	pageCount,
	facets,
}: ProductsTableProps) {
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	const sorting = useMemo<SortingState>(() => {
		if (!filters.sortBy) return [];
		return [
			{
				id: filters.sortBy,
				desc: filters.sortOrder === "desc",
			},
		];
	}, [filters.sortBy, filters.sortOrder]);

	const {
		pagination,
		onPaginationChange,
		columnFilters,
		onColumnFiltersChange,
		ensurePageInRange,
	} = useTableFilters({
		filters,
		setFilters,
		pagination: {
			pageKey: "page",
			pageSizeKey: "limit",
			defaultPage: 1,
			defaultPageSize: 10,
		},
		columnFilters: [
			{ columnId: "name", filterKey: "search", type: "string" },
			{ columnId: "status", filterKey: "status", type: "array" },
		],
	});

	const stableData = useMemo(() => data, [data]);

	const table = useReactTable({
		data: stableData,
		columns,
		state: {
			sorting,
			pagination,
			rowSelection,
			columnFilters,
			columnVisibility,
		},
		manualPagination: true,
		manualFiltering: true,
		manualSorting: true,
		pageCount,
		enableRowSelection: true,
		onPaginationChange,
		onColumnFiltersChange,
		onRowSelectionChange: setRowSelection,
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
				sortBy: first.id as ProductFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		autoResetPageIndex: false,
	});

	useEffect(() => {
		if (isLoading) return;
		if (pageCount > 0) ensurePageInRange(pageCount);
	}, [isLoading, pageCount, ensurePageInRange]);

	return (
		<LoadingSwap isLoading={isLoading}>
			<div className="flex flex-1 flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<DataTableToolbar
						table={table}
						searchPlaceholder="Search products..."
						searchKey="name"
						filters={[
							{
								columnId: "status",
								title: "Status",
								options: [...PRODUCT_STATUS_OPTIONS],
								counts: facets?.statusCounts ?? null,
							},
						]}
					/>
					<DataTableViewOptions table={table} />
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
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
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
										No products found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<DataTablePagination
					table={table}
					pageCount={pageCount}
					pagination={pagination}
				/>

				<DataTableBulkActions
					table={table}
					entityName="product"
					batchOptions={{ enabled: true, batchSize: 5, delayMs: 100 }}
					operations={bulkOperations}
				/>
			</div>
		</LoadingSwap>
	);
}
