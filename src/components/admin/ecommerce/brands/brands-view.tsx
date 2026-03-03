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
import type { BrandFilters } from "@/lib/filters/schemas";
import { BrandFiltersSchema } from "@/lib/filters/schemas";
import { useAdminBrands } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import {
	BrandFormDrawer,
	DeleteBrandDialog,
} from "@/components/admin/ecommerce/overlays";

interface BrandsViewProps {
	search?: BrandFilters;
}

interface BrandRowModel {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	logoUrl: string | null;
	websiteUrl: string | null;
	isActive: boolean;
	sortOrder: number;
	productCount: number;
	createdAt: Date;
}

export function BrandsView({ search }: BrandsViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...BrandFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: BrandFilters) => BrandFilters;
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

	const { data: brandsData, isLoading } = useAdminBrands(filters);
	const brands: BrandRowModel[] = (brandsData?.ok
		? brandsData.data.items.map((b: any) => ({
				id: b.id,
				name: b.name,
				slug: b.slug,
				description: b.description,
				logoUrl: b.logoUrl,
				websiteUrl: b.websiteUrl,
				isActive: b.isActive,
				sortOrder: b.sortOrder,
				productCount: b.productCount ?? 0,
				createdAt: new Date(b.createdAt),
			}))
		: []) as BrandRowModel[];
	const totalPages = brandsData?.ok ? brandsData.data.totalPages : 1;

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

	const columns = useMemo<ColumnDef<BrandRowModel>[]>(
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
				accessorKey: "slug",
				header: "Slug",
				cell: ({ row }) => (
					<code className="rounded bg-muted px-2 py-1 font-mono text-sm">
						{row.original.slug}
					</code>
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
				id: "actions",
				cell: ({ row }) => {
					const brand = row.original;

					const actionGroups: ActionMenuGroup[] = [
						{
							label: "Actions",
							items: [
								...(canWrite
									? [
											{
												label: "Edit",
												icon: Pencil,
												onClick: () => open("editBrand", brand),
											},
										]
									: []),
								...(canDelete
									? [
											{
												label: "Delete",
												icon: Trash2,
												onClick: () => open("deleteBrand", brand),
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

	const stableData = useMemo(() => brands, [brands]);

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
				sortBy: first.id as BrandFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
	<>
		<PageContainer
			title="Brands"
			description="Manage product brands"
			actions={
				<Button onClick={() => open("createBrand")} disabled={!canWrite}>
					<Plus className="mr-2 h-4 w-4" />
					Add Brand
				</Button>
			}
		>
			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search brands..."
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
													No brands found.
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

		<BrandFormDrawer />
		<DeleteBrandDialog />
	</>
	);
}
