import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableColumnHeader, DataTablePagination } from "@/components/admin/data-table";
import { useTableFilters } from "@/hooks/use-table-url-state";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { CategoryFilters } from "@/lib/filters/schemas";
import { CategoryFiltersSchema } from "@/lib/filters/schemas";
import { useAdminCategories } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import {
	CategoryFormDrawer,
	DeleteCategoryDialog,
} from "@/components/admin/ecommerce/overlays";

interface CategoriesViewProps {
	search?: CategoryFilters;
}

interface CategoryRowModel {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	imageUrl: string | null;
	parentId: string | null;
	parentName: string | null;
	isActive: boolean;
	sortOrder: number;
	productCount: number;
	childCount: number;
	createdAt: Date;
}

export function CategoriesView({ search }: CategoriesViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...CategoryFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: CategoryFilters) => CategoryFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { pagination, onPaginationChange } = useTableFilters({
		filters,
		setFilters,
		pagination: { pageKey: "page", pageSizeKey: "limit", defaultPage: 1, defaultPageSize: 10 },
	});

	const canWrite = useHasPermission({ products: ["write"] });
	const canDelete = useHasPermission({ products: ["delete"] });

	const { data: categoriesData, isLoading } = useAdminCategories(filters);
	const categories: CategoryRowModel[] = (categoriesData?.ok
		? categoriesData.data.items.map((c: any) => ({
				id: c.id,
				name: c.name,
				slug: c.slug,
				description: c.description,
				imageUrl: c.imageUrl,
				parentId: c.parentId,
				parentName: c.parentName,
				isActive: c.isActive,
				sortOrder: c.sortOrder,
				productCount: c.productCount ?? 0,
				childCount: c.childCount ?? 0,
				createdAt: new Date(c.createdAt),
			}))
		: []) as CategoryRowModel[];
	const totalPages = categoriesData?.ok ? categoriesData.data.totalPages : 1;

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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

	const columns = useMemo<ColumnDef<CategoryRowModel>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						aria-label="Select all"
						checked={table.getIsAllPageRowsSelected()}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(Boolean(value))
						}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						aria-label="Select row"
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
					/>
				),
				enableSorting: false,
				enableHiding: false,
				size: 32,
			},
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => (
					<span className="font-medium">{row.original.name}</span>
				),
			},
			{
				accessorKey: "parentName",
				header: "Parent",
				cell: ({ row }) =>
					row.original.parentName ? (
						<span className="text-muted-foreground">
							{row.original.parentName}
						</span>
					) : (
						<span className="text-muted-foreground">—</span>
					),
			},
			{
				accessorKey: "isActive",
				header: "Status",
				cell: ({ row }) =>
					row.original.isActive ? (
						<Badge variant="default">Active</Badge>
					) : (
						<Badge variant="secondary">Inactive</Badge>
					),
			},
			{
				accessorKey: "sortOrder",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Sort Order" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.sortOrder}
					</span>
				),
			},
			{
				accessorKey: "productCount",
				header: "Products",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.productCount}
					</span>
				),
			},
			{
				accessorKey: "childCount",
				header: "Children",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.childCount}
					</span>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const cat = row.original;

					const actionGroups: ActionMenuGroup[] = [
						{
							label: "Actions",
							items: [
								...(canWrite
									? [
											{
												label: "Edit",
												icon: Pencil,
												onClick: () => open("editCategory", cat),
											},
										]
									: []),
								...(canDelete
									? [
											{
												label: "Delete",
												icon: Trash2,
												onClick: () => open("deleteCategory", cat),
												variant: "destructive" as const,
											},
										]
									: []),
							],
						},
					];

					return <BaseActionMenu groups={actionGroups} />;
				},
			},
		],
		[canWrite, canDelete, open],
	);

	const stableData = useMemo(() => categories, [categories]);

	const table = useReactTable({
		data: stableData,
		columns,
		state: {
			sorting,
			pagination,
			rowSelection,
			columnVisibility,
		},
		manualPagination: true,
		manualFiltering: true,
		manualSorting: true,
		pageCount: totalPages,
		enableRowSelection: true,
		onPaginationChange,
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
				sortBy: first.id as CategoryFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
	<>
		<PageContainer
			title="Categories"
			description="Manage product categories"
			actions={
				<Button onClick={() => open("createCategory")} disabled={!canWrite}>
					<Plus className="mr-2 h-4 w-4" />
					Add Category
				</Button>
			}
		>
			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search categories..."
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
									className="max-w-sm"
								/>
								<div className="flex gap-2">
									<Button
										variant={filters.active ? "default" : "outline"}
										size="sm"
										onClick={() =>
											setFilters({
												active: filters.active ? undefined : true,
												page: 1,
											})
										}
									>
										Active Only
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
													No categories found.
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

		<CategoryFormDrawer />
		<DeleteCategoryDialog />
	</>
	);
}
