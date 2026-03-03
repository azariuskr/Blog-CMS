import { Trash2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteCategory } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function DeleteCategoryDialog() {
	const { id, data, close } = useOverlay();
	const cat = data as { id: string; name?: string } | null;

	const deleteMutation = useDeleteCategory();

	const handleDelete = () => {
		if (!cat) return;
		deleteMutation.mutate(
			{ categoryId: cat.id },
			{ onSuccess: () => close() },
		);
	};

	return (
		<Dialog
			open={id === "deleteCategory"}
			onOpenChange={(open) => !open && close()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Category
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete category{" "}
						<strong>{cat?.name ?? ""}</strong>? This action cannot be
						undone. Categories with associated products or child categories
						cannot be deleted.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button variant="outline" onClick={close}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending ? "Deleting..." : "Delete Category"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
