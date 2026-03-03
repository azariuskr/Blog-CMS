import { useState } from "react";
import { Truck } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SHIPPING_CARRIERS } from "@/constants";
import { useAddShipment } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function ShipOrderDialog() {
	const { id, data, close } = useOverlay();
	const order = data as { id: string; orderNumber?: string } | null;

	const [trackingNumber, setTrackingNumber] = useState("");
	const [carrier, setCarrier] = useState<string>("USPS");
	const [trackingUrl, setTrackingUrl] = useState("");

	const shipMutation = useAddShipment();

	const resetForm = () => {
		setTrackingNumber("");
		setCarrier("USPS");
		setTrackingUrl("");
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!order) return;

		shipMutation.mutate(
			{
				orderId: order.id,
				trackingNumber,
				carrier,
				trackingUrl: trackingUrl || undefined,
			},
			{ onSuccess: () => handleClose() },
		);
	};

	return (
		<Dialog
			open={id === "shipOrder"}
			onOpenChange={(open) => !open && handleClose()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Truck className="h-5 w-5 text-primary" />
						Ship Order {order?.orderNumber ? `#${order.orderNumber}` : ""}
					</DialogTitle>
					<DialogDescription>
						Enter shipping details to mark this order as shipped.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="carrier">Carrier</Label>
						<Select value={carrier} onValueChange={setCarrier}>
							<SelectTrigger id="carrier">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SHIPPING_CARRIERS.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="trackingNumber">Tracking Number</Label>
						<Input
							id="trackingNumber"
							value={trackingNumber}
							onChange={(e) => setTrackingNumber(e.target.value)}
							placeholder="Enter tracking number"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
						<Input
							id="trackingUrl"
							value={trackingUrl}
							onChange={(e) => setTrackingUrl(e.target.value)}
							placeholder="https://..."
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={shipMutation.isPending}>
							{shipMutation.isPending ? "Shipping..." : "Mark as Shipped"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
