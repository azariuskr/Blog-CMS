import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableColumnHeader, DataTablePagination } from "@/components/admin/data-table";
import { useTableFilters } from "@/hooks/use-table-url-state";
import { PriceDisplay } from "@/components/admin/ecommerce/shared";
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
import type { DiscountType } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import { useFilters } from "@/lib/filters/core";
import type { CouponFilters } from "@/lib/filters/schemas";
import { CouponFiltersSchema } from "@/lib/filters/schemas";
import { useAdminCoupons } from "@/lib/ecommerce/queries";
import { formatDate } from "@/lib/utils";
import { useOverlay } from "@/lib/store/overlay";
import {
	CouponFormDrawer,
	DeleteCouponDialog,
} from "@/components/admin/ecommerce/overlays";

interface CouponsViewProps {
	search?: CouponFilters;
}

interface CouponRowModel {
	id: string;
	code: string;
	discountType: DiscountType;
	discountValue: number;
	minOrderAmount: number | null;
	maxUses: number | null;
	usedCount: number;
	expiresAt: Date | null;
	isActive: boolean;
	createdAt: Date;
}

export function CouponsView({ search }: CouponsViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...CouponFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: CouponFilters) => CouponFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { pagination, onPaginationChange } = useTableFilters({
		filters,
		setFilters,
		pagination: { pageKey: "page", pageSizeKey: "limit", defaultPage: 1, defaultPageSize: 10 },
	});

	const canWrite = useHasPermission({ coupons: ["write"] });
	const canDelete = useHasPermission({ coupons: ["delete"] });

	const { data: couponsData, isLoading } = useAdminCoupons(filters);
	const coupons: CouponRowModel[] = (couponsData?.ok
		? couponsData.data.items.map((c: any) => ({
				id: c.id,
				code: c.code,
				discountType: c.discountType,
				discountValue: c.discountValue,
				minOrderAmount: c.minOrderAmount,
				maxUses: c.usageLimit,
				usedCount: c.usageCount,
				expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
				isActive: c.isActive,
				createdAt: new Date(c.createdAt),
			}))
		: []) as CouponRowModel[];
	const totalPages = couponsData?.ok ? couponsData.data.totalPages : 1;

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

	const copyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		toast.success("Coupon code copied");
	};

	const columns = useMemo<ColumnDef<CouponRowModel>[]>(
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
				accessorKey: "code",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Code" />
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<code className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
							{row.original.code}
						</code>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => copyCode(row.original.code)}
						>
							<Copy className="h-3 w-3" />
						</Button>
					</div>
				),
			},
			{
				accessorKey: "discountType",
				header: "Discount",
				cell: ({ row }) => {
					const coupon = row.original;
					if (coupon.discountType === "percentage") {
						return <span className="font-medium">{coupon.discountValue}%</span>;
					}
					return <PriceDisplay cents={coupon.discountValue} className="font-medium" />;
				},
			},
			{
				accessorKey: "usedCount",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Usage" />
				),
				cell: ({ row }) => {
					const coupon = row.original;
					if (coupon.maxUses) {
						return (
							<span className="text-muted-foreground">
								{coupon.usedCount} / {coupon.maxUses}
							</span>
						);
					}
					return (
						<span className="text-muted-foreground">{coupon.usedCount}</span>
					);
				},
			},
			{
				accessorKey: "minOrderAmount",
				header: "Min Order",
				cell: ({ row }) =>
					row.original.minOrderAmount ? (
						<PriceDisplay cents={row.original.minOrderAmount} />
					) : (
						<span className="text-muted-foreground">-</span>
					),
			},
			{
				accessorKey: "expiresAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Expires" />
				),
				cell: ({ row }) => {
					const expiresAt = row.original.expiresAt;
					if (!expiresAt) {
						return <span className="text-muted-foreground">Never</span>;
					}
					const isExpired = new Date(expiresAt) < new Date();
					return (
						<span
							className={isExpired ? "text-destructive" : "text-muted-foreground"}
						>
							{formatDate(expiresAt)}
						</span>
					);
				},
			},
			{
				accessorKey: "isActive",
				header: "Status",
				cell: ({ row }) => {
					const coupon = row.original;
					const isExpired =
						coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
					const isUsedUp =
						coupon.maxUses && coupon.usedCount >= coupon.maxUses;

					if (!coupon.isActive) {
						return <Badge variant="secondary">Inactive</Badge>;
					}
					if (isExpired) {
						return <Badge variant="destructive">Expired</Badge>;
					}
					if (isUsedUp) {
						return <Badge variant="secondary">Used Up</Badge>;
					}
					return <Badge variant="default">Active</Badge>;
				},
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const coupon = row.original;

					const actionGroups: ActionMenuGroup[] = [
						{
							label: "Actions",
							items: [
								{
									label: "Copy Code",
									icon: Copy,
									onClick: () => copyCode(coupon.code),
								},
								...(canWrite
									? [
											{
												label: "Edit",
												icon: Pencil,
												onClick: () => open("editCoupon", coupon),
											},
										]
									: []),
								...(canDelete
									? [
											{
												label: "Delete",
												icon: Trash2,
												onClick: () => open("deleteCoupon", coupon),
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

	const stableData = useMemo(() => coupons, [coupons]);

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
				sortBy: first.id as CouponFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
	<>
		<PageContainer
			title="Coupons"
			description="Manage discount codes and promotions"
			actions={
				<Button onClick={() => open("createCoupon")} disabled={!canWrite}>
					<Plus className="mr-2 h-4 w-4" />
					Add Coupon
				</Button>
			}
		>
			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search coupons..."
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
									<Button
										variant={filters.expired ? "default" : "outline"}
										size="sm"
										onClick={() =>
											setFilters({
												expired: filters.expired ? undefined : true,
												page: 1,
											})
										}
									>
										Expired
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
													No coupons found.
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

		<CouponFormDrawer />
		<DeleteCouponDialog />
	</>
	);
}
