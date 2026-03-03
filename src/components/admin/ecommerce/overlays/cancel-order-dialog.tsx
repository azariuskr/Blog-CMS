import { useState } from "react";
import { XCircle } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelOrder } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function CancelOrderDialog() {
	const { id, data, close } = useOverlay();
	const order = data as { id: string; orderNumber?: string } | null;

	const [reason, setReason] = useState("");
	const [restockItems, setRestockItems] = useState(true);

	const cancelMutation = useCancelOrder();

	const resetForm = () => {
		setReason("");
		setRestockItems(true);
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!order) return;

		cancelMutation.mutate(
			{
				orderId: order.id,
				reason: reason || undefined,
				restockItems,
			},
			{ onSuccess: () => handleClose() },
		);
	};

	return (
		<Dialog
			open={id === "cancelOrder"}
			onOpenChange={(open) => !open && handleClose()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<XCircle className="h-5 w-5 text-destructive" />
						Cancel Order {order?.orderNumber ? `#${order.orderNumber}` : ""}
					</DialogTitle>
					<DialogDescription>
						This action cannot be undone. The order will be marked as cancelled.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="reason">Reason (optional)</Label>
						<Textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Reason for cancellation..."
							rows={3}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="restockItems"
							checked={restockItems}
							onCheckedChange={(checked) => setRestockItems(Boolean(checked))}
						/>
						<Label htmlFor="restockItems">
							Restock items back to inventory
						</Label>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Keep Order
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={cancelMutation.isPending}
						>
							{cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
