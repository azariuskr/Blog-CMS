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
import { useDeleteCoupon } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function DeleteCouponDialog() {
	const { id, data, close } = useOverlay();
	const coupon = data as { id: string; code?: string } | null;

	const deleteMutation = useDeleteCoupon();

	const handleDelete = () => {
		if (!coupon) return;
		deleteMutation.mutate(
			{ couponId: coupon.id },
			{ onSuccess: () => close() },
		);
	};

	return (
		<Dialog
			open={id === "deleteCoupon"}
			onOpenChange={(open) => !open && close()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Coupon
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete coupon{" "}
						<code className="rounded bg-muted px-1 font-mono text-sm">
							{coupon?.code ?? ""}
						</code>
						? This action cannot be undone.
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
						{deleteMutation.isPending ? "Deleting..." : "Delete Coupon"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
