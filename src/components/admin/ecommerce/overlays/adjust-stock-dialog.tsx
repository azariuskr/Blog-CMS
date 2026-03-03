import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAdjustStock } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

export function AdjustStockDialog() {
	const { id, data, close } = useOverlay();
	const item = data as {
		id: string;
		productName?: string;
		variantName?: string | null;
		sku?: string;
		stock?: number;
	} | null;

	const [adjustment, setAdjustment] = useState("");
	const [direction, setDirection] = useState<"add" | "remove">("add");
	const [reason, setReason] = useState("restock");
	const [notes, setNotes] = useState("");

	const adjustMutation = useAdjustStock();

	const resetForm = () => {
		setAdjustment("");
		setDirection("add");
		setReason("restock");
		setNotes("");
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!item || !adjustment) return;

		const qty = parseInt(adjustment, 10);
		if (Number.isNaN(qty) || qty <= 0) return;

		adjustMutation.mutate(
			{
				variantId: item.id,
				adjustment: direction === "add" ? qty : -qty,
				reason,
				notes: notes || undefined,
			},
			{ onSuccess: () => handleClose() },
		);
	};

	return (
		<Dialog
			open={id === "adjustStock"}
			onOpenChange={(open) => !open && handleClose()}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ArrowUpDown className="h-5 w-5 text-primary" />
						Adjust Stock
					</DialogTitle>
					<DialogDescription>
						{item?.productName}
						{item?.variantName ? ` - ${item.variantName}` : ""}
						{item?.sku ? ` (${item.sku})` : ""}
						{item?.stock != null ? ` | Current: ${item.stock}` : ""}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Direction</Label>
							<Select
								value={direction}
								onValueChange={(v) => setDirection(v as "add" | "remove")}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="add">Add Stock</SelectItem>
									<SelectItem value="remove">Remove Stock</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="adjustment">Quantity</Label>
							<Input
								id="adjustment"
								type="number"
								min="1"
								value={adjustment}
								onChange={(e) => setAdjustment(e.target.value)}
								placeholder="0"
								required
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Reason</Label>
						<Select value={reason} onValueChange={setReason}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="restock">Restock</SelectItem>
								<SelectItem value="return">Customer Return</SelectItem>
								<SelectItem value="damaged">Damaged/Lost</SelectItem>
								<SelectItem value="correction">Inventory Correction</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notes (optional)</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Additional notes..."
							rows={2}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={adjustMutation.isPending}>
							{adjustMutation.isPending ? "Adjusting..." : "Adjust Stock"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
