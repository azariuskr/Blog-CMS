import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { Plus, Search, X, Tag, Hash } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateTag, useDeleteTag, useTags } from "@/lib/blog/queries";

export const Route = createFileRoute("/(authenticated)/admin/blog/tags")({
	component: AdminTagsPage,
});

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

function AdminTagsPage() {
	const [search, setSearch] = useState("");
	const formId = useId();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [newTag, setNewTag] = useState("");
	const tagsQuery = useTags();
	const createTag = useCreateTag();
	const deleteTag = useDeleteTag();

	const filtered = useMemo(() => {
		const items = (tagsQuery.data as any)?.data ?? [];
		const term = search.trim().toLowerCase();
		if (!term) return items;
		return items.filter(
			(t: any) =>
				t.name.toLowerCase().includes(term) ||
				t.slug.toLowerCase().includes(term),
		);
	}, [search, (tagsQuery.data as any)?.data]);

	const sorted = useMemo(
		() => [...filtered].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)),
		[filtered],
	);
	const maxCount = Math.max(
		1,
		...((tagsQuery.data as any)?.data ?? []).map((t: any) => t.postCount ?? 0),
	);

	function tagSize(count: number): string {
		const ratio = count / maxCount;
		if (ratio > 0.8) return "text-xl font-bold";
		if (ratio > 0.5) return "text-base font-semibold";
		if (ratio > 0.3) return "text-sm font-medium";
		return "text-xs";
	}

	function handleCreate() {
		createTag.mutate(
			{ name: newTag.trim(), slug: slugify(newTag) },
			{
				onSuccess: () => {
					setDialogOpen(false);
					setNewTag("");
				},
			},
		);
	}

	return (
		<PageContainer
			title="Tags"
			description="Manage tags to improve post discoverability."
		>
			<div className="flex items-center justify-between gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search tags…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={() => setDialogOpen(true)} className="gap-2">
					<Plus className="w-4 h-4" />
					New Tag
				</Button>
			</div>

			<div className="rounded-lg border bg-card p-8">
				<div className="flex flex-wrap gap-3 items-center">
					{tagsQuery.isLoading ? (
						<div className="w-full py-12 text-center text-muted-foreground">
							Loading tags…
						</div>
					) : sorted.length > 0 ? (
						sorted.map((tag) => (
							<div
								key={tag.id}
								className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer ${tagSize(tag.postCount ?? 0)}`}
							>
								<Hash className="w-3 h-3 opacity-60" />
								<span>{tag.name}</span>
								<span className="text-xs opacity-50 group-hover:opacity-80">
									({tag.postCount ?? 0})
								</span>
								<button
									type="button"
									className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
									aria-label={`Delete ${tag.name}`}
									onClick={(e) => {
										e.stopPropagation();
										deleteTag.mutate(tag.id);
									}}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						))
					) : (
						<div className="w-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
							<Tag className="w-8 h-8 opacity-40" />
							<p>No tags found</p>
						</div>
					)}
				</div>
			</div>

			<div className="rounded-lg border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/40">
							<th className="text-left px-4 py-3 font-medium text-muted-foreground">
								Tag
							</th>
							<th className="text-left px-4 py-3 font-medium text-muted-foreground">
								Slug
							</th>
							<th className="text-right px-4 py-3 font-medium text-muted-foreground">
								Posts
							</th>
							<th className="px-4 py-3 w-12" />
						</tr>
					</thead>
					<tbody>
						{sorted.map((tag) => (
							<tr
								key={tag.id}
								className="border-b last:border-0 hover:bg-muted/30 transition-colors"
							>
								<td className="px-4 py-3">
									<Badge variant="secondary" className="gap-1">
										<Hash className="w-3 h-3" />
										{tag.name}
									</Badge>
								</td>
								<td className="px-4 py-3 font-mono text-muted-foreground">
									{tag.slug}
								</td>
								<td className="px-4 py-3 text-right text-muted-foreground">
									{tag.postCount ?? 0}
								</td>
								<td className="px-4 py-3 text-right">
									<button
										type="button"
										className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
										aria-label={`Delete ${tag.name}`}
										onClick={() => deleteTag.mutate(tag.id)}
									>
										<X className="w-4 h-4" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Tag</DialogTitle>
						<DialogDescription>
							Add a new tag to label and group related posts.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-tag-name`}>Tag name</Label>
							<Input
								id={`${formId}-tag-name`}
								value={newTag}
								onChange={(e) => setNewTag(e.target.value)}
								placeholder="e.g. web-performance"
								className="font-mono"
							/>
							{newTag && (
								<p className="text-xs text-muted-foreground">
									Slug: <span className="font-mono">{slugify(newTag)}</span>
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!newTag.trim() || createTag.isPending}
						>
							Create Tag
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
