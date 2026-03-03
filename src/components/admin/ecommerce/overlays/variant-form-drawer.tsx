import { useEffect, useState } from "react";
import { Check, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { parsePriceToCents } from "@/constants";
import {
	useCreateVariant,
	useUpdateVariant,
	useCreateColor,
	useCreateSize,
	useAssignImageToVariant,
} from "@/hooks/ecommerce-actions";
import { useColors, useSizes } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import {
	Dialog,
	DialogContent,
	DialogFooter as DFooter,
	DialogHeader,
	DialogTitle as DTitle,
} from "@/components/ui/dialog";

interface ProductImageData {
	id: string;
	url: string;
	altText?: string | null;
	isPrimary?: boolean;
	variantId?: string | null;
	colorId?: string | null;
}

interface VariantData {
	id?: string;
	productId: string;
	sku: string;
	price?: number | null;
	colorId?: string | null;
	sizeId?: string | null;
	stock?: number;
	weight?: string | null;
	barcode?: string | null;
	isActive?: boolean;
	images?: ProductImageData[];
}

export function VariantFormDrawer() {
	const { id: overlayId, data, close } = useOverlay();
	const isOpen = overlayId === "createVariant" || overlayId === "editVariant";
	const isEdit = overlayId === "editVariant";
	const variant = data as VariantData | null;

	const [sku, setSku] = useState("");
	const [price, setPrice] = useState("");
	const [colorId, setColorId] = useState("");
	const [sizeId, setSizeId] = useState("");
	const [stock, setStock] = useState("0");
	const [weight, setWeight] = useState("");
	const [barcode, setBarcode] = useState("");
	const [isActive, setIsActive] = useState(true);

	// Quick-create color state
	const [showColorCreate, setShowColorCreate] = useState(false);
	const [newColorName, setNewColorName] = useState("");
	const [newColorHex, setNewColorHex] = useState("#000000");

	// Quick-create size state
	const [showSizeCreate, setShowSizeCreate] = useState(false);
	const [newSizeName, setNewSizeName] = useState("");
	const [newSizeCategory, setNewSizeCategory] = useState<"clothing" | "shoes" | "accessories" | "one_size">("clothing");

	const { data: colorsData } = useColors();
	const { data: sizesData } = useSizes();
	const colors = colorsData?.ok ? colorsData.data : [];
	const sizes = sizesData?.ok ? sizesData.data : [];

	const createMutation = useCreateVariant();
	const updateMutation = useUpdateVariant();
	const createColorMutation = useCreateColor();
	const createSizeMutation = useCreateSize();
	const assignImageMutation = useAssignImageToVariant();
	const isPending = createMutation.isPending || updateMutation.isPending;

	// Product images for variant-image linking (only in edit mode)
	// Keep a local copy so UI updates immediately after mutations
	const [localImages, setLocalImages] = useState<ProductImageData[]>([]);
	const [linkByColor, setLinkByColor] = useState(false);

	// Sync local images when overlay opens with fresh data
	useEffect(() => {
		if (isOpen && variant?.images) {
			setLocalImages(variant.images);
			setLinkByColor(false);
		}
	}, [isOpen, variant?.images]);

	const handleToggleImage = (imageId: string, currentlyLinked: boolean) => {
		if (!variant?.id) return;

		const update = linkByColor && colorId
			? { imageId, colorId: currentlyLinked ? null : colorId }
			: { imageId, variantId: currentlyLinked ? null : variant.id };

		assignImageMutation.mutate(update, {
			onSuccess: () => {
				// Optimistically update local state so UI reflects the change
				setLocalImages((prev) =>
					prev.map((img) => {
						if (img.id !== imageId) return img;
						if (linkByColor && colorId) {
							return { ...img, colorId: currentlyLinked ? null : colorId, variantId: null };
						}
						return { ...img, variantId: currentlyLinked ? null : variant.id!, colorId: null };
					}),
				);
			},
		});
	};

	const isImageLinked = (img: ProductImageData) => {
		if (linkByColor && colorId) {
			return img.colorId === colorId;
		}
		return img.variantId === variant?.id;
	};

	const isImageOtherOwner = (img: ProductImageData) => {
		if (linkByColor && colorId) {
			return !!img.colorId && img.colorId !== colorId;
		}
		return !!img.variantId && img.variantId !== variant?.id;
	};

	useEffect(() => {
		if (isOpen && variant) {
			// Pre-fill from variant data (works for both edit and duplicate modes)
			setSku(variant.sku ?? "");
			setPrice(variant.price ? String((variant.price / 100).toFixed(2)) : "");
			setColorId(variant.colorId ?? "");
			setSizeId(variant.sizeId ?? "");
			setStock(String(variant.stock ?? 0));
			setWeight(variant.weight ?? "");
			setBarcode(variant.barcode ?? "");
			setIsActive(variant.isActive ?? true);
		} else if (isOpen) {
			// Brand new variant with no pre-fill data
			setSku("");
			setPrice("");
			setColorId("");
			setSizeId("");
			setStock("0");
			setWeight("");
			setBarcode("");
			setIsActive(true);
		}
	}, [isOpen, variant]);

	const handleSubmit = () => {
		if (!variant?.productId) return;

		const priceInCents = price ? parsePriceToCents(price) : undefined;

		if (isEdit && variant.id) {
			updateMutation.mutate(
				{
					id: variant.id,
					sku: sku || undefined,
					price: priceInCents,
					colorId: colorId || null,
					sizeId: sizeId || null,
					weight: weight || undefined,
					barcode: barcode || undefined,
					isActive,
				},
				{ onSuccess: (r) => { if (r.ok) close(); } },
			);
		} else {
			createMutation.mutate(
				{
					productId: variant.productId,
					sku,
					price: priceInCents,
					colorId: colorId || undefined,
					sizeId: sizeId || undefined,
					stock: parseInt(stock, 10) || 0,
					weight: weight || undefined,
					barcode: barcode || undefined,
					isActive,
				},
				{ onSuccess: (r) => { if (r.ok) close(); } },
			);
		}
	};

	const handleCreateColor = () => {
		if (!newColorName || !newColorHex) return;
		createColorMutation.mutate(
			{ name: newColorName, hexCode: newColorHex },
			{
				onSuccess: (r) => {
					if (r.ok) {
						setColorId((r.data as any).id);
						setShowColorCreate(false);
						setNewColorName("");
						setNewColorHex("#000000");
					}
				},
			},
		);
	};

	const handleCreateSize = () => {
		if (!newSizeName) return;
		createSizeMutation.mutate(
			{ name: newSizeName, sizeCategory: newSizeCategory },
			{
				onSuccess: (r) => {
					if (r.ok) {
						setSizeId((r.data as any).id);
						setShowSizeCreate(false);
						setNewSizeName("");
					}
				},
			},
		);
	};

	// Group sizes by category
	const sizesByCategory = sizes.reduce(
		(acc: Record<string, typeof sizes>, s: any) => {
			const cat = s.sizeCategory || "other";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(s);
			return acc;
		},
		{} as Record<string, typeof sizes>,
	);

	// Lookup selected color/size for display in trigger
	const selectedColor = colorId ? (colors as any[]).find((c) => c.id === colorId) : null;
	const selectedSize = sizeId ? (sizes as any[]).find((s) => s.id === sizeId) : null;

	return (
		<>
			<Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
				<SheetContent className="overflow-y-auto sm:max-w-md">
					<SheetHeader>
						<SheetTitle>{isEdit ? "Edit Variant" : "Create Variant"}</SheetTitle>
						<SheetDescription>
							{isEdit ? "Update variant details" : "Add a new product variant"}
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="var-sku">SKU</Label>
							<Input
								id="var-sku"
								value={sku}
								onChange={(e) => setSku(e.target.value)}
								placeholder="e.g. PROD-BLK-M"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="var-price">Price Override</Label>
							<p className="text-xs text-muted-foreground">Leave empty to use the product's base price</p>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
								<Input
									id="var-price"
									type="number"
									step="0.01"
									min="0"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									placeholder="0.00"
									className="pl-7"
								/>
							</div>
						</div>

						{/* Color Selector */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Color</Label>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 text-xs"
									onClick={() => setShowColorCreate(true)}
								>
									<Plus className="mr-1 h-3 w-3" /> New Color
								</Button>
							</div>
							<Select value={colorId} onValueChange={(v) => setColorId(v === "none" ? "" : v)}>
								<SelectTrigger>
									{colorId && selectedColor ? (
										<span className="flex items-center gap-2">
											<span
												className="h-3 w-3 rounded-full border shrink-0"
												style={{ backgroundColor: selectedColor.hexCode }}
											/>
											{selectedColor.name}
										</span>
									) : (
										<SelectValue placeholder="Select color" />
									)}
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No color</SelectItem>
									{(colors as any[]).map((c) => (
										<SelectItem key={c.id} value={c.id}>
											<div className="flex items-center gap-2">
												<div
													className="h-3 w-3 rounded-full border"
													style={{ backgroundColor: c.hexCode }}
												/>
												{c.name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Size Selector */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Size</Label>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 text-xs"
									onClick={() => setShowSizeCreate(true)}
								>
									<Plus className="mr-1 h-3 w-3" /> New Size
								</Button>
							</div>
							<Select value={sizeId} onValueChange={(v) => setSizeId(v === "none" ? "" : v)}>
								<SelectTrigger>
									{sizeId && selectedSize ? (
										<span>{selectedSize.name}</span>
									) : (
										<SelectValue placeholder="Select size" />
									)}
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No size</SelectItem>
									{Object.entries(sizesByCategory).map(([cat, catSizes]) => (
										<div key={cat}>
											<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
												{cat.replace("_", " ")}
											</div>
											{(catSizes as any[]).map((s) => (
												<SelectItem key={s.id} value={s.id}>
													{s.name}
												</SelectItem>
											))}
										</div>
									))}
								</SelectContent>
							</Select>
						</div>

						{!isEdit && (
							<div className="space-y-2">
								<Label htmlFor="var-stock">Initial Stock</Label>
								<Input
									id="var-stock"
									type="number"
									min="0"
									value={stock}
									onChange={(e) => setStock(e.target.value)}
								/>
							</div>
						)}

						<div className="grid gap-4 grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="var-weight">Weight</Label>
								<Input
									id="var-weight"
									value={weight}
									onChange={(e) => setWeight(e.target.value)}
									placeholder="e.g. 0.5 kg"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="var-barcode">Barcode</Label>
								<Input
									id="var-barcode"
									value={barcode}
									onChange={(e) => setBarcode(e.target.value)}
									placeholder="UPC/EAN"
								/>
							</div>
						</div>

						<div className="space-y-1">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="var-active"
								checked={isActive}
								onCheckedChange={(checked) => setIsActive(Boolean(checked))}
							/>
							<Label htmlFor="var-active">Active</Label>
						</div>
						<p className="text-xs text-muted-foreground pl-6">Inactive variants won't be available for purchase</p>
						</div>

						{/* Variant Image Linking (edit mode only) */}
						{isEdit && localImages.length > 0 && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label className="flex items-center gap-1.5">
										<ImageIcon className="h-3.5 w-3.5" />
										Variant Images
									</Label>
									{colorId && selectedColor && (
										<div className="flex items-center gap-1.5">
											<Checkbox
												id="link-by-color"
												checked={linkByColor}
												onCheckedChange={(checked) => setLinkByColor(Boolean(checked))}
											/>
											<Label htmlFor="link-by-color" className="text-xs font-normal cursor-pointer flex items-center gap-1">
												Link by
												<span
													className="inline-block h-2.5 w-2.5 rounded-full border"
													style={{ backgroundColor: selectedColor.hexCode }}
												/>
												{selectedColor.name}
											</Label>
										</div>
									)}
								</div>
								<p className="text-xs text-muted-foreground">
									{linkByColor && colorId
										? `Click to link images to all ${selectedColor?.name} variants.`
										: "Click to link images to this variant. Unlinked images show for all variants by default."
									}
								</p>
								<div className="grid grid-cols-4 gap-2">
									{localImages.map((img) => {
										const linked = isImageLinked(img);
										const otherOwner = isImageOtherOwner(img);
										return (
											<button
												key={img.id}
												type="button"
												disabled={assignImageMutation.isPending || otherOwner}
												onClick={() => handleToggleImage(img.id, linked)}
												className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
													linked
														? "border-primary ring-1 ring-primary/30"
														: otherOwner
															? "border-muted opacity-40 cursor-not-allowed"
															: "border-transparent hover:border-muted-foreground/50"
												}`}
												title={
													linked
														? "Linked (click to unlink)"
														: otherOwner
															? "Linked to another variant/color"
															: "Default image (click to link)"
												}
											>
												<img
													src={img.url}
													alt={img.altText ?? "Product image"}
													className="h-full w-full object-cover"
												/>
												{linked && (
													<div className="absolute inset-0 flex items-center justify-center bg-primary/20">
														<Check className="h-5 w-5 text-primary drop-shadow" />
													</div>
												)}
												{!linked && !otherOwner && (
													<div className="absolute bottom-0 inset-x-0 bg-black/40 py-0.5 text-center">
														<span className="text-[9px] text-white/80">default</span>
													</div>
												)}
											</button>
										);
									})}
								</div>
							</div>
						)}
					</div>

					<SheetFooter>
						<Button variant="outline" onClick={close}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={isPending || !sku}>
							{isPending ? "Saving..." : isEdit ? "Update" : "Create"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			{/* Quick Create Color Dialog */}
			<Dialog open={showColorCreate} onOpenChange={setShowColorCreate}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DTitle>New Color</DTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Name</Label>
							<Input
								value={newColorName}
								onChange={(e) => setNewColorName(e.target.value)}
								placeholder="e.g. Midnight Black"
							/>
						</div>
						<div className="space-y-2">
							<Label>Color</Label>
							<div className="flex items-center gap-3">
								<input
									type="color"
									value={newColorHex}
									onChange={(e) => setNewColorHex(e.target.value)}
									className="h-10 w-10 cursor-pointer rounded border"
								/>
								<Input
									value={newColorHex}
									onChange={(e) => setNewColorHex(e.target.value)}
									placeholder="#000000"
									className="font-mono"
								/>
							</div>
						</div>
					</div>
					<DFooter>
						<Button variant="outline" onClick={() => setShowColorCreate(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateColor}
							disabled={createColorMutation.isPending || !newColorName}
						>
							{createColorMutation.isPending ? "Creating..." : "Create"}
						</Button>
					</DFooter>
				</DialogContent>
			</Dialog>

			{/* Quick Create Size Dialog */}
			<Dialog open={showSizeCreate} onOpenChange={setShowSizeCreate}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DTitle>New Size</DTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Name</Label>
							<Input
								value={newSizeName}
								onChange={(e) => setNewSizeName(e.target.value)}
								placeholder="e.g. M, 10, One Size"
							/>
						</div>
						<div className="space-y-2">
							<Label>Category</Label>
							<Select value={newSizeCategory} onValueChange={(v) => setNewSizeCategory(v as any)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="clothing">Clothing</SelectItem>
									<SelectItem value="shoes">Shoes</SelectItem>
									<SelectItem value="accessories">Accessories</SelectItem>
									<SelectItem value="one_size">One Size</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DFooter>
						<Button variant="outline" onClick={() => setShowSizeCreate(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateSize}
							disabled={createSizeMutation.isPending || !newSizeName}
						>
							{createSizeMutation.isPending ? "Creating..." : "Create"}
						</Button>
					</DFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
