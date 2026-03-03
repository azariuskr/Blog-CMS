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
import { useDeleteReview } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function DeleteReviewDialog() {
	const { id, data, close } = useOverlay();
	const review = data as { id: string; title?: string | null } | null;

	const deleteMutation = useDeleteReview();

	const handleDelete = () => {
		if (!review) return;
		deleteMutation.mutate(
			{ reviewId: review.id },
			{ onSuccess: () => close() },
		);
	};

	return (
		<Dialog
			open={id === "deleteReview"}
			onOpenChange={(open) => !open && close()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Review
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this review
						{review?.title ? ` "${review.title}"` : ""}? This action cannot be
						undone.
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
						{deleteMutation.isPending ? "Deleting..." : "Delete Review"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
