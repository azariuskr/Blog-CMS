import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { CheckCircle, Eye, Plus, Star, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableColumnHeader, DataTablePagination } from "@/components/admin/data-table";
import { useTableFilters } from "@/hooks/use-table-url-state";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { ThrottledAvatar } from "@/components/shared/ThrottledAvatar";
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
import {
	useApproveReview,
	useRejectReview,
} from "@/hooks/ecommerce-actions";
import { useFilters } from "@/lib/filters/core";
import type { ReviewFilters } from "@/lib/filters/schemas";
import { ReviewFiltersSchema } from "@/lib/filters/schemas";
import { useAdminReviews } from "@/lib/ecommerce/queries";
import { formatDate } from "@/lib/utils";
import { useOverlay } from "@/lib/store/overlay";
import {
	CreateReviewDrawer,
	ViewReviewDrawer,
	DeleteReviewDialog,
} from "@/components/admin/ecommerce/overlays";

interface ReviewsViewProps {
	search?: ReviewFilters;
}

interface ReviewRowModel {
	id: string;
	rating: number;
	title: string | null;
	content: string;
	isApproved: boolean;
	isVerifiedPurchase: boolean;
	helpfulCount: number;
	productId: string;
	productName: string;
	productImage: string | null;
	userId: string | null;
	userName: string | null;
	userEmail: string;
	userImage: string | null;
	createdAt: Date;
}

function StarRating({ rating }: { rating: number }) {
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					className={`h-4 w-4 ${
						star <= rating
							? "fill-yellow-400 text-yellow-400"
							: "text-muted-foreground"
					}`}
				/>
			))}
		</div>
	);
}

export function ReviewsView({ search }: ReviewsViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...ReviewFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: ReviewFilters) => ReviewFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { pagination, onPaginationChange } = useTableFilters({
		filters,
		setFilters,
		pagination: { pageKey: "page", pageSizeKey: "limit", defaultPage: 1, defaultPageSize: 10 },
	});

	const canWrite = useHasPermission({ reviews: ["write"] });
	const canApprove = useHasPermission({ reviews: ["approve"] });
	const canDelete = useHasPermission({ reviews: ["delete"] });

	const { data: reviewsData, isLoading } = useAdminReviews(filters);
	const approveMutation = useApproveReview();
	const rejectMutation = useRejectReview();

	const reviews: ReviewRowModel[] = (reviewsData?.ok ? reviewsData.data.items : []) as ReviewRowModel[];
	const totalPages = reviewsData?.ok ? reviewsData.data.totalPages : 1;
	const pendingCount = reviewsData?.ok ? (reviewsData.data as any).pendingCount ?? 0 : 0;

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

	const columns = useMemo<ColumnDef<ReviewRowModel>[]>(
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
				accessorKey: "productName",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Product" />
				),
				cell: ({ row }) => {
					const review = row.original;
					return (
						<div className="flex items-center gap-3">
							{review.productImage ? (
								<img
									src={review.productImage}
									alt={review.productName}
									className="h-10 w-10 rounded-md object-cover"
								/>
							) : (
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
									<Star className="h-4 w-4 text-muted-foreground" />
								</div>
							)}
							<span className="truncate font-medium">{review.productName}</span>
						</div>
					);
				},
			},
			{
				accessorKey: "rating",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Rating" />
				),
				cell: ({ row }) => <StarRating rating={row.original.rating} />,
			},
			{
				accessorKey: "content",
				header: "Review",
				cell: ({ row }) => {
					const review = row.original;
					return (
						<div className="max-w-xs">
							{review.title && (
								<div className="truncate font-medium">{review.title}</div>
							)}
							<div className="truncate text-sm text-muted-foreground">
								{review.content}
							</div>
						</div>
					);
				},
			},
			{
				id: "reviewer",
				header: "Reviewer",
				cell: ({ row }) => {
					const review = row.original;
					const initials =
						review.userName?.charAt(0).toUpperCase() ??
						review.userEmail.charAt(0).toUpperCase();
					return (
						<div className="flex items-center gap-2">
							<ThrottledAvatar
								className="h-8 w-8"
								src={review.userImage ?? undefined}
								alt={review.userName ?? review.userEmail}
								fallback={initials}
							/>
							<div className="min-w-0">
								<div className="truncate text-sm font-medium">
									{review.userName ?? "Anonymous"}
								</div>
								{review.isVerifiedPurchase && (
									<Badge variant="secondary" className="text-xs">
										Verified Purchase
									</Badge>
								)}
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "isApproved",
				header: "Status",
				cell: ({ row }) =>
					row.original.isApproved ? (
						<Badge variant="default">Approved</Badge>
					) : (
						<Badge variant="secondary">Pending</Badge>
					),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Date" />
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
					const review = row.original;

					const actionGroups: ActionMenuGroup[] = [
						{
							label: "Actions",
							items: [
								{
									label: "View Full",
									icon: Eye,
									onClick: () => open("viewReview", review),
								},
								...(canApprove && !review.isApproved
									? [
											{
												label: "Approve",
												icon: CheckCircle,
												onClick: () => {
													approveMutation.mutate({ reviewId: review.id });
												},
											},
										]
									: []),
								...(canApprove && review.isApproved
									? [
											{
												label: "Reject",
												icon: XCircle,
												onClick: () => {
													rejectMutation.mutate({ reviewId: review.id });
												},
											},
										]
									: []),
								...(canDelete
									? [
											{
												label: "Delete",
												icon: Trash2,
												onClick: () => open("deleteReview", review),
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
		[canApprove, canDelete, open],
	);

	const stableData = useMemo(() => reviews, [reviews]);

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
				sortBy: first.id as ReviewFilters["sortBy"],
				sortOrder: first.desc ? "desc" : "asc",
			});
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
	<>
		<PageContainer
			title="Reviews"
			description="Moderate customer reviews"
			actions={
				canWrite && (
					<Button onClick={() => open("createReview")}>
						<Plus className="mr-2 h-4 w-4" />
						Create Review
					</Button>
				)
			}
		>
			{pendingCount > 0 && (
				<Card className="mb-6 border-yellow-200 bg-yellow-50">
					<CardContent className="flex items-center gap-3 py-4">
						<Star className="h-5 w-5 text-yellow-600" />
						<div>
							<p className="font-medium text-yellow-800">
								{pendingCount} reviews pending approval
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent>
					<LoadingSwap isLoading={isLoading}>
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-center gap-3">
								<Input
									placeholder="Search reviews..."
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
									className="max-w-sm"
								/>
								<div className="flex gap-2">
									<Button
										variant={
											filters.approved === false ? "default" : "outline"
										}
										size="sm"
										onClick={() =>
											setFilters({
												approved:
													filters.approved === false ? undefined : false,
												page: 1,
											})
										}
									>
										Pending
									</Button>
									<Button
										variant={filters.verified ? "default" : "outline"}
										size="sm"
										onClick={() =>
											setFilters({
												verified: filters.verified ? undefined : true,
												page: 1,
											})
										}
									>
										Verified Only
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
													No reviews found.
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

		<CreateReviewDrawer />
		<ViewReviewDrawer />
		<DeleteReviewDialog />
	</>
	);
}
