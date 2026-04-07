import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	type ColumnDef,
	type SortingState,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronUp,
	ChevronDown,
	ChevronsUpDown,
	Eye,
	Filter,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
	Edit,
	PenLine,
	Send,
	CheckCircle,
	Archive,
	RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer } from "@/components/admin/app-layout";
import { DataTableBulkActions, type BulkOperation } from "@/components/admin/data-table/bulk-actions";
import { ROUTES } from "@/constants";
import { useAdminPosts, useDeletePost, useTransitionPostStatus } from "@/lib/blog/queries";
import { PremiumSwitch } from "@/components/admin/blog/PremiumSwitch";
import { useSession } from "@/lib/auth/auth-client";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/admin/blog/posts/")({
	component: AdminBlogPostsPage,
});

type PostStatus = "published" | "draft" | "review" | "archived" | "scheduled";

const statusConfig: Record<PostStatus, { label: string; className: string }> = {
	published: {
		label: "Published",
		className: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
	},
	draft: {
		label: "Draft",
		className: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
	},
	review: {
		label: "In Review",
		className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
	},
	archived: {
		label: "Archived",
		className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
	},
	scheduled: {
		label: "Scheduled",
		className: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
	},
};

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString();
}

type Post = {
	id: string;
	title: string;
	slug: string;
	status: string;
	author?: { name?: string } | null;
	category?: { name?: string } | null;
	publishedAt?: string | Date | null;
	viewCount?: number | null;
};

function SortIcon({
	isSorted,
}: {
	isSorted: false | "asc" | "desc";
}) {
	if (isSorted === "asc")
		return <ChevronUp className="ml-1 inline h-3.5 w-3.5" />;
	if (isSorted === "desc")
		return <ChevronDown className="ml-1 inline h-3.5 w-3.5" />;
	return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
}

function AdminBlogPostsPage() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const postsQuery = useAdminPosts({
		search: search || undefined,
		status: statusFilter === "all" ? undefined : statusFilter,
		limit: 100,
	});
	const deletePost = useDeletePost();
	const transitionStatus = useTransitionPostStatus();
	const { data: session } = useSession();
	const userRole = (session?.user as any)?.role ?? "user";
	const isAuthor = userRole === "author";
	const canPublish = ["admin", "superAdmin", "author"].includes(userRole);
	const canDelete = ["admin", "superAdmin", "moderator"].includes(userRole);

	const posts = useMemo(
		() => (postsQuery.data?.ok ? postsQuery.data.data.items : []),
		[postsQuery.data],
	);

	const columns = useMemo<ColumnDef<Post>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							(table.getIsAllPageRowsSelected()
								? true
								: table.getIsSomePageRowsSelected()
									? "indeterminate"
									: false) as boolean | undefined
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "title",
				header: "Title",
				cell: ({ row }) => (
					<p className="font-medium line-clamp-1">{row.original.title}</p>
				),
			},
			{
				id: "author",
				accessorFn: (row) => row.author?.name ?? "",
				header: "Author",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.author?.name ?? "—"}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const cfg =
						statusConfig[row.original.status as PostStatus] ??
						statusConfig.draft;
					return <Badge className={cfg.className}>{cfg.label}</Badge>;
				},
			},
			{
				id: "premium",
				header: "Premium",
				cell: ({ row }) => (
					<PremiumSwitch
						postId={row.original.id}
						authorId={(row.original as any).authorId}
						title={row.original.title}
						slug={row.original.slug}
						status={row.original.status}
						checked={(row.original as any).isPremium ?? false}
					/>
				),
			},
			{
				id: "category",
				accessorFn: (row) => row.category?.name ?? "",
				header: "Category",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.category?.name ?? "—"}
					</span>
				),
			},
			{
				accessorKey: "publishedAt",
				header: "Published",
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{formatDate(row.original.publishedAt)}
					</span>
				),
				sortingFn: (rowA, rowB) => {
					const a = rowA.original.publishedAt
						? new Date(rowA.original.publishedAt).getTime()
						: 0;
					const b = rowB.original.publishedAt
						? new Date(rowB.original.publishedAt).getTime()
						: 0;
					return a - b;
				},
			},
			{
				accessorKey: "viewCount",
				header: "Views",
				cell: ({ row }) => (
					<div className="flex items-center justify-end gap-1 text-muted-foreground">
						<Eye className="w-3.5 h-3.5" />
						{(row.original.viewCount ?? 0).toLocaleString()}
					</div>
				),
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				cell: ({ row }) => {
					const post = row.original;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger {...{asChild: true} as any}>
								<Button variant="ghost" size="icon">
									<MoreHorizontal className="h-4 w-4" />
									<span className="sr-only">Actions</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem {...{asChild: true} as any}>
									<Link
										to={ROUTES.ADMIN.BLOG.POST_EDIT(post.id) as string}
									>
										<Edit className="mr-2 h-4 w-4" />
										Edit
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem {...{asChild: true} as any}>
									<Link
										to={"/$slug" as string}
										params={{ slug: post.slug } as any}
										target="_blank"
									>
										<Eye className="mr-2 h-4 w-4" />
										Preview
									</Link>
								</DropdownMenuItem>
								{/* Workflow transitions */}
								{post.status === "draft" && (
									<DropdownMenuItem
										onClick={() => transitionStatus.mutate({ id: post.id, to: "review" })}
									>
										<Send className="mr-2 h-4 w-4" />
										Submit for Review
									</DropdownMenuItem>
								)}
								{post.status === "review" && (
									<DropdownMenuItem
										onClick={() => transitionStatus.mutate({ id: post.id, to: "draft" })}
									>
										<RotateCcw className="mr-2 h-4 w-4" />
										Return to Draft
									</DropdownMenuItem>
								)}
								{post.status === "review" && canPublish && (
									<DropdownMenuItem
										onClick={() => transitionStatus.mutate({ id: post.id, to: "published" })}
									>
										<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
										Publish
									</DropdownMenuItem>
								)}
								{post.status === "published" && canPublish && (
									<DropdownMenuItem
										onClick={() => transitionStatus.mutate({ id: post.id, to: "archived" })}
									>
										<Archive className="mr-2 h-4 w-4" />
										Archive
									</DropdownMenuItem>
								)}
								{post.status === "archived" && canPublish && (
									<DropdownMenuItem
										onClick={() => transitionStatus.mutate({ id: post.id, to: "draft" })}
									>
										<RotateCcw className="mr-2 h-4 w-4" />
										Restore to Draft
									</DropdownMenuItem>
								)}
								{canDelete && (
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => handleDelete(post.id, post.title)}
										disabled={deletePost.isPending}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
				enableSorting: false,
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[deletePost.isPending, transitionStatus.isPending, canPublish, canDelete],
	);

	const table = useReactTable({
		data: posts as unknown as Post[],
		columns,
		state: {
			sorting,
			rowSelection,
		},
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableRowSelection: true,
	});

	const handleDelete = async (id: string, title: string) => {
		if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
		const result = await deletePost.mutateAsync(id);
		if (result?.ok) {
			toast.success("Post deleted.");
		} else {
			toast.error("Failed to delete post.");
		}
	};

	const bulkOperations = useMemo<BulkOperation<Post, { id: string }>[]>(
		() => [
			...(canPublish
				? [
						{
							label: "Publish",
							icon: CheckCircle,
							variant: "outline" as const,
							getItemData: (row: import("@tanstack/react-table").Row<Post>) => ({ id: row.original.id }),
							execute: (vars: { id: string }) => transitionStatus.mutateAsync({ id: vars.id, to: "published" }),
							onComplete: ({ successCount }: { successCount: number; failureCount: number }) =>
								toast.success(`${successCount} post${successCount !== 1 ? "s" : ""} published`),
						},
						{
							label: "Unpublish",
							icon: RotateCcw,
							variant: "outline" as const,
							getItemData: (row: import("@tanstack/react-table").Row<Post>) => ({ id: row.original.id }),
							execute: (vars: { id: string }) => transitionStatus.mutateAsync({ id: vars.id, to: "draft" }),
							onComplete: ({ successCount }: { successCount: number; failureCount: number }) =>
								toast.success(`${successCount} post${successCount !== 1 ? "s" : ""} moved to draft`),
						},
						{
							label: "Archive",
							icon: Archive,
							variant: "outline" as const,
							getItemData: (row: import("@tanstack/react-table").Row<Post>) => ({ id: row.original.id }),
							execute: (vars: { id: string }) => transitionStatus.mutateAsync({ id: vars.id, to: "archived" }),
							onComplete: ({ successCount }: { successCount: number; failureCount: number }) =>
								toast.success(`${successCount} post${successCount !== 1 ? "s" : ""} archived`),
						},
					]
				: []),
			...(canDelete
				? [
						{
							label: "Delete",
							icon: Trash2,
							variant: "destructive" as const,
							requireConfirmation: true,
							getItemData: (row: import("@tanstack/react-table").Row<Post>) => ({ id: row.original.id }),
							execute: (vars: { id: string }) => deletePost.mutateAsync(vars.id),
							onComplete: ({ successCount }: { successCount: number; failureCount: number }) =>
								toast.success(`${successCount} post${successCount !== 1 ? "s" : ""} deleted`),
						},
					]
				: []),
		],
		[canPublish, canDelete, transitionStatus, deletePost],
	);

	return (
		<PageContainer
			title={isAuthor ? "Your Posts" : "Posts"}
			description={isAuthor ? "Create and manage your own posts." : "Create and manage your blog posts."}
		>
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-3 justify-between">
				<div className="flex items-center gap-2 flex-1 max-w-md">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search posts..."
							className="pl-9"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger {...{asChild: true} as any}>
							<Button variant="outline" size="sm">
								<Filter className="h-4 w-4 mr-2" />
								{statusFilter === "all"
									? "All Status"
									: statusConfig[statusFilter as PostStatus]?.label ?? statusFilter}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{(["all", "published", "scheduled", "draft", "review", "archived"] as const).map((s) => (
								<DropdownMenuItem
									key={s}
									onClick={() => setStatusFilter(s as PostStatus | "all")}
									className={statusFilter === s ? "font-medium" : ""}
								>
									{s === "all" ? "All Status" : statusConfig[s as PostStatus]?.label ?? s}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<Button {...{asChild: true} as any}>
					<Link to={ROUTES.ADMIN.BLOG.POST_NEW as string}>
						<Plus className="mr-2 h-4 w-4" />
						New Post
					</Link>
				</Button>
			</div>

			{/* Table */}
			<Card>
				{postsQuery.isLoading ? (
					<div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
						Loading posts…
					</div>
				) : postsQuery.isError ? (
					<div className="flex flex-col items-center justify-center py-16 text-sm text-destructive">
						Failed to load posts.
					</div>
				) : posts.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16">
						<PenLine className="h-10 w-10 text-muted-foreground mb-4" />
						<p className="text-muted-foreground text-sm mb-4">
							{search || statusFilter !== "all"
								? "No posts match your filters"
								: "No posts yet — create your first one"}
						</p>
						<Button {...{asChild: true} as any}>
							<Link to={ROUTES.ADMIN.BLOG.POST_NEW as string}>
								<Plus className="mr-2 h-4 w-4" />
								New Post
							</Link>
						</Button>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="border-b">
										{headerGroup.headers.map((header) => {
											const canSort = header.column.getCanSort();
											return (
												<th
													key={header.id}
													className={[
														"py-3 px-4 font-medium text-muted-foreground text-left",
														header.id === "select" ? "w-10" : "",
														header.id === "viewCount"
															? "text-right hidden md:table-cell"
															: "",
														header.id === "author"
															? "hidden md:table-cell"
															: "",
														header.id === "category"
															? "hidden lg:table-cell"
															: "",
														header.id === "publishedAt"
															? "hidden lg:table-cell"
															: "",
														header.id === "actions" ? "text-right" : "",
														canSort ? "cursor-pointer select-none" : "",
													]
														.filter(Boolean)
														.join(" ")}
													onClick={
														canSort
															? header.column.getToggleSortingHandler()
															: undefined
													}
												>
													{header.isPlaceholder ? null : (
														<span className="inline-flex items-center">
															{flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
															{canSort && (
																<SortIcon
																	isSorted={header.column.getIsSorted()}
																/>
															)}
														</span>
													)}
												</th>
											);
										})}
									</tr>
								))}
							</thead>
							<tbody className="divide-y">
								{table.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="hover:bg-muted/30 transition-colors"
										data-state={row.getIsSelected() ? "selected" : undefined}
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												className={[
													"py-3 px-4",
													cell.column.id === "author"
														? "hidden md:table-cell text-muted-foreground"
														: "",
													cell.column.id === "category"
														? "hidden lg:table-cell text-muted-foreground"
														: "",
													cell.column.id === "publishedAt"
														? "hidden lg:table-cell text-muted-foreground"
														: "",
													cell.column.id === "viewCount"
														? "hidden md:table-cell text-right"
														: "",
													cell.column.id === "actions" ? "text-right" : "",
												]
													.filter(Boolean)
													.join(" ")}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{bulkOperations.length > 0 && (
				<DataTableBulkActions
					table={table}
					entityName="post"
					operations={bulkOperations}
					batchOptions={{ enabled: true, batchSize: 5, delayMs: 100 }}
				/>
			)}
		</PageContainer>
	);
}
