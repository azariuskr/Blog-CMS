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
import { useDeleteProduct } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function ConfirmDeleteProductDialog() {
	const { id, data, close } = useOverlay();
	const product = data as { id: string; name?: string } | null;

	const deleteMutation = useDeleteProduct();

	const handleDelete = () => {
		if (!product) return;
		deleteMutation.mutate(
			{ id: product.id },
			{ onSuccess: () => close() },
		);
	};

	return (
		<Dialog
			open={id === "confirmDeleteProduct"}
			onOpenChange={(open) => !open && close()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Product
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete{" "}
						<span className="font-medium">{product?.name ?? "this product"}</span>?
						This action cannot be undone.
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
						{deleteMutation.isPending ? "Deleting..." : "Delete Product"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
