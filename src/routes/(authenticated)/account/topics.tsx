import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Loader2 } from "lucide-react";
import { useUserInterests, useSetUserInterests, usePublicCategories } from "@/lib/blog/queries";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/(authenticated)/account/topics")({
	component: TopicsPreferencesPage,
});

function TopicsPreferencesPage() {
	const interestsQuery = useUserInterests();
	const categoriesQuery = usePublicCategories();
	const setInterests = useSetUserInterests();

	const savedIds: string[] = (interestsQuery.data as any)?.ok
		? ((interestsQuery.data as any).data as any[]).map((i: any) => i.categoryId)
		: [];
	const categories: any[] = (categoriesQuery.data as any)?.data ?? [];

	const [selected, setSelected] = useState<Set<string>>(new Set());

	// Sync saved interests once loaded
	useEffect(() => {
		if (savedIds.length > 0) setSelected(new Set(savedIds));
	}, [savedIds.join(",")]);

	const toggle = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSave = async () => {
		const result = await setInterests.mutateAsync([...selected]);
		if ((result as any)?.ok) {
			toast.success("Topic preferences saved!");
		} else {
			toast.error("Failed to save preferences.");
		}
	};

	const isLoading = interestsQuery.isLoading || categoriesQuery.isLoading;

	return (
		<div className="min-h-screen bg-oxford-blue-2 text-shadow-blue px-4 py-10">
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-alice-blue flex items-center gap-2">
						<Bookmark className="h-6 w-6 text-carolina-blue" />
						Topic Preferences
					</h1>
					<p className="text-sm text-slate-gray mt-1">
						Select topics you're interested in to personalize your feed.
					</p>
				</div>

				{isLoading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-5 w-5 animate-spin text-carolina-blue" />
					</div>
				) : categories.length === 0 ? (
					<p className="text-wild-blue-yonder text-sm">No topics available yet.</p>
				) : (
					<>
						<div className="flex flex-wrap gap-3 mb-8">
							{categories.map((cat: any) => {
								const active = selected.has(cat.id);
								return (
									<button
										key={cat.id}
										type="button"
										onClick={() => toggle(cat.id)}
										className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
											active
												? "border-carolina-blue bg-carolina-blue/15 text-carolina-blue"
												: "border-prussian-blue text-wild-blue-yonder hover:border-carolina-blue/50 hover:text-alice-blue"
										}`}
									>
										{cat.name}
									</button>
								);
							})}
						</div>

						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={handleSave}
								disabled={setInterests.isPending}
								className="navy-blue-blog-btn px-6 py-2 rounded-md text-sm disabled:opacity-50"
							>
								{setInterests.isPending ? "Saving…" : "Save Preferences"}
							</button>
							{selected.size > 0 && (
								<span className="text-xs text-slate-gray">
									{selected.size} topic{selected.size !== 1 ? "s" : ""} selected
								</span>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
