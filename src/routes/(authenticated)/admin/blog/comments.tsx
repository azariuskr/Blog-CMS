import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Search,
	CheckCircle,
	Trash2,
	MessageSquare,
	Clock,
	AlertTriangle,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
	useApproveComment,
	useComments,
	useDeleteComment,
	useSpamComment,
} from "@/lib/blog/queries";

export const Route = createFileRoute("/(authenticated)/admin/blog/comments")({
	component: AdminCommentsPage,
});

type CommentStatus = "pending" | "approved" | "spam";

const statusConfig: Record<
	CommentStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: React.ElementType;
	}
> = {
	pending: { label: "Pending", variant: "outline", icon: Clock },
	approved: { label: "Approved", variant: "default", icon: CheckCircle },
	spam: { label: "Spam", variant: "destructive", icon: AlertTriangle },
};

function formatRelativeishDate(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString();
}

function AdminCommentsPage() {
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<"all" | CommentStatus>("all");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkPending, setBulkPending] = useState(false);

	const commentsQuery = useComments({
		status: tab === "all" ? undefined : tab,
		page: 1,
	});
	const approveComment = useApproveComment();
	const spamComment = useSpamComment();
	const deleteComment = useDeleteComment();

	const toggleSelect = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	/* const toggleSelectAll = () => {
		if (selected.size === comments.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(comments.map((c: any) => c.id)));
		}
	}; */

	const bulkAction = async (action: "approve" | "spam" | "delete") => {
		if (selected.size === 0) return;
		setBulkPending(true);
		const ids = Array.from(selected);
		let failures = 0;
		try {
			await Promise.all(
				ids.map((id) =>
					(action === "approve"
						? approveComment.mutateAsync(id)
						: action === "spam"
							? spamComment.mutateAsync(id)
							: deleteComment.mutateAsync(id)
					).catch(() => { failures++; }),
				),
			);
			const succeeded = ids.length - failures;
			if (failures === 0) {
				toast.success(`${succeeded} comment${succeeded > 1 ? "s" : ""} ${action === "approve" ? "approved" : action === "spam" ? "marked as spam" : "deleted"}.`);
			} else {
				toast.warning(`${succeeded} succeeded, ${failures} failed.`);
			}
		} finally {
			setBulkPending(false);
			setSelected(new Set());
		}
	};

	const comments = useMemo(() => {
		const items = (commentsQuery.data as any)?.data?.items ?? [];
		const term = search.trim().toLowerCase();
		if (!term) return items;

		return items.filter((comment: any) => {
			const content = comment.content ?? "";
			const authorId = comment.authorId ?? "";
			return (
				content.toLowerCase().includes(term) ||
				authorId.toLowerCase().includes(term)
			);
		});
	}, [(commentsQuery.data as any)?.data?.items, search]);

	const counts = {
		all: (commentsQuery.data as any)?.data?.total ?? comments.length,
		pending: tab === "pending" ? comments.length : undefined,
		approved: tab === "approved" ? comments.length : undefined,
		spam: tab === "spam" ? comments.length : undefined,
	};

	return (
		<PageContainer
			title="Comments"
			description="Review, approve, or remove reader comments."
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search comments…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
					<TabsList>
						<TabsTrigger value="all">All ({counts.all})</TabsTrigger>
						<TabsTrigger value="pending">
							Pending ({counts.pending ?? "—"})
						</TabsTrigger>
						<TabsTrigger value="approved">
							Approved ({counts.approved ?? "—"})
						</TabsTrigger>
						<TabsTrigger value="spam">Spam ({counts.spam ?? "—"})</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

		{/* Bulk action toolbar */}
		{selected.size > 0 && (
			<div className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg border">
				<span className="text-sm font-medium">{selected.size} selected</span>
				<Button
					size="sm" variant="outline" className="gap-1.5 text-xs h-7"
					onClick={() => bulkAction("approve")} disabled={bulkPending}
				>
					<CheckCircle className="w-3.5 h-3.5 text-green-500" />
					Approve All
				</Button>
				<Button
					size="sm" variant="outline" className="gap-1.5 text-xs h-7"
					onClick={() => bulkAction("spam")} disabled={bulkPending}
				>
					<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
					Spam All
				</Button>
				<Button
					size="sm" variant="outline" className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
					onClick={() => bulkAction("delete")} disabled={bulkPending}
				>
					<Trash2 className="w-3.5 h-3.5" />
					Delete All
				</Button>
				<Button size="sm" variant="ghost" className="text-xs h-7 ml-auto" onClick={() => setSelected(new Set())}>
					Clear
				</Button>
			</div>
		)}

		<div className="space-y-3">
				{commentsQuery.isLoading ? (
					<div className="rounded-lg border bg-card flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
						<MessageSquare className="w-10 h-10 opacity-40" />
						<p>Loading comments…</p>
					</div>
				) : commentsQuery.isError ? (
					<div className="rounded-lg border bg-card flex flex-col items-center justify-center py-20 gap-3 text-destructive">
						<MessageSquare className="w-10 h-10 opacity-40" />
						<p>Failed to load comments</p>
					</div>
				) : comments.length === 0 ? (
					<div className="rounded-lg border bg-card flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
						<MessageSquare className="w-10 h-10 opacity-40" />
						<p>No comments found</p>
					</div>
				) : (
					comments.map((comment: any) => {
						const {
							label,
							variant,
							icon: StatusIcon,
						} = statusConfig[comment.status as CommentStatus];
						return (
							<div key={comment.id} className="rounded-lg border bg-card p-4">
								<div className="flex items-start gap-4">
									<Checkbox
									checked={selected.has(comment.id)}
									onCheckedChange={() => toggleSelect(comment.id)}
									className="mt-1 shrink-0"
								/>
								<Avatar className="w-9 h-9 shrink-0">
										<AvatarFallback className="text-xs">
											{comment.authorId.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<div className="flex flex-wrap items-center gap-2 mb-1">
											<span className="font-medium text-sm">
												{comment.authorId}
											</span>
											<Badge variant={variant} className="gap-1 text-xs">
												<StatusIcon className="w-3 h-3" />
												{label}
											</Badge>
											<span className="text-xs text-muted-foreground ml-auto">
												{formatRelativeishDate(comment.createdAt)}
											</span>
										</div>
										<p className="text-sm text-foreground mb-2 line-clamp-2">
											{comment.content}
										</p>
										<p className="text-xs text-muted-foreground">
											Post ID:{" "}
											<span className="text-foreground font-medium">
												{comment.postId}
											</span>
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2 mt-3 pt-3 border-t ml-13">
									{comment.status !== "approved" && (
										<Button
											size="sm"
											variant="outline"
											className="gap-1.5 text-xs h-7"
											onClick={() => approveComment.mutate(comment.id)}
											disabled={approveComment.isPending}
										>
											<CheckCircle className="w-3.5 h-3.5 text-green-500" />
											Approve
										</Button>
									)}
									{comment.status !== "spam" && (
										<Button
											size="sm"
											variant="outline"
											className="gap-1.5 text-xs h-7"
											onClick={() => spamComment.mutate(comment.id)}
											disabled={spamComment.isPending}
										>
											<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
											Mark Spam
										</Button>
									)}
									<Button
										size="sm"
										variant="outline"
										className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
										onClick={() => deleteComment.mutate(comment.id)}
										disabled={deleteComment.isPending}
									>
										<Trash2 className="w-3.5 h-3.5" />
										Delete
									</Button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</PageContainer>
	);
}
