import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Send, BookOpen, Save, Eye, History, RotateCcw, CheckCircle, Archive, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { usePostById, useUpsertPost, useCategories, useTags, usePostVersions, useCreatePostVersion, useGetPostVersion, useTransitionPostStatus } from "@/lib/blog/queries";
import { useSession } from "@/lib/auth/auth-client";
import { BlockEditor, type Block } from "@/components/admin/blog/editor/BlockEditor";
import { FeaturedImageUploader } from "@/components/admin/blog/editor/FeaturedImageUploader";
import { serializeBlocks, deserializeBlocks } from "@/components/admin/blog/editor/blockTypes";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute(
	"/(authenticated)/admin/blog/posts/$postId/edit",
)({
	component: PostEditorPage,
});

function slugify(str: string) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

type Status = "draft" | "review" | "scheduled" | "published" | "archived";

function PostEditorPage() {
	const { postId } = Route.useParams();
	const navigate = useNavigate();
	const postQuery = usePostById(postId);
	const upsertPost = useUpsertPost();
	const categoriesQuery = useCategories();
	const categoryOptions = categoriesQuery.data?.ok ? categoriesQuery.data.data : [];
	const tagsQuery = useTags();
	const allTags = tagsQuery.data?.data ?? [];
	const versionsQuery = usePostVersions(postId);
	const createVersion = useCreatePostVersion();
	const getVersion = useGetPostVersion();
	const transitionStatus = useTransitionPostStatus();
	const { data: session } = useSession();
	const userRole = (session?.user as any)?.role ?? "user";
	const canPublish = ["admin", "superAdmin"].includes(userRole);

	const versions = versionsQuery.data?.ok ? versionsQuery.data.data : [];

	const [initialized, setInitialized] = useState(false);
	const [meta, setMeta] = useState({
		title: "",
		slug: "",
		excerpt: "",
		categoryId: "",
		featuredImageUrl: "",
	});
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [status, setStatus] = useState<Status>("draft");
	const [scheduledAt, setScheduledAt] = useState("");
	const [isPremium, setIsPremium] = useState(false);
	const [previewBlocks, setPreviewBlocks] = useState(3);
	const [blocks, setBlocks] = useState<Block[]>([]);
	const [saving, setSaving] = useState(false);
	const [versionKey, setVersionKey] = useState(0);
	const [restoring, setRestoring] = useState(false);

	// Populate form once post data loads
	useEffect(() => {
		if (initialized) return;
		const post = postQuery.data?.ok ? postQuery.data.data : null;
		if (!post) return;

		setMeta({
			title: post.title ?? "",
			slug: post.slug ?? "",
			excerpt: post.excerpt ?? "",
			categoryId: post.categoryId ?? "",
			featuredImageUrl: post.featuredImageUrl ?? "",
		});
		setStatus((post.status as Status) ?? "draft");
		setScheduledAt((post as any).scheduledAt ? new Date((post as any).scheduledAt).toISOString().slice(0, 16) : "");
		setIsPremium((post as any).isPremium ?? false);
		setPreviewBlocks((post as any).previewBlocks ?? 3);

		const rawBlocks = post.blocks;
		if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
			setBlocks(deserializeBlocks(rawBlocks as { id: string; type: string; content: string; meta?: Record<string, unknown> }[]));
		}

		// Load existing tag IDs
		const existingTagIds = (post as any).tags?.map((pt: any) => pt.tag?.id ?? pt.tagId).filter(Boolean) ?? [];
		setTagIds(existingTagIds);

		setInitialized(true);
	}, [postQuery.data, initialized]);

	const setMetaField = (field: keyof typeof meta, value: string) => {
		setMeta((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = useCallback(async (newStatus?: Status) => {
		if (!meta.title.trim()) {
			toast.error("Title is required");
			return;
		}

		const post = postQuery.data?.ok ? postQuery.data.data : null;
		if (!post) {
			toast.error("Post data not loaded");
			return;
		}

		setSaving(true);
		try {
			const saveStatus = newStatus ?? status;
			const result = await upsertPost.mutateAsync({
				id: postId,
				title: meta.title,
				slug: meta.slug || slugify(meta.title),
				excerpt: meta.excerpt || undefined,
				content: blocks.map((b) => b.content).join("\n\n"),
				blocks: serializeBlocks(blocks),
				authorId: post.authorId,
				status: saveStatus,
				categoryId: meta.categoryId || undefined,
				featuredImageUrl: meta.featuredImageUrl || undefined,
				tagIds,
				isPremium,
				previewBlocks,
				scheduledAt: (newStatus ?? status) === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
			} as any);

			if (result?.ok) {
				setStatus(saveStatus);
				toast.success(
					saveStatus === "published"
						? "Post published!"
						: saveStatus === "draft"
							? "Draft saved."
							: "Post updated.",
				);
				// Snapshot version on every explicit save (fire-and-forget)
				createVersion.mutate({
					postId,
					authorId: post.authorId,
					title: meta.title,
					content: blocks.map((b) => b.content).join("\n\n"),
					blocks: serializeBlocks(blocks),
					excerpt: meta.excerpt || undefined,
				});
				if (saveStatus === "published") {
					navigate({ to: "/admin/blog/posts" as string });
				}
			} else {
				toast.error("Failed to save post.");
			}
		} catch {
			toast.error("Failed to save post.");
		} finally {
			setSaving(false);
		}
	}, [meta, blocks, status, scheduledAt, tagIds, isPremium, previewBlocks, postId, postQuery.data, upsertPost, createVersion, navigate]);

	const handleRestore = useCallback(async (versionId: string) => {
		if (!confirm("Restore this version? Your current unsaved changes will be replaced.")) return;
		setRestoring(true);
		try {
			const result = await getVersion.mutateAsync(versionId);
			if (result?.ok && result.data) {
				const v = result.data;
				setMeta((prev) => ({
					...prev,
					title: v.title ?? prev.title,
					excerpt: v.excerpt ?? prev.excerpt,
				}));
				const rawBlocks = v.blocks;
				if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
					setBlocks(deserializeBlocks(rawBlocks as { id: string; type: string; content: string; meta?: Record<string, unknown> }[]));
				} else {
					setBlocks([]);
				}
				setVersionKey((k) => k + 1);
				toast.success("Version restored. Save to apply.");
			} else {
				toast.error("Failed to load version.");
			}
		} catch {
			toast.error("Failed to load version.");
		} finally {
			setRestoring(false);
		}
	}, [getVersion]);

	const handleBlockSave = useCallback(async (updatedBlocks: Block[]) => {
		const post = postQuery.data?.ok ? postQuery.data.data : null;
		if (!meta.title.trim() || !post) return;
		setBlocks(updatedBlocks);
		await upsertPost.mutateAsync({
			id: postId,
			title: meta.title,
			slug: meta.slug || slugify(meta.title),
			excerpt: meta.excerpt || undefined,
			content: updatedBlocks.map((b) => b.content).join("\n\n"),
			blocks: serializeBlocks(updatedBlocks),
			authorId: post.authorId,
			status,
			categoryId: meta.categoryId || undefined,
			featuredImageUrl: meta.featuredImageUrl || undefined,
			tagIds,
			isPremium,
			previewBlocks,
			scheduledAt: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
		} as any);
	}, [meta, status, scheduledAt, tagIds, isPremium, previewBlocks, postId, postQuery.data, upsertPost]);

	const wordCount = blocks.map((b) => b.content).join(" ").split(/\s+/).filter(Boolean).length;
	const readTime = Math.max(1, Math.round(wordCount / 200));

	if (postQuery.isLoading) {
		return (
			<div className="h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)]">
				Loading post…
			</div>
		);
	}

	if (postQuery.isError || (postQuery.data && !postQuery.data.ok)) {
		return (
			<div className="h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] text-destructive">
				Failed to load post.{" "}
				<Link to="/admin/blog/posts" className="underline ml-2 text-[hsl(199,89%,49%)]">
					Back to posts
				</Link>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)] overflow-hidden">
			{/* Toolbar */}
			<header className="flex-shrink-0 border-b border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] px-4 py-2.5">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							to="/admin/blog/posts"
							className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
						>
							<ArrowLeft className="h-5 w-5" />
						</Link>
						<div className="flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-[hsl(199,89%,49%)]" />
							<span className="text-sm font-medium text-[hsl(216,100%,95%)]">Edit Post</span>
						</div>
						<Badge
							variant="outline"
							className="capitalize text-xs border-[hsl(216,33%,20%)] text-[hsl(217,24%,59%)]"
						>
							{status}
						</Badge>
					</div>

					<div className="flex items-center gap-2 text-xs text-[hsl(217,17%,48%)]">
						<span>{wordCount} words</span>
						<span>·</span>
						<span>{readTime} min read</span>
					</div>

					<div className="flex items-center gap-2">
						{meta.slug && (
							<Link
								to={`/blog/${meta.slug}` as string}
								className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors"
							>
								<Eye className="h-3.5 w-3.5" />
								Preview
							</Link>
						)}
						{/* Workflow transition buttons */}
						{status === "draft" && (
							<button
								type="button"
								disabled={saving || transitionStatus.isPending}
								onClick={async () => {
									await handleSave("review");
								}}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-amber-400 hover:text-amber-400 transition-colors disabled:opacity-50"
							>
								<Send className="h-3.5 w-3.5" />
								Submit for Review
							</button>
						)}
						{status === "review" && canPublish && (
							<button
								type="button"
								disabled={transitionStatus.isPending}
								onClick={() => transitionStatus.mutate({ id: postId, to: "published" })}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
							>
								<CheckCircle className="h-3.5 w-3.5" />
								Approve & Publish
							</button>
						)}
						{status === "review" && (
							<button
								type="button"
								disabled={transitionStatus.isPending}
								onClick={() => transitionStatus.mutate({ id: postId, to: "draft" })}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors disabled:opacity-50"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Return to Draft
							</button>
						)}
						{status === "published" && canPublish && (
							<button
								type="button"
								disabled={transitionStatus.isPending}
								onClick={() => transitionStatus.mutate({ id: postId, to: "archived" })}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
							>
								<Archive className="h-3.5 w-3.5" />
								Archive
							</button>
						)}
						<button
							type="button"
							disabled={saving}
							onClick={() => handleSave("draft")}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors disabled:opacity-50"
						>
							<Save className="h-3.5 w-3.5" />
							Save Draft
						</button>
						{canPublish && status !== "published" && (
							<button
								type="button"
								disabled={saving}
								onClick={() => handleSave("published")}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs navy-blue-blog-btn disabled:opacity-50"
							>
								<Send className="h-3.5 w-3.5" />
								Publish
							</button>
						)}
					</div>
				</div>
			</header>

			{/* Content: editor + sidebar */}
			<div className="flex-1 flex overflow-hidden">
				{/* Block editor */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Title + excerpt strip */}
					<div className="flex-shrink-0 px-10 pt-6 pb-4 border-b border-[hsl(216,33%,20%)] space-y-2">
						<textarea
							placeholder="Post title..."
							value={meta.title}
							onChange={(e) => setMetaField("title", e.target.value)}
							rows={1}
							className="w-full text-2xl font-bold text-[hsl(216,100%,95%)] placeholder:text-[hsl(217,17%,30%)] bg-transparent border-none outline-none resize-none leading-tight"
						/>
						{meta.slug && (
							<p className="text-xs text-[hsl(217,17%,40%)] font-mono">
								/{meta.slug}
							</p>
						)}
						<textarea
							placeholder="Short excerpt (shown in post listings)..."
							value={meta.excerpt}
							onChange={(e) => setMetaField("excerpt", e.target.value)}
							rows={1}
							className="w-full text-sm text-[hsl(217,24%,50%)] placeholder:text-[hsl(217,17%,30%)] bg-transparent border-none outline-none resize-none"
						/>
					</div>

					{/* Block editor */}
					<div className="flex-1 overflow-hidden">
						{initialized && (
							<BlockEditor
								key={versionKey}
								initialBlocks={blocks}
								onSave={meta.title.trim() ? handleBlockSave : undefined}
								autoSaveInterval={8000}
							/>
						)}
					</div>
				</div>

				{/* Metadata sidebar */}
				<aside className="w-64 flex-shrink-0 border-l border-[hsl(216,33%,20%)] overflow-y-auto">
					<div className="p-4 space-y-4">
						{/* Status */}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[hsl(199,69%,84%)]">Status</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as Status)}
								className="w-full text-xs bg-[hsl(222,47%,11%)] border border-[hsl(216,33%,20%)] rounded-lg px-3 py-2 text-[hsl(216,100%,95%)] outline-none focus:border-[hsl(199,89%,49%)] transition-colors"
							>
								<option value="draft">Draft</option>
								<option value="review">In Review</option>
								<option value="scheduled">Scheduled</option>
								<option value="published">Published</option>
								<option value="archived">Archived</option>
							</select>
						</div>

						{/* Featured image */}
						<FeaturedImageUploader
							value={meta.featuredImageUrl}
							onChange={(url) => setMetaField("featuredImageUrl", url)}
						/>

						{/* URL slug */}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[hsl(199,69%,84%)]">URL Slug</label>
							<input
								type="text"
								placeholder="post-url-slug"
								value={meta.slug}
								onChange={(e) => setMetaField("slug", e.target.value)}
								className="w-full text-xs bg-[hsl(222,47%,11%)] border border-[hsl(216,33%,20%)] rounded-lg px-3 py-2 text-[hsl(216,100%,95%)] placeholder:text-[hsl(217,17%,30%)] font-mono outline-none focus:border-[hsl(199,89%,49%)] transition-colors"
							/>
						</div>

						{/* Category */}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[hsl(199,69%,84%)]">Category</label>
							<select
								value={meta.categoryId}
								onChange={(e) => setMetaField("categoryId", e.target.value)}
								className="w-full text-xs bg-[hsl(222,47%,11%)] border border-[hsl(216,33%,20%)] rounded-lg px-3 py-2 text-[hsl(216,100%,95%)] outline-none focus:border-[hsl(199,89%,49%)] transition-colors"
							>
								<option value="">No category</option>
								{categoryOptions.map((cat) => (
									<option key={cat.id} value={cat.id}>{cat.name}</option>
								))}
							</select>
						</div>

						{/* Tags */}
						{allTags.length > 0 && (
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-[hsl(199,69%,84%)]">Tags</label>
								<div className="flex flex-wrap gap-1">
									{allTags.map((tag) => {
										const selected = tagIds.includes(tag.id);
										return (
											<button
												key={tag.id}
												type="button"
												onClick={() =>
													setTagIds((prev) =>
														selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
													)
												}
												className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
													selected
														? "bg-[hsl(199,89%,49%)]/20 border-[hsl(199,89%,49%)]/50 text-[hsl(199,89%,49%)]"
														: "bg-transparent border-[hsl(216,33%,20%)] text-[hsl(217,17%,48%)] hover:border-[hsl(199,89%,49%)]/50 hover:text-[hsl(216,33%,68%)]"
												}`}
											>
												{tag.name}
											</button>
										);
									})}
								</div>
							</div>
						)}

						{/* Premium */}
						<div className="space-y-2 pt-2 border-t border-[hsl(216,33%,20%)]">
							<label className="text-xs font-medium text-[hsl(199,69%,84%)]">Monetization</label>
							<div className="flex items-center justify-between rounded-lg bg-[hsl(222,44%,13%)] border border-[hsl(216,33%,20%)] px-3 py-2">
								<span className="text-xs text-[hsl(216,33%,68%)]">Premium post</span>
								<button
									type="button"
									onClick={() => setIsPremium((p) => !p)}
									className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${isPremium ? "bg-[hsl(199,89%,49%)]" : "bg-[hsl(216,33%,20%)]"}`}
								>
									<span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isPremium ? "translate-x-4" : "translate-x-0"}`} />
								</button>
							</div>
							{isPremium && (
								<div className="flex items-center gap-2">
									<label className="text-[10px] text-[hsl(217,17%,48%)] flex-1">Free preview blocks</label>
									<input
										type="number"
										min={1}
										max={20}
										value={previewBlocks}
										onChange={(e) => setPreviewBlocks(Math.max(1, Math.min(20, Number(e.target.value))))}
										className="w-14 text-xs text-center rounded border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] text-[hsl(216,100%,95%)] py-1 outline-none focus:border-[hsl(199,89%,49%)]"
									/>
								</div>
							)}
						</div>

						{/* Schedule */}
						<div className="space-y-2 pt-2 border-t border-[hsl(216,33%,20%)]">
							<label className="text-xs font-medium text-[hsl(199,69%,84%)] flex items-center gap-1.5">
								<Calendar className="h-3.5 w-3.5" />
								Schedule
							</label>
							<div className="space-y-1.5">
								<p className="text-[10px] text-[hsl(217,17%,48%)]">Set status to "scheduled" then pick a publish date/time.</p>
								<input
									type="datetime-local"
									value={scheduledAt}
									onChange={(e) => setScheduledAt(e.target.value)}
									className="w-full text-xs rounded border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] text-[hsl(216,100%,95%)] px-2 py-1.5 outline-none focus:border-[hsl(199,89%,49%)] disabled:opacity-40"
								/>
								{scheduledAt && status !== "scheduled" && (
									<p className="text-[10px] text-amber-400">Change status to "scheduled" to activate.</p>
								)}
								{status === "scheduled" && !scheduledAt && (
									<p className="text-[10px] text-destructive">Pick a date/time to schedule this post.</p>
								)}
							</div>
						</div>

						{/* Save button (sidebar shortcut) */}
						<button
							type="button"
							disabled={saving}
							onClick={() => handleSave()}
							className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors disabled:opacity-50"
						>
							<Save className="h-3.5 w-3.5" />
							{saving ? "Saving…" : "Save Changes"}
						</button>

						{/* Version History */}
						<div className="space-y-2 pt-2 border-t border-[hsl(216,33%,20%)]">
							<div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(199,69%,84%)]">
								<History className="h-3.5 w-3.5" />
								Version History
							</div>
							{versionsQuery.isLoading ? (
								<p className="text-xs text-[hsl(217,17%,40%)]">Loading…</p>
							) : versions.length === 0 ? (
								<p className="text-xs text-[hsl(217,17%,40%)]">No saved versions yet.</p>
							) : (
								<div className="space-y-1 max-h-48 overflow-y-auto pr-1">
									{versions.map((v) => (
										<div
											key={v.id}
											className="flex items-start justify-between gap-2 rounded-lg p-2 bg-[hsl(222,44%,13%)] border border-[hsl(216,33%,20%)]"
										>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-[hsl(216,100%,95%)] truncate leading-tight">{v.title}</p>
												<p className="text-[10px] text-[hsl(217,17%,40%)] mt-0.5">
													{new Date(v.createdAt).toLocaleString(undefined, {
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
											</div>
											<button
												type="button"
												disabled={restoring}
												onClick={() => handleRestore(v.id)}
												className="shrink-0 p-1 rounded text-[hsl(217,17%,48%)] hover:text-[hsl(199,89%,49%)] transition-colors disabled:opacity-50"
												title="Restore this version"
											>
												<RotateCcw className="h-3 w-3" />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
