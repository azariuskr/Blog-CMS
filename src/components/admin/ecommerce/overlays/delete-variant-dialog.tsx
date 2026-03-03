import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteVariant } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function DeleteVariantDialog() {
	const { id, data, close } = useOverlay();
	const variant = data as { id: string; sku: string } | null;

	const deleteMutation = useDeleteVariant();

	const handleDelete = () => {
		if (!variant) return;
		deleteMutation.mutate(
			{ id: variant.id },
			{ onSuccess: (r) => { if (r.ok) close(); } },
		);
	};

	return (
		<Dialog open={id === "deleteVariant"} onOpenChange={(open) => !open && close()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Variant</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete variant{" "}
						<strong>{variant?.sku}</strong>? This action cannot be undone.
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
						{deleteMutation.isPending ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
