import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, Plus, Eye, Calendar, Loader2 } from "lucide-react";
import { useMyReadingLists, useReadingListPosts, useCreateReadingList } from "@/lib/blog/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/account/reading-lists")({
	component: ReadingListsPage,
});

function ReadingListsPage() {
	const listsQuery = useMyReadingLists();
	const createList = useCreateReadingList();
	const lists = (listsQuery.data as any)?.ok ? ((listsQuery.data as any).data as any[]) : [];
	const [selectedListId, setSelectedListId] = useState<string | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [newListName, setNewListName] = useState("");

	const selectedList = lists.find((l) => l.id === selectedListId) ?? lists[0] ?? null;
	const postsQuery = useReadingListPosts(selectedList?.id);
	const posts = (postsQuery.data as any)?.ok ? ((postsQuery.data as any).data as any)?.items ?? [] : [];

	const handleCreate = async () => {
		if (!newListName.trim()) return;
		const result = await createList.mutateAsync({ name: newListName.trim() });
		if (result?.ok) {
			toast.success("List created!");
			setNewListName("");
			setShowCreate(false);
		} else {
			toast.error("Failed to create list.");
		}
	};

	return (
		<div className="min-h-screen bg-oxford-blue-2 text-shadow-blue px-4 py-10">
			<div className="max-w-4xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold text-alice-blue flex items-center gap-2">
							<BookMarked className="h-6 w-6 text-carolina-blue" />
							Reading Lists
						</h1>
						<p className="text-sm text-slate-gray mt-1">Posts you've saved to read later</p>
					</div>
					<button
						type="button"
						onClick={() => setShowCreate((p) => !p)}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm navy-blue-blog-btn"
					>
						<Plus className="h-4 w-4" />
						New List
					</button>
				</div>

				{showCreate && (
					<div className="mb-6 p-4 rounded-xl border border-prussian-blue bg-oxford-blue flex items-center gap-3">
						<input
							autoFocus
							type="text"
							value={newListName}
							onChange={(e) => setNewListName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleCreate()}
							placeholder="List name…"
							className="flex-1 bg-transparent text-sm text-alice-blue outline-none placeholder:text-slate-gray"
						/>
						<button
							type="button"
							onClick={handleCreate}
							disabled={createList.isPending || !newListName.trim()}
							className="text-xs px-3 py-1.5 rounded-md bg-carolina-blue text-white hover:bg-carolina-blue/80 disabled:opacity-50"
						>
							{createList.isPending ? "Creating…" : "Create"}
						</button>
					</div>
				)}

				<div className="grid lg:grid-cols-[220px_1fr] gap-8">
					{/* List selector */}
					<div className="space-y-1">
						{listsQuery.isLoading ? (
							<div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-carolina-blue" /></div>
						) : lists.length === 0 ? (
							<p className="text-sm text-slate-gray px-2">No lists yet.</p>
						) : (
							lists.map((list: any) => (
								<button
									key={list.id}
									type="button"
									onClick={() => setSelectedListId(list.id)}
									className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
										(selectedListId ?? lists[0]?.id) === list.id
											? "bg-carolina-blue/15 text-carolina-blue font-medium"
											: "text-wild-blue-yonder hover:bg-prussian-blue/30"
									}`}
								>
									<span className="block truncate">{list.name}</span>
									{list.isDefault && <span className="text-[10px] text-slate-gray">Default</span>}
								</button>
							))
						)}
					</div>

					{/* Posts in selected list */}
					<div>
						{postsQuery.isLoading ? (
							<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-carolina-blue" /></div>
						) : posts.length === 0 ? (
							<div className="py-12 text-center">
								<BookMarked className="h-10 w-10 text-prussian-blue mx-auto mb-3" />
								<p className="text-wild-blue-yonder">No posts saved here yet.</p>
								<p className="text-sm text-slate-gray mt-1">Bookmark posts while reading to save them.</p>
							</div>
						) : (
							<div className="space-y-4">
								{posts.map((item: any) => {
									const post = item.post ?? item;
									return (
										<article key={item.id} className="flex gap-4 p-4 rounded-xl border border-prussian-blue/50 hover:border-prussian-blue transition-colors">
											{post.featuredImageUrl && (
												<img
													src={post.featuredImageUrl}
													alt={post.title}
													className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
												/>
											)}
											<div className="flex-1 min-w-0">
												<h3 className="text-sm font-semibold text-alice-blue mb-1 line-clamp-2">
													<Link to={"/$slug" as string} params={{ slug: post.slug } as any} className="hover:text-carolina-blue transition-colors">
														{post.title}
													</Link>
												</h3>
												<p className="text-xs text-slate-gray line-clamp-1 mb-2">{post.excerpt}</p>
												<div className="flex items-center gap-3 text-[10px] text-prussian-blue-dark">
													{post.author?.name && (
														<span>{post.author.name}</span>
													)}
													<span className="flex items-center gap-1">
														<Calendar className="h-3 w-3" />
														{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
													</span>
													<span className="flex items-center gap-1">
														<Eye className="h-3 w-3" />
														{post.viewCount?.toLocaleString() ?? "0"}
													</span>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
