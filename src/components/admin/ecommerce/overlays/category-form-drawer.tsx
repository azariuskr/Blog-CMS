import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useCreateCategory,
	useUpdateCategory,
} from "@/hooks/ecommerce-actions";
import { useAdminCategoryTree } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";

interface CategoryData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	imageUrl: string | null;
	parentId: string | null;
	isActive: boolean;
	sortOrder: number;
}

export function CategoryFormDrawer() {
	const { id, data, close } = useOverlay();
	const isCreate = id === "createCategory";
	const isEdit = id === "editCategory";
	const isOpen = isCreate || isEdit;
	const cat = isEdit ? (data as CategoryData | null) : null;

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [parentId, setParentId] = useState<string>("");
	const [isActive, setIsActive] = useState(true);
	const [sortOrder, setSortOrder] = useState("0");

	const { data: treeData } = useAdminCategoryTree();
	const categoryTree =
		treeData?.ok
			? (treeData.data as Array<{
					id: string;
					name: string;
					depth: number;
					isActive: boolean;
				}>)
			: [];

	const createMutation = useCreateCategory();
	const updateMutation = useUpdateCategory();
	const isPending = createMutation.isPending || updateMutation.isPending;

	useEffect(() => {
		if (isEdit && cat) {
			setName(cat.name);
			setSlug(cat.slug);
			setDescription(cat.description ?? "");
			setImageUrl(cat.imageUrl ?? "");
			setParentId(cat.parentId ?? "");
			setIsActive(cat.isActive);
			setSortOrder(String(cat.sortOrder));
		}
	}, [isEdit, cat]);

	const resetForm = () => {
		setName("");
		setSlug("");
		setDescription("");
		setImageUrl("");
		setParentId("");
		setIsActive(true);
		setSortOrder("0");
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isCreate) {
			createMutation.mutate(
				{
					name,
					slug: slug || undefined,
					description: description || undefined,
					imageUrl: imageUrl || undefined,
					parentId: parentId || null,
					isActive,
					sortOrder: parseInt(sortOrder, 10) || 0,
				},
				{ onSuccess: () => handleClose() },
			);
		} else if (isEdit && cat) {
			updateMutation.mutate(
				{
					categoryId: cat.id,
					name,
					slug: slug || undefined,
					description: description || undefined,
					imageUrl: imageUrl || undefined,
					parentId: parentId || null,
					isActive,
					sortOrder: parseInt(sortOrder, 10) || 0,
				},
				{ onSuccess: () => handleClose() },
			);
		}
	};

	// Filter out the current category (and its descendants) from parent options
	const availableParents = isEdit && cat
		? categoryTree.filter((c) => c.id !== cat.id)
		: categoryTree;

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Layers className="h-5 w-5 text-primary" />
						{isCreate ? "Create Category" : "Edit Category"}
					</SheetTitle>
					<SheetDescription>
						{isCreate
							? "Add a new category to your catalog."
							: "Update category details."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="categoryName">Name</Label>
						<Input
							id="categoryName"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Category name"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="categorySlug">
							Slug (auto-generated if empty)
						</Label>
						<Input
							id="categorySlug"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="category-name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="categoryDescription">Description</Label>
						<Textarea
							id="categoryDescription"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Category description..."
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="categoryImageUrl">Image URL</Label>
						<Input
							id="categoryImageUrl"
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder="https://..."
						/>
					</div>

					<div className="space-y-2">
						<Label>Parent Category</Label>
						<Select
							value={parentId}
							onValueChange={(v) => setParentId(v === "none" ? "" : v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="No parent (top-level)" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No parent (top-level)</SelectItem>
								{availableParents.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{"— ".repeat(c.depth)}{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="categorySortOrder">Sort Order</Label>
						<Input
							id="categorySortOrder"
							type="number"
							min="0"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value)}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="categoryIsActive"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(Boolean(checked))}
						/>
						<Label htmlFor="categoryIsActive">Active</Label>
					</div>
				</form>

				<SheetFooter className="px-4">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? "Saving..."
							: isCreate
								? "Create Category"
								: "Update Category"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
