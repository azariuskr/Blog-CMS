import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnFiltersState,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
	type PaginationState,
	type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
	AlertTriangle,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	MessageSquare,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableBulkActions, type BulkOperation } from "@/components/admin/data-table/bulk-actions";
import { DataTablePagination } from "@/components/admin/data-table/pagination";
import { DataTableToolbar } from "@/components/admin/data-table/toolbar";
import { DataTableViewOptions } from "@/components/admin/data-table/view-options";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	useApproveComment,
	useComments,
	useDeleteComment,
	useSpamComment,
} from "@/lib/blog/queries";
import { ROLES, ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/dashboard/comments")({
	beforeLoad: ({ context }) => {
		const role = context.user?.user?.role;
		const allowed = [ROLES.AUTHOR, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
		if (!role || !allowed.includes(role as any)) {
			throw redirect({ to: ROUTES.DASHBOARD as string, replace: true });
		}
	},
	component: DashboardCommentsPage,
});

type CommentStatus = "pending" | "approved" | "spam";

type CommentRow = {
	id: string;
	authorId: string;
	content: string;
	status: CommentStatus;
	createdAt: string | Date | null;
	postId: string;
	post?: { id: string; title: string; slug: string } | null;
};

const statusConfig: Record<CommentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	pending: { label: "Pending", variant: "outline" },
	approved: { label: "Approved", variant: "default" },
	spam: { label: "Spam", variant: "destructive" },
};

const STATUS_OPTIONS = [
	{ label: "Pending", value: "pending" },
	{ label: "Approved", value: "approved" },
	{ label: "Spam", value: "spam" },
];

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "—";
	const d = value instanceof Date ? value : new Date(value);
	return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

const columnHelper = createColumnHelper<CommentRow>();

function DashboardCommentsPage() {
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(new Set());

	const page = pagination.pageIndex + 1;
	const limit = pagination.pageSize;

	// Derive status from column filters
	const statusFilter = (columnFilters.find((f) => f.id === "status")?.value as string[] | undefined)?.[0] as CommentStatus | undefined;

	const commentsQuery = useComments({
		status: statusFilter,
		page,
		limit,
	});
	const approveComment = useApproveComment();
	const spamComment = useSpamComment();
	const deleteComment = useDeleteComment();

	const items: CommentRow[] = (commentsQuery.data as any)?.data?.items ?? [];
	const total: number = (commentsQuery.data as any)?.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const toggleExpand = (id: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const columns = useMemo(
		() => [
			columnHelper.display({
				id: "select",
				size: 32,
				header: ({ table }) => (
					<Checkbox
						checked={table.getIsAllPageRowsSelected()}
						onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(v) => row.toggleSelected(!!v)}
					/>
				),
			}),
			columnHelper.display({
				id: "comment",
				header: "Comment",
				cell: ({ row }) => {
					const c = row.original;
					const isExpanded = expanded.has(c.id);
					const isLong = (c.content ?? "").length > 100;
					return (
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 mb-0.5">
								<span className="text-xs font-medium truncate max-w-[160px]">{c.authorId}</span>
								<span className="text-[10px] text-muted-foreground shrink-0">{formatDate(c.createdAt)}</span>
							</div>
							<p className={`text-sm text-foreground leading-snug${isExpanded ? "" : " line-clamp-1"}`}>
								{c.content}
							</p>
							{isLong && (
								<button
									type="button"
									onClick={() => toggleExpand(c.id)}
									className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
								>
									{isExpanded ? <><ChevronUp className="w-3 h-3" />less</> : <><ChevronDown className="w-3 h-3" />more</>}
								</button>
							)}
						</div>
					);
				},
			}),
			columnHelper.display({
				id: "post",
				header: "Post",
				size: 120,
				cell: ({ row }) => {
					const { post, postId } = row.original;
					const title = post?.title ?? postId;
					const slug = post?.slug;
					return slug ? (
						<Link
							to={"/$slug" as string}
							params={{ slug } as any}
							target="_blank"
							className="text-[11px] text-[var(--bg-carolina-blue)] hover:underline line-clamp-1 block max-w-[120px]"
						>
							{title}
						</Link>
					) : (
						<span className="text-[11px] text-muted-foreground line-clamp-1 block max-w-[120px]">{title}</span>
					);
				},
			}),
			columnHelper.accessor("status", {
				id: "status",
				header: "Status",
				size: 90,
				filterFn: (row, columnId, filterValue: string[]) => {
					if (!filterValue?.length) return true;
					return filterValue.includes(row.getValue(columnId));
				},
				cell: ({ row }) => {
					const cfg = statusConfig[row.original.status] ?? statusConfig.pending;
					return <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>;
				},
			}),
			columnHelper.display({
				id: "actions",
				header: "",
				size: 80,
				cell: ({ row }) => {
					const c = row.original;
					return (
						<div className="flex items-center justify-end gap-0.5">
							{c.status !== "approved" && (
								<button type="button" title="Approve"
									onClick={() => approveComment.mutate({ id: c.id })}
									disabled={approveComment.isPending}
									className="p-1 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-40">
									<CheckCircle className="w-3.5 h-3.5" />
								</button>
							)}
							{c.status !== "spam" && (
								<button type="button" title="Mark spam"
									onClick={() => spamComment.mutate({ id: c.id })}
									disabled={spamComment.isPending}
									className="p-1 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors disabled:opacity-40">
									<AlertTriangle className="w-3.5 h-3.5" />
								</button>
							)}
							<button type="button" title="Delete"
								onClick={() => deleteComment.mutate({ id: c.id })}
								disabled={deleteComment.isPending}
								className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40">
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
					);
				},
			}),
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[expanded, approveComment.isPending, spamComment.isPending, deleteComment.isPending],
	);

	const table = useReactTable({
		data: items,
		columns,
		state: { rowSelection, pagination, columnFilters, globalFilter },
		onRowSelectionChange: setRowSelection,
		onPaginationChange: (updater) => {
			const next = typeof updater === "function" ? updater(pagination) : updater;
			setPagination(next);
			setRowSelection({});
		},
		onColumnFiltersChange: (updater) => {
			const next = typeof updater === "function" ? updater(columnFilters) : updater;
			setColumnFilters(next);
			setPagination((p) => ({ ...p, pageIndex: 0 }));
			setRowSelection({});
		},
		onGlobalFilterChange: (value) => {
			setGlobalFilter(value);
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		globalFilterFn: (row, _columnId, filterValue: string) => {
			const q = filterValue.toLowerCase();
			return (
				(row.original.content ?? "").toLowerCase().includes(q) ||
				(row.original.authorId ?? "").toLowerCase().includes(q)
			);
		},
		manualPagination: true,
		pageCount: totalPages,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableRowSelection: true,
		getRowId: (row) => row.id,
	});

	const bulkOperations = useMemo<BulkOperation<CommentRow, { id: string }>[]>(
		() => [
			{
				label: "Approve",
				icon: CheckCircle,
				variant: "outline",
				getItemData: (row) => ({ id: row.original.id }),
				execute: (vars) => approveComment.mutateAsync(vars),
				onComplete: ({ successCount }) => toast.success(`${successCount} comment${successCount !== 1 ? "s" : ""} approved`),
			},
			{
				label: "Spam",
				icon: AlertTriangle,
				variant: "outline",
				getItemData: (row) => ({ id: row.original.id }),
				execute: (vars) => spamComment.mutateAsync(vars),
				onComplete: ({ successCount }) => toast.success(`${successCount} comment${successCount !== 1 ? "s" : ""} marked as spam`),
			},
			{
				label: "Delete",
				icon: Trash2,
				variant: "destructive",
				requireConfirmation: true,
				getItemData: (row) => ({ id: row.original.id }),
				execute: (vars) => deleteComment.mutateAsync(vars),
				onComplete: ({ successCount }) => toast.success(`${successCount} comment${successCount !== 1 ? "s" : ""} deleted`),
			},
		],
		[approveComment, spamComment, deleteComment],
	);

	return (
		<PageContainer title="Comments" description="Approve or remove comments on your posts.">
			{/* Toolbar row */}
			<div className="flex items-center justify-between gap-3">
				<DataTableToolbar
					table={table}
					searchPlaceholder="Search comments…"
					filters={[
						{
							columnId: "status",
							title: "Status",
							options: STATUS_OPTIONS,
						},
					]}
				/>
				<DataTableViewOptions table={table} />
			</div>

			{/* Bulk actions */}
			<DataTableBulkActions
				table={table}
				entityName="comment"
				operations={bulkOperations}
				batchOptions={{ enabled: true, batchSize: 5, delayMs: 100 }}
			/>

			{/* Table */}
			<div className="rounded-lg border overflow-hidden">
				{/* Header */}
				<div className="grid grid-cols-[32px_1fr_120px_90px_80px] items-center gap-3 px-3 py-2 bg-muted/40 border-b">
					{table.getHeaderGroups()[0]?.headers.map((header) => (
						<div key={header.id} className="text-xs font-medium text-muted-foreground">
							{flexRender(header.column.columnDef.header, header.getContext())}
						</div>
					))}
				</div>

				{commentsQuery.isLoading ? (
					<div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
						<MessageSquare className="w-5 h-5 opacity-40 animate-pulse" />
						<span className="text-sm">Loading…</span>
					</div>
				) : commentsQuery.isError ? (
					<div className="flex flex-col items-center justify-center py-16 gap-2 text-destructive">
						<MessageSquare className="w-8 h-8 opacity-40" />
						<span className="text-sm">Failed to load comments</span>
					</div>
				) : table.getRowModel().rows.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
						<MessageSquare className="w-8 h-8 opacity-40" />
						<span className="text-sm">No comments found</span>
					</div>
				) : (
					<div className="divide-y">
						{table.getRowModel().rows.map((row) => (
							<div
								key={row.id}
								className={`grid grid-cols-[32px_1fr_120px_90px_80px] items-start gap-3 px-3 py-2 hover:bg-muted/20 transition-colors${row.getIsSelected() ? " bg-muted/30" : ""}`}
							>
								{row.getVisibleCells().map((cell) => (
									<div key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Pagination */}
			<DataTablePagination
				table={table}
				pageCount={totalPages}
				pagination={pagination}
				pageSizeOptions={[10, 25, 50, 100]}
			/>
		</PageContainer>
	);
}
