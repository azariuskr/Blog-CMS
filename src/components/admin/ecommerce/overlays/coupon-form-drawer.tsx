import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCreateCoupon, useUpdateCoupon } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

interface CouponData {
	id: string;
	code: string;
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	minOrderAmount: number | null;
	maxUses: number | null;
	expiresAt: Date | null;
	isActive: boolean;
}

export function CouponFormDrawer() {
	const { id, data, close } = useOverlay();
	const isCreate = id === "createCoupon";
	const isEdit = id === "editCoupon";
	const isOpen = isCreate || isEdit;
	const coupon = isEdit ? (data as CouponData | null) : null;

	const [code, setCode] = useState("");
	const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
	const [discountValue, setDiscountValue] = useState("");
	const [minOrderAmount, setMinOrderAmount] = useState("");
	const [usageLimit, setUsageLimit] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [isActive, setIsActive] = useState(true);

	const createMutation = useCreateCoupon();
	const updateMutation = useUpdateCoupon();
	const isPending = createMutation.isPending || updateMutation.isPending;

	useEffect(() => {
		if (isEdit && coupon) {
			setCode(coupon.code);
			setDiscountType(coupon.discountType);
			setDiscountValue(
				coupon.discountType === "percentage"
					? String(coupon.discountValue)
					: String((coupon.discountValue / 100).toFixed(2)),
			);
			setMinOrderAmount(
				coupon.minOrderAmount
					? String((coupon.minOrderAmount / 100).toFixed(2))
					: "",
			);
			setUsageLimit(coupon.maxUses ? String(coupon.maxUses) : "");
			setExpiresAt(
				coupon.expiresAt
					? new Date(coupon.expiresAt).toISOString().slice(0, 16)
					: "",
			);
			setIsActive(coupon.isActive);
		}
	}, [isEdit, coupon]);

	const resetForm = () => {
		setCode("");
		setDiscountType("percentage");
		setDiscountValue("");
		setMinOrderAmount("");
		setUsageLimit("");
		setExpiresAt("");
		setIsActive(true);
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const discountVal =
			discountType === "percentage"
				? Number(discountValue)
				: Math.round(Number(discountValue) * 100);

		const minOrder = minOrderAmount
			? Math.round(Number(minOrderAmount) * 100)
			: undefined;

		if (isCreate) {
			createMutation.mutate(
				{
					code: code.toUpperCase(),
					discountType,
					discountValue: discountVal,
					minOrderAmount: minOrder,
					usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
					expiresAt: expiresAt || undefined,
					isActive,
				},
				{ onSuccess: () => handleClose() },
			);
		} else if (isEdit && coupon) {
			updateMutation.mutate(
				{
					couponId: coupon.id,
					code: code.toUpperCase(),
					discountType,
					discountValue: discountVal,
					minOrderAmount: minOrder,
					usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
					expiresAt: expiresAt || undefined,
					isActive,
				},
				{ onSuccess: () => handleClose() },
			);
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Tag className="h-5 w-5 text-primary" />
						{isCreate ? "Create Coupon" : "Edit Coupon"}
					</SheetTitle>
					<SheetDescription>
						{isCreate
							? "Create a new discount coupon code."
							: "Update coupon details."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="code">Coupon Code</Label>
						<Input
							id="code"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder="SUMMER2024"
							className="uppercase"
							required
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Discount Type</Label>
							<Select
								value={discountType}
								onValueChange={(v) =>
									setDiscountType(v as "percentage" | "fixed_amount")
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="percentage">Percentage (%)</SelectItem>
									<SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="discountValue">
								{discountType === "percentage" ? "Percentage" : "Amount ($)"}
							</Label>
							<Input
								id="discountValue"
								type="number"
								step={discountType === "percentage" ? "1" : "0.01"}
								min="0"
								max={discountType === "percentage" ? "100" : undefined}
								value={discountValue}
								onChange={(e) => setDiscountValue(e.target.value)}
								placeholder="0"
								required
							/>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="minOrderAmount">Min Order ($, optional)</Label>
							<Input
								id="minOrderAmount"
								type="number"
								step="0.01"
								min="0"
								value={minOrderAmount}
								onChange={(e) => setMinOrderAmount(e.target.value)}
								placeholder="0.00"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="usageLimit">Usage Limit (optional)</Label>
							<Input
								id="usageLimit"
								type="number"
								min="1"
								value={usageLimit}
								onChange={(e) => setUsageLimit(e.target.value)}
								placeholder="Unlimited"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="expiresAt">Expiration Date (optional)</Label>
						<Input
							id="expiresAt"
							type="datetime-local"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="isActive"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(Boolean(checked))}
						/>
						<Label htmlFor="isActive">Active</Label>
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
								? "Create Coupon"
								: "Update Coupon"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
