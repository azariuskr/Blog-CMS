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
import { useDeleteBrand } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function DeleteBrandDialog() {
	const { id, data, close } = useOverlay();
	const brand = data as { id: string; name?: string } | null;

	const deleteMutation = useDeleteBrand();

	const handleDelete = () => {
		if (!brand) return;
		deleteMutation.mutate(
			{ brandId: brand.id },
			{ onSuccess: () => close() },
		);
	};

	return (
		<Dialog
			open={id === "deleteBrand"}
			onOpenChange={(open) => !open && close()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Brand
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete brand{" "}
						<strong>{brand?.name ?? ""}</strong>? This action cannot be
						undone. Brands with associated products cannot be deleted.
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
						{deleteMutation.isPending ? "Deleting..." : "Delete Brand"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
