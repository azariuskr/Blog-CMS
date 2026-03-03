import { useState } from "react";
import { Grid3X3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useBulkCreateVariants } from "@/hooks/ecommerce-actions";
import { useColors, useSizes } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";

export function GenerateVariantsDialog() {
	const { id: overlayId, data, close } = useOverlay();
	const isOpen = overlayId === "generateVariants";
	const productId = (data as any)?.productId as string | undefined;
	const productSlug = (data as any)?.slug as string | undefined;

	const [selectedColors, setSelectedColors] = useState<string[]>([]);
	const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
	const [skuPrefix, setSkuPrefix] = useState("");
	const [stock, setStock] = useState("0");

	const { data: colorsData } = useColors();
	const { data: sizesData } = useSizes();
	const colors = (colorsData?.ok ? colorsData.data : []) as Array<{ id: string; name: string; hexCode: string }>;
	const sizes = (sizesData?.ok ? sizesData.data : []) as Array<{ id: string; name: string; sizeCategory?: string }>;

	const bulkCreate = useBulkCreateVariants();

	// Group sizes by category
	const sizesByCategory = sizes.reduce(
		(acc: Record<string, typeof sizes>, s) => {
			const cat = s.sizeCategory || "other";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(s);
			return acc;
		},
		{} as Record<string, typeof sizes>,
	);

	const toggleColor = (id: string) => {
		setSelectedColors((prev) =>
			prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
		);
	};

	const toggleSize = (id: string) => {
		setSelectedSizes((prev) =>
			prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
		);
	};

	const comboCount =
		selectedColors.length > 0 && selectedSizes.length > 0
			? selectedColors.length * selectedSizes.length
			: selectedColors.length || selectedSizes.length;

	const handleGenerate = () => {
		if (!productId || comboCount === 0) return;
		bulkCreate.mutate(
			{
				productId,
				colorIds: selectedColors,
				sizeIds: selectedSizes,
				skuPrefix: skuPrefix || productSlug || "VAR",
				stock: parseInt(stock, 10) || 0,
			},
			{
				onSuccess: (r) => {
					if (r.ok) {
						setSelectedColors([]);
						setSelectedSizes([]);
						setSkuPrefix("");
						setStock("0");
						close();
					}
				},
			},
		);
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setSelectedColors([]);
			setSelectedSizes([]);
			close();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Grid3X3 className="h-5 w-5" />
						Generate Variants
					</DialogTitle>
					<DialogDescription>
						Select colors and sizes to generate all combinations automatically.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 py-2">
					{/* Colors */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-semibold">Colors</Label>
							{colors.length > 0 && (
								<button
									type="button"
									className="text-xs text-primary hover:underline"
									onClick={() =>
										setSelectedColors(
											selectedColors.length === colors.length
												? []
												: colors.map((c) => c.id),
										)
									}
								>
									{selectedColors.length === colors.length ? "Deselect all" : "Select all"}
								</button>
							)}
						</div>
						{colors.length === 0 ? (
							<p className="text-sm text-muted-foreground">No colors created yet. Create colors in the single variant form first.</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{colors.map((c) => (
									<button
										key={c.id}
										type="button"
										onClick={() => toggleColor(c.id)}
										className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm transition-all ${
											selectedColors.includes(c.id)
												? "border-primary bg-primary/5 font-medium"
												: "border-border hover:border-primary/50"
										}`}
									>
										<div
											className="h-4 w-4 rounded-full border"
											style={{ backgroundColor: c.hexCode }}
										/>
										{c.name}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Sizes */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-semibold">Sizes</Label>
							{sizes.length > 0 && (
								<button
									type="button"
									className="text-xs text-primary hover:underline"
									onClick={() =>
										setSelectedSizes(
											selectedSizes.length === sizes.length
												? []
												: sizes.map((s) => s.id),
										)
									}
								>
									{selectedSizes.length === sizes.length ? "Deselect all" : "Select all"}
								</button>
							)}
						</div>
						{sizes.length === 0 ? (
							<p className="text-sm text-muted-foreground">No sizes created yet. Create sizes in the single variant form first.</p>
						) : (
							<div className="space-y-3">
								{Object.entries(sizesByCategory).map(([cat, catSizes]) => (
									<div key={cat}>
										<p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
											{cat.replace("_", " ")}
										</p>
										<div className="flex flex-wrap gap-2">
											{catSizes.map((s) => (
												<button
													key={s.id}
													type="button"
													onClick={() => toggleSize(s.id)}
													className={`rounded-lg border-2 px-3 py-1.5 text-sm transition-all ${
														selectedSizes.includes(s.id)
															? "border-primary bg-primary/5 font-medium"
															: "border-border hover:border-primary/50"
													}`}
												>
													{s.name}
												</button>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Options */}
					<div className="grid gap-4 grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="gen-sku">SKU Prefix</Label>
							<Input
								id="gen-sku"
								value={skuPrefix}
								onChange={(e) => setSkuPrefix(e.target.value)}
								placeholder={productSlug || "e.g. TSHIRT"}
							/>
							<p className="text-xs text-muted-foreground">
								Auto-generates: PREFIX-COLOR-SIZE
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="gen-stock">Initial Stock (each)</Label>
							<Input
								id="gen-stock"
								type="number"
								min="0"
								value={stock}
								onChange={(e) => setStock(e.target.value)}
							/>
						</div>
					</div>

					{/* Preview */}
					{comboCount > 0 && (
						<div className="rounded-lg border bg-muted/50 p-3">
							<p className="text-sm font-medium">
								Will generate <strong>{comboCount}</strong> variant{comboCount !== 1 ? "s" : ""}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{selectedColors.length > 0 && `${selectedColors.length} color${selectedColors.length !== 1 ? "s" : ""}`}
								{selectedColors.length > 0 && selectedSizes.length > 0 && " × "}
								{selectedSizes.length > 0 && `${selectedSizes.length} size${selectedSizes.length !== 1 ? "s" : ""}`}
								{" "}— duplicates will be skipped automatically
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleGenerate}
						disabled={bulkCreate.isPending || comboCount === 0}
					>
						{bulkCreate.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Generating...
							</>
						) : (
							`Generate ${comboCount} Variant${comboCount !== 1 ? "s" : ""}`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
