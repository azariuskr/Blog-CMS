import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import type { InferQueryFnData } from "@tanstack/react-query";
import {
	Plus,
	Search,
	MoreHorizontal,
	Edit2,
	Trash2,
	FileText,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	useCategories,
	useDeleteCategory,
	useUpsertCategory,
} from "@/lib/blog/queries";

export const Route = createFileRoute("/(authenticated)/admin/blog/categories")({
	component: AdminCategoriesPage,
});

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

type CategoryItem = InferQueryFnData<typeof useCategories>["data"][number];

function AdminCategoriesPage() {
	const [search, setSearch] = useState("");
	const formId = useId();
	const [dialogOpen, setDialogOpen] = useState(false);
	const categoriesQuery = useCategories();
	const upsertCategory = useUpsertCategory();
	const deleteCategory = useDeleteCategory();
	const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		description: "",
		color: "#0ea5ea",
		parentId: "" as string,
	});

	const categories = useMemo(() => {
		const items = categoriesQuery.data?.data ?? [];
		const term = search.trim().toLowerCase();
		if (!term) return items;
		return items.filter(
			(c) =>
				c.name.toLowerCase().includes(term) ||
				c.slug.toLowerCase().includes(term),
		);
	}, [categoriesQuery.data?.data, search]);

	const categoryMap = useMemo(() => {
		const map = new Map<string, CategoryItem>();
		for (const c of categoriesQuery.data?.data ?? []) map.set(c.id, c);
		return map;
	}, [categoriesQuery.data?.data]);

	function openNew() {
		setEditTarget(null);
		setForm({ name: "", slug: "", description: "", color: "#0ea5ea", parentId: "" });
		setDialogOpen(true);
	}

	function openEdit(cat: CategoryItem) {
		setEditTarget(cat);
		setForm({
			name: cat.name,
			slug: cat.slug,
			description: cat.description ?? "",
			color: cat.color ?? "#0ea5ea",
			parentId: (cat as any).parentId ?? "",
		});
		setDialogOpen(true);
	}

	function handleSubmit() {
		upsertCategory.mutate(
			{
				id: editTarget?.id,
				name: form.name,
				slug: form.slug,
				description: form.description || undefined,
				color: form.color || undefined,
				parentId: form.parentId || undefined,
			} as any,
			{
				onSuccess: () => {
					setDialogOpen(false);
					setEditTarget(null);
					setForm({ name: "", slug: "", description: "", color: "#0ea5ea", parentId: "" });
				},
			},
		);
	}

	return (
		<PageContainer
			title="Categories"
			description="Organise posts into categories for easier discovery."
		>
			<div className="flex items-center justify-between gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search categories…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={openNew} className="gap-2">
					<Plus className="w-4 h-4" />
					New Category
				</Button>
			</div>

			<div className="rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="text-right">Posts</TableHead>
							<TableHead className="w-12" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{categoriesQuery.isLoading ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-32 text-center text-muted-foreground"
								>
									Loading categories…
								</TableCell>
							</TableRow>
						) : categoriesQuery.isError ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-32 text-center text-destructive"
								>
									Failed to load categories.
								</TableCell>
							</TableRow>
						) : categories.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-32 text-center text-muted-foreground"
								>
									No categories found.
								</TableCell>
							</TableRow>
						) : (
							categories.map((cat) => (
								<TableRow key={cat.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<div
												className="w-3 h-3 rounded-full shrink-0"
												style={{ backgroundColor: cat.color ?? "#0ea5ea" }}
											/>
											<span className="font-medium">{cat.name}</span>
										</div>
									</TableCell>
									<TableCell className="font-mono text-sm text-muted-foreground">
										{cat.slug}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground max-w-xs truncate">
										{cat.description || "—"}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{(cat as any).parentId ? (() => {
											const p = categoryMap.get((cat as any).parentId);
											return p ? (
												<span className="flex items-center gap-1.5">
													<span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color ?? "#0ea5ea" }} />
													{p.name}
												</span>
											) : "—";
										})() : "—"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
											<FileText className="w-3.5 h-3.5" />
											{cat.postCount ?? 0}
										</div>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => openEdit(cat)}
													className="gap-2"
												>
													<Edit2 className="w-4 h-4" /> Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													className="gap-2 text-destructive focus:text-destructive"
													onClick={() => deleteCategory.mutate(cat.id)}
													disabled={deleteCategory.isPending}
												>
													<Trash2 className="w-4 h-4" /> Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editTarget ? "Edit Category" : "New Category"}
						</DialogTitle>
						<DialogDescription>
							{editTarget
								? "Update the category details."
								: "Add a new category to organise your posts."}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-cat-name`}>Name</Label>
							<Input
								id={`${formId}-cat-name`}
								value={form.name}
								onChange={(e) => {
									const name = e.target.value;
									setForm((f) => ({
										...f,
										name,
										slug: editTarget ? f.slug : slugify(name),
									}));
								}}
								placeholder="Technology"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-cat-slug`}>Slug</Label>
							<Input
								id={`${formId}-cat-slug`}
								value={form.slug}
								onChange={(e) =>
									setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
								}
								placeholder="technology"
								className="font-mono"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-cat-desc`}>Description</Label>
							<Textarea
								id={`${formId}-cat-desc`}
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({ ...f, description: e.target.value }))
								}
								placeholder="A short description of this category"
								rows={3}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-cat-color`}>Color</Label>
							<div className="flex items-center gap-3">
								<input
									id={`${formId}-cat-color`}
									type="color"
									value={form.color}
									onChange={(e) =>
										setForm((f) => ({ ...f, color: e.target.value }))
									}
									className="h-9 w-16 cursor-pointer rounded border border-input bg-background px-1"
								/>
								<span className="font-mono text-sm text-muted-foreground">
									{form.color}
								</span>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-cat-parent`}>Parent Category</Label>
							<Select
								value={form.parentId || "none"}
								onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === "none" ? "" : v }))}
							>
								<SelectTrigger id={`${formId}-cat-parent`}>
									<SelectValue placeholder="None (top-level)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None (top-level)</SelectItem>
									{(categoriesQuery.data?.data ?? [])
										.filter((c) => c.id !== editTarget?.id)
										.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												<span className="flex items-center gap-2">
													<span
														className="w-2.5 h-2.5 rounded-full inline-block"
														style={{ backgroundColor: c.color ?? "#0ea5ea" }}
													/>
													{c.name}
												</span>
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={
								!form.name.trim() ||
								!form.slug.trim() ||
								upsertCategory.isPending
							}
						>
							{editTarget ? "Save Changes" : "Create Category"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
