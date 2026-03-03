import type { SortingState } from "@tanstack/react-table";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import {
	DataTableBulkActions,
	DataTablePagination,
	DataTableToolbar,
	DataTableViewOptions,
} from "@/components/admin/data-table";
import type { BulkOperation } from "@/components/admin/data-table/bulk-actions";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ROLE_OPTIONS, USER_STATUS_OPTIONS } from "@/constants";
import { useTableFilters } from "@/hooks/use-table-url-state";
import { useUserFacets } from "@/lib/auth/queries";
import type { UserFilters } from "@/lib/filters/schemas";
import type { UserRowModel } from "@/types/user";

interface UsersTableProps {
	data: UserRowModel[];
	columns: ColumnDef<UserRowModel>[];
	filters: UserFilters;
	setFilters: (updates: Partial<UserFilters>) => void;
	isLoading?: boolean;
	bulkOperations: BulkOperation<UserRowModel, { userId: string }>[];
	pageCount: number;
}

export function UsersTable({
	data,
	columns,
	filters,
	setFilters,
	isLoading = false,
	bulkOperations,
	pageCount,
}: UsersTableProps) {
	// Local UI states (not synced with URL)
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const sorting = useMemo<SortingState>(() => {
		if (!filters.sortBy) return [];
		if (
			filters.sortBy === "name" ||
			filters.sortBy === "email" ||
			filters.sortBy === "createdAt" ||
			filters.sortBy === "updatedAt" ||
			filters.sortBy === "role"
		) {
			return [
				{
					id: filters.sortBy,
					desc: filters.sortOrder === "desc",
				},
			];
		}
		return [];
	}, [filters.sortBy, filters.sortOrder]);

	// Use the hook to bridge URL state to TanStack Table state
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
			{ columnId: "email", filterKey: "search", type: "string" },
			{ columnId: "role", filterKey: "role", type: "array" },
			{ columnId: "status", filterKey: "status", type: "array" },
		],
	});

	// Memoize stable data reference to prevent unnecessary re-renders
	const stableData = useMemo(() => data, [data]);

	const facetsQuery = useUserFacets({
		search: filters.search,
		role: filters.role,
		status: filters.status,
	});
	const facets = facetsQuery.data?.ok ? facetsQuery.data.data : null;

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

			const sortBy =
				first.id === "name" ||
				first.id === "email" ||
				first.id === "createdAt" ||
				first.id === "updatedAt" ||
				first.id === "role"
					? first.id
					: undefined;

			setFilters({
				page: undefined,
				sortBy,
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		autoResetPageIndex: false,
	});

	// Ensure page is in valid range when filtered data changes
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
						searchPlaceholder="Filter users..."
						searchKey="email"
						filters={[
							{
								columnId: "status",
								title: "Status",
								options: [...USER_STATUS_OPTIONS],
								counts: facets?.statusCounts ?? null,
							},
							{
								columnId: "role",
								title: "Role",
								options: [...ROLE_OPTIONS],
								counts: facets?.roleCounts ?? null,
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
										No results.
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
					entityName="user"
					batchOptions={{ enabled: true, batchSize: 5, delayMs: 100 }}
					operations={bulkOperations}
				/>
			</div>
		</LoadingSwap>
	);
}
