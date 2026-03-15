import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { ArrowLeft, Send, BookOpen, Save, Calendar } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useUpsertPost, useCategories, useCreatePostVersion, useTags } from "@/lib/blog/queries";
import { BlockEditor, type Block } from "@/components/admin/blog/editor/BlockEditor";
import { FeaturedImageUploader } from "@/components/admin/blog/editor/FeaturedImageUploader";
import { serializeBlocks } from "@/components/admin/blog/editor/blockTypes";

export const Route = createFileRoute("/(authenticated)/editor/new")({
	component: WriterEditorPage,
});

function slugify(str: string) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

type Status = "draft" | "review" | "published";

function WriterEditorPage() {
	const navigate = useNavigate();
	const { data: session } = useSession();
	const upsertPost = useUpsertPost();
	const createVersion = useCreatePostVersion();
	const categoriesQuery = useCategories();
	const categoryOptions = categoriesQuery.data?.ok ? categoriesQuery.data.data : [];
	const tagsQuery = useTags();
	const allTags = tagsQuery.data?.data ?? [];

	const [meta, setMeta] = useState({
		title: "",
		slug: "",
		excerpt: "",
		categoryId: "",
		featuredImageUrl: "",
	});
	const [autoSlug, setAutoSlug] = useState(true);
	const [status, setStatus] = useState<Status>("draft");
	const [scheduledAt, setScheduledAt] = useState("");
	const [blocks, setBlocks] = useState<Block[]>([]);
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [isPremium, setIsPremium] = useState(false);
	const [previewBlocks, setPreviewBlocks] = useState(3);
	const [saving, setSaving] = useState(false);

	const setMetaField = (field: keyof typeof meta, value: string) => {
		setMeta((prev) => {
			const updated = { ...prev, [field]: value };
			if (field === "title" && autoSlug) {
				updated.slug = slugify(value);
			}
			if (field === "slug") setAutoSlug(false);
			return updated;
		});
	};

	const handleSave = useCallback(async (submitForReview = false) => {
		if (!meta.title.trim()) {
			toast.error("Title is required");
			return;
		}
		if (!session?.user?.id) {
			toast.error("You must be logged in to save a post");
			return;
		}

		setSaving(true);
		try {
			const newStatus = submitForReview ? "review" : "draft";
			const result = await upsertPost.mutateAsync({
				title: meta.title,
				slug: meta.slug || slugify(meta.title),
				excerpt: meta.excerpt || undefined,
				content: blocks.map((b) => b.content).join("\n\n"),
				blocks: serializeBlocks(blocks),
				authorId: session.user.id,
				status: newStatus,
				categoryId: meta.categoryId || undefined,
				featuredImageUrl: meta.featuredImageUrl || undefined,
				tagIds,
				isPremium,
				previewBlocks,
				scheduledAt: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
			} as any);

			if (result?.ok) {
				setStatus(newStatus);
				toast.success(submitForReview ? "Submitted for review!" : "Draft saved.");
				// Auto-snapshot version on every explicit save (fire-and-forget)
				if (result.data?.id) {
					createVersion.mutate({
						postId: result.data.id,
						authorId: session!.user.id,
						title: meta.title,
						content: blocks.map((b) => b.content).join("\n\n"),
						blocks: serializeBlocks(blocks),
						excerpt: meta.excerpt || undefined,
					});
				}
				if (submitForReview) navigate({ to: ROUTES.HOME });
			} else {
				toast.error("Failed to save post.");
			}
		} catch {
			toast.error("Failed to save post.");
		} finally {
			setSaving(false);
		}
	}, [meta, blocks, tagIds, scheduledAt, isPremium, previewBlocks, session, upsertPost, navigate]);

	// Auto-save handler passed to BlockEditor
	const handleBlockSave = useCallback(async (updatedBlocks: Block[]) => {
		if (!meta.title.trim() || !session?.user?.id) return;
		setBlocks(updatedBlocks);
		await upsertPost.mutateAsync({
			title: meta.title,
			slug: meta.slug || slugify(meta.title),
			excerpt: meta.excerpt || undefined,
			content: updatedBlocks.map((b) => b.content).join("\n\n"),
			blocks: serializeBlocks(updatedBlocks),
			authorId: session.user.id,
			status: "draft",
			categoryId: meta.categoryId || undefined,
			featuredImageUrl: meta.featuredImageUrl || undefined,
			tagIds,
			isPremium,
			previewBlocks,
			scheduledAt: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
		} as any);
	}, [meta, status, tagIds, scheduledAt, isPremium, previewBlocks, session, upsertPost]);

	const wordCount = blocks.map((b) => b.content).join(" ").split(/\s+/).filter(Boolean).length;
	const readTime = Math.max(1, Math.round(wordCount / 200));

	return (
		<div className="h-screen flex flex-col bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)] overflow-hidden">
			{/* Page toolbar */}
			<header className="flex-shrink-0 border-b border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] px-4 py-2.5">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							to={ROUTES.HOME}
							className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
						>
							<ArrowLeft className="h-5 w-5" />
						</Link>
						<div className="flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-[hsl(199,89%,49%)]" />
							<span className="text-sm font-medium text-[hsl(216,100%,95%)]">New Post</span>
						</div>
						{status !== "draft" && (
							<span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(199,89%,49%)]/20 text-[hsl(199,89%,49%)] border border-[hsl(199,89%,49%)]/30">
								{status === "review" ? "In Review" : "Published"}
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 text-xs text-[hsl(217,17%,48%)]">
						<span>{wordCount} words</span>
						<span>·</span>
						<span>{readTime} min read</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={saving}
							onClick={() => handleSave(false)}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors disabled:opacity-50"
						>
							<Save className="h-3.5 w-3.5" />
							Save Draft
						</button>
						<button
							type="button"
							disabled={saving}
							onClick={() => handleSave(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs navy-blue-blog-btn disabled:opacity-50"
						>
							<Send className="h-3.5 w-3.5" />
							Submit for Review
						</button>
					</div>
				</div>
			</header>

			{/* Content: metadata strip + block editor */}
			<div className="flex-1 flex overflow-hidden">
				{/* Block editor (main area) */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Title + excerpt strip */}
					<div className="flex-shrink-0 px-10 pt-6 pb-4 border-b border-[hsl(216,33%,20%)] space-y-2">
						<textarea
							placeholder="Your post title..."
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
						<BlockEditor
							initialBlocks={blocks}
							onSave={meta.title.trim() ? handleBlockSave : undefined}
							autoSaveInterval={8000}
						/>
					</div>
				</div>

				{/* Metadata sidebar */}
				<aside className="w-64 flex-shrink-0 border-l border-[hsl(216,33%,20%)] overflow-y-auto">
					<div className="p-4 space-y-4">
						{/* Author */}
						{session?.user && (
							<div className="p-3 rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)]">
								<p className="text-xs font-medium text-[hsl(199,69%,84%)] mb-1">Publishing as</p>
								<p className="text-sm text-[hsl(216,100%,95%)]">{session.user.name}</p>
								<p className="text-xs text-[hsl(217,17%,48%)]">{session.user.email}</p>
							</div>
						)}

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
								<p className="text-[10px] text-[hsl(217,17%,48%)]">Pick a date/time — save with "scheduled" status to activate.</p>
								<input
									type="datetime-local"
									value={scheduledAt}
									onChange={(e) => setScheduledAt(e.target.value)}
									className="w-full text-xs rounded border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] text-[hsl(216,100%,95%)] px-2 py-1.5 outline-none focus:border-[hsl(199,89%,49%)]"
								/>
							</div>
						</div>

						{/* Info */}
						<div className="p-3 rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)]">
							<p className="text-xs text-[hsl(217,17%,48%)] leading-relaxed">
								<span className="text-[hsl(199,69%,84%)]">Review process</span>
								<br />
								Submitted posts are reviewed before publishing. Drafts are private until published.
							</p>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
