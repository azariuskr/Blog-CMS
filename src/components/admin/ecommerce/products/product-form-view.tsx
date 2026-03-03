import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Grid3X3, ImageIcon, Package, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import {
	VariantFormDrawer,
	GenerateVariantsDialog,
	DeleteVariantDialog,
} from "@/components/admin/ecommerce/overlays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	PRODUCT_STATUS_LABELS,
	PRODUCT_STATUSES,
	ROUTES,
	type ProductStatus,
	formatPrice,
	parsePriceToCents,
} from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
	useAdjustStock,
	useCreateProduct,
	useUpdateProduct,
	useUpdateVariant,
} from "@/hooks/ecommerce-actions";
import {
	useAdminProduct,
	useAdminBrands,
	useAdminCategoryTree,
} from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import { ProductImageManager } from "./product-image-manager";

const TAG_PRESETS = ["new", "hot", "bestseller", "limited edition", "trending", "exclusive"];

interface ProductFormViewProps {
	mode?: "create" | "edit";
	productId?: string;
}

export function ProductFormView({ productId }: ProductFormViewProps) {
	const navigate = useNavigate();
	const isNew = !productId;

	const canWrite = useHasPermission({ products: ["write"] });
	const { open } = useOverlay();

	// Load existing product for editing
	const { data: productData, isLoading, isError, error, refetch } = useAdminProduct(productId ?? "");
	const existingProduct = productData?.ok ? (productData.data as any) : null;
	const loadError = !isNew && !isLoading && !existingProduct
		? (isError ? (error?.message ?? "Failed to load product") : (productData && !productData.ok ? (productData as any).message ?? "Access denied" : null))
		: null;

	// Load brands and categories for dropdowns
	const { data: brandsData } = useAdminBrands({ page: 1, limit: 100 });
	const brands = brandsData?.ok
		? (brandsData.data.items as Array<{ id: string; name: string }>)
		: [];

	const { data: treeData } = useAdminCategoryTree();
	const categoryTree = treeData?.ok
		? (treeData.data as Array<{ id: string; name: string; depth: number }>)
		: [];

	const createMutation = useCreateProduct();
	const updateMutation = useUpdateProduct();
	const toggleVariantStatus = useUpdateVariant();
	const adjustStock = useAdjustStock();
	const isSaving = createMutation.isPending || updateMutation.isPending;

	// Form state
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [shortDescription, setShortDescription] = useState("");
	const [basePrice, setBasePrice] = useState("");
	const [salePrice, setSalePrice] = useState("");
	const [costPrice, setCostPrice] = useState("");
	const [status, setStatus] = useState<ProductStatus>("draft");
	const [isFeatured, setIsFeatured] = useState(false);
	const [brandId, setBrandId] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [metaTitle, setMetaTitle] = useState("");
	const [metaDescription, setMetaDescription] = useState("");
	const [lowStockThreshold, setLowStockThreshold] = useState("10");
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const [initialized, setInitialized] = useState(false);

	// Populate form when product data loads
	useEffect(() => {
		if (existingProduct && !initialized) {
			setName(existingProduct.name);
			setSlug(existingProduct.slug);
			setDescription(existingProduct.description ?? "");
			setShortDescription(existingProduct.shortDescription ?? "");
			setBasePrice(String((existingProduct.basePrice / 100).toFixed(2)));
			setSalePrice(existingProduct.salePrice ? String((existingProduct.salePrice / 100).toFixed(2)) : "");
			setCostPrice(existingProduct.costPrice ? String((existingProduct.costPrice / 100).toFixed(2)) : "");
			setStatus(existingProduct.status as ProductStatus);
			setIsFeatured(existingProduct.isFeatured ?? false);
			setBrandId(existingProduct.brandId ?? "");
			setCategoryId(existingProduct.categoryId ?? "");
			setMetaTitle(existingProduct.metaTitle ?? "");
			setMetaDescription(existingProduct.metaDescription ?? "");
			setLowStockThreshold(String(existingProduct.lowStockThreshold ?? 10));
			setTags(existingProduct.tags ?? []);
			setInitialized(true);
		}
	}, [existingProduct, initialized]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!canWrite) {
			toast.error("You don't have permission to save products");
			return;
		}

		const priceInCents = parsePriceToCents(basePrice);
		const salePriceInCents = salePrice ? parsePriceToCents(salePrice) : undefined;
		const costPriceInCents = costPrice ? parsePriceToCents(costPrice) : undefined;

		if (isNew) {
			createMutation.mutate(
				{
					name,
					slug,
					description: description || undefined,
					shortDescription: shortDescription || undefined,
					basePrice: priceInCents,
					salePrice: salePriceInCents,
					costPrice: costPriceInCents,
					status,
					isFeatured,
					tags,
					brandId: brandId || undefined,
					categoryId: categoryId || undefined,
					metaTitle: metaTitle || undefined,
					metaDescription: metaDescription || undefined,
					lowStockThreshold: parseInt(lowStockThreshold, 10) || 10,
				},
				{
					onSuccess: (result) => {
						if (result.ok) {
							const newId = (result.data as any)?.id;
							if (newId) {
								toast.info("Product created — now add images and variants");
								navigate({ to: ROUTES.ADMIN.PRODUCT_DETAIL(newId) as string });
							} else {
								navigate({ to: ROUTES.ADMIN.PRODUCTS });
							}
						}
					},
				},
			);
		} else {
			updateMutation.mutate(
				{
					id: productId!,
					name,
					slug,
					description: description || undefined,
					shortDescription: shortDescription || undefined,
					basePrice: priceInCents,
					salePrice: salePriceInCents,
					costPrice: costPriceInCents,
					status,
					isFeatured,
					tags,
					brandId: brandId || undefined,
					categoryId: categoryId || undefined,
					metaTitle: metaTitle || undefined,
					metaDescription: metaDescription || undefined,
					lowStockThreshold: parseInt(lowStockThreshold, 10) || 10,
				},
				{ onSuccess: (result) => { if (result.ok) navigate({ to: ROUTES.ADMIN.PRODUCTS }); } },
			);
		}
	};

	// Auto-generate slug from name
	const handleNameChange = (value: string) => {
		setName(value);
		if (isNew) {
			setSlug(
				value
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, ""),
			);
		}
	};

	const addTag = (tag: string) => {
		const val = tag.trim().toLowerCase();
		if (val && !tags.includes(val) && tags.length < 10) {
			setTags([...tags, val]);
		}
	};

	// Extract images and variants from existing product
	const images = existingProduct?.images ?? [];
	const variants = existingProduct?.variants ?? [];

	return (
		<PageContainer
			title={isNew ? "New Product" : "Edit Product"}
			description={isNew ? "Create a new product" : "Update product details"}
			actions={
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => navigate({ to: ROUTES.ADMIN.PRODUCTS })}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canWrite || isSaving}
					>
						<Save className="mr-2 h-4 w-4" />
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			}
		>
			<LoadingSwap isLoading={!isNew && isLoading}>
				{loadError ? (
					<Card>
						<CardContent className="flex flex-col items-center gap-4 py-10">
							<p className="text-destructive font-medium">{loadError}</p>
							<Button variant="outline" onClick={() => refetch()}>
								Try Again
							</Button>
						</CardContent>
					</Card>
				) : (
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="name">Product Name</Label>
									<Input
										id="name"
										value={name}
										onChange={(e) => handleNameChange(e.target.value)}
										placeholder="Enter product name"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="slug">URL Slug</Label>
									<Input
										id="slug"
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
										placeholder="product-url-slug"
										required
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="shortDescription">Short Description</Label>
								<Input
									id="shortDescription"
									value={shortDescription}
									onChange={(e) => setShortDescription(e.target.value)}
									placeholder="Brief product summary"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Full Description</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Enter product description"
									rows={4}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Organization */}
					<Card>
						<CardHeader>
							<CardTitle>Organization</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label>Brand</Label>
									<Select
										value={brandId}
										onValueChange={(v) => setBrandId(v === "none" ? "" : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select brand" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No brand</SelectItem>
											{brands.map((b) => (
												<SelectItem key={b.id} value={b.id}>
													{b.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Category</Label>
									<Select
										value={categoryId}
										onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No category</SelectItem>
											{categoryTree.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{"— ".repeat(c.depth)}{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="isFeatured"
									checked={isFeatured}
									onCheckedChange={(checked) => setIsFeatured(Boolean(checked))}
								/>
								<Label htmlFor="isFeatured">Featured Product</Label>
							</div>

							{/* Tags */}
							<div className="space-y-2">
								<Label>Tags</Label>
								{tags.length > 0 && (
									<div className="flex flex-wrap gap-1.5">
										{tags.map((tag) => (
											<Badge
												key={tag}
												variant="secondary"
												className="gap-1 pr-1"
											>
												{tag}
												<button
													type="button"
													onClick={() => setTags(tags.filter((t) => t !== tag))}
													className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
												>
													<X className="h-3 w-3" />
												</button>
											</Badge>
										))}
									</div>
								)}
								<Input
									value={tagInput}
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addTag(tagInput);
											setTagInput("");
										}
									}}
									placeholder="Add tag and press Enter"
									className="max-w-xs"
								/>
								<div className="flex flex-wrap gap-1">
									{TAG_PRESETS.filter((p) => !tags.includes(p)).map((preset) => (
										<button
											key={preset}
											type="button"
											onClick={() => addTag(preset)}
											className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
										>
											+ {preset}
										</button>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Pricing */}
					<Card>
						<CardHeader>
							<CardTitle>Default Pricing</CardTitle>
							<p className="text-sm text-muted-foreground">
								Base price used when a variant has no price override
							</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="basePrice">Base Price</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
										<Input
											id="basePrice"
											type="number"
											step="0.01"
											min="0"
											value={basePrice}
											onChange={(e) => setBasePrice(e.target.value)}
											placeholder="0.00"
											className="pl-7"
											required
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="salePrice">Sale Price (optional)</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
										<Input
											id="salePrice"
											type="number"
											step="0.01"
											min="0"
											value={salePrice}
											onChange={(e) => setSalePrice(e.target.value)}
											placeholder="0.00"
											className="pl-7"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="costPrice">Cost Price (optional)</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
										<Input
											id="costPrice"
											type="number"
											step="0.01"
											min="0"
											value={costPrice}
											onChange={(e) => setCostPrice(e.target.value)}
											placeholder="0.00"
											className="pl-7"
										/>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Status & Inventory */}
					<Card>
						<CardHeader>
							<CardTitle>Status & Inventory</CardTitle>
							<p className="text-sm text-muted-foreground">
								Product status controls store visibility. Stock is managed per variant.
							</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="status">Product Status</Label>
									<Select
										value={status}
										onValueChange={(value) => setStatus(value as ProductStatus)}
									>
										<SelectTrigger id="status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PRODUCT_STATUSES.map((s) => (
												<SelectItem key={s} value={s}>
													{PRODUCT_STATUS_LABELS[s]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
									<Input
										id="lowStockThreshold"
										type="number"
										min="0"
										value={lowStockThreshold}
										onChange={(e) => setLowStockThreshold(e.target.value)}
									/>
								</div>
							</div>
							{!isNew && existingProduct && (
								<div className="flex items-center gap-4 text-sm text-muted-foreground">
									<span>Total Stock: <strong>{existingProduct.totalStock}</strong></span>
									{existingProduct.publishedAt && (
										<span>Published: {new Date(existingProduct.publishedAt).toLocaleDateString()}</span>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* SEO */}
					<Card>
						<CardHeader>
							<CardTitle>SEO</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="metaTitle">Meta Title</Label>
								<Input
									id="metaTitle"
									value={metaTitle}
									onChange={(e) => setMetaTitle(e.target.value)}
									placeholder="SEO title (defaults to product name)"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="metaDescription">Meta Description</Label>
								<Textarea
									id="metaDescription"
									value={metaDescription}
									onChange={(e) => setMetaDescription(e.target.value)}
									placeholder="SEO description"
									rows={2}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Product Images */}
					{!isNew && productId ? (
						<ProductImageManager
							productId={productId}
							images={images}
							onImagesChanged={() => refetch()}
						/>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<ImageIcon className="h-5 w-5" />
									Product Images
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground">
									<p className="text-sm">Save the product first to upload images</p>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Variants */}
					{!isNew && productId ? (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2">
										<Package className="h-5 w-5" />
										Variants ({variants.length})
									</CardTitle>
									{canWrite && (
										<div className="flex gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => open("generateVariants", { productId, slug })}
											>
												<Grid3X3 className="mr-1 h-4 w-4" />
												Generate
											</Button>
											<Button
												type="button"
												size="sm"
												onClick={() => open("createVariant", { productId })}
											>
												<Plus className="mr-1 h-4 w-4" />
												Add Single
											</Button>
										</div>
									)}
								</div>
							</CardHeader>
							<CardContent>
								{variants.length > 0 ? (
									<div className="rounded-md border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-12">Image</TableHead>
													<TableHead>SKU</TableHead>
													<TableHead>Color</TableHead>
													<TableHead>Size</TableHead>
													<TableHead>Price</TableHead>
													<TableHead>Stock</TableHead>
													<TableHead>Status</TableHead>
													{canWrite && <TableHead className="w-24">Actions</TableHead>}
												</TableRow>
											</TableHeader>
											<TableBody>
												{variants.map((v: any) => {
													const linkedImage = images.find((img: any) =>
														img.variantId === v.id ||
														(img.colorId && img.colorId === (v.colorId ?? v.color?.id))
													);
													return (
													<TableRow key={v.id}>
														<TableCell>
															{linkedImage ? (
																<img
																	src={linkedImage.url}
																	alt="Variant"
																	className="h-8 w-8 rounded object-cover border"
																/>
															) : (
																<div className="flex h-8 w-8 items-center justify-center rounded border border-dashed text-muted-foreground">
																	<ImageIcon className="h-3.5 w-3.5" />
																</div>
															)}
														</TableCell>
														<TableCell>
															<code className="rounded bg-muted px-2 py-1 font-mono text-sm">
																{v.sku}
															</code>
														</TableCell>
														<TableCell>
															{v.color ? (
																<div className="flex items-center gap-2">
																	<div
																		className="h-4 w-4 rounded-full border"
																		style={{ backgroundColor: v.color.hexCode }}
																	/>
																	{v.color.name}
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</TableCell>
														<TableCell>
															{v.size?.name ?? <span className="text-muted-foreground">—</span>}
														</TableCell>
														<TableCell>
															{v.price ? formatPrice(v.price) : <span className="text-muted-foreground">Base</span>}
														</TableCell>
														<TableCell>
															<InlineStockInput
																stock={v.stock}
																variantId={v.id}
																lowThreshold={existingProduct?.lowStockThreshold ?? 10}
																canWrite={canWrite}
																adjustStock={adjustStock}
																onSuccess={() => refetch()}
															/>
														</TableCell>
														<TableCell>
															<button
																type="button"
																disabled={!canWrite || toggleVariantStatus.isPending}
																onClick={() =>
																	toggleVariantStatus.mutate(
																		{ id: v.id, isActive: !v.isActive },
																		{ onSuccess: () => refetch() },
																	)
																}
																className="cursor-pointer disabled:cursor-not-allowed"
																title={canWrite ? `Click to ${v.isActive ? "deactivate" : "activate"}` : undefined}
															>
																{v.isActive ? (
																	<Badge variant="default">Active</Badge>
																) : (
																	<Badge variant="secondary">Inactive</Badge>
																)}
															</button>
														</TableCell>
														{canWrite && (
															<TableCell>
																<div className="flex items-center gap-1">
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="h-7 w-7 p-0"
																		onClick={() =>
																			open("editVariant", {
																				id: v.id,
																				productId,
																				sku: v.sku,
																				price: v.price,
																				colorId: v.colorId ?? v.color?.id,
																				sizeId: v.sizeId ?? v.size?.id,
																				stock: v.stock,
																				weight: v.weight,
																				barcode: v.barcode,
																				isActive: v.isActive,
																				images,
																			})
																		}
																		title="Edit"
																	>
																		<Pencil className="h-3.5 w-3.5" />
																	</Button>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="h-7 w-7 p-0"
																		onClick={() =>
																			open("createVariant", {
																				productId,
																				sku: v.sku + "-COPY",
																				price: v.price,
																				colorId: v.colorId ?? v.color?.id,
																				sizeId: v.sizeId ?? v.size?.id,
																				stock: v.stock,
																				weight: v.weight,
																				barcode: v.barcode,
																				isActive: v.isActive,
																			})
																		}
																		title="Duplicate"
																	>
																		<Copy className="h-3.5 w-3.5" />
																	</Button>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="h-7 w-7 p-0 text-destructive hover:text-destructive"
																		onClick={() => open("deleteVariant", { id: v.id, sku: v.sku })}
																		title="Delete"
																	>
																		<Trash2 className="h-3.5 w-3.5" />
																	</Button>
																</div>
															</TableCell>
														)}
													</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								) : (
									<div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground">
										<p className="text-sm">No variants created yet</p>
										{canWrite && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => open("createVariant", { productId })}
											>
												<Plus className="mr-1 h-4 w-4" />
												Create First Variant
											</Button>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Package className="h-5 w-5" />
									Variants
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground">
									<p className="text-sm">Save the product first to add variants (color, size, stock)</p>
								</div>
							</CardContent>
						</Card>
					)}
				</form>
				)}
			</LoadingSwap>

			<VariantFormDrawer />
			<GenerateVariantsDialog />
			<DeleteVariantDialog />
		</PageContainer>
	);
}

// =============================================================================
// Inline Stock Input
// =============================================================================

function InlineStockInput({
	stock,
	variantId,
	lowThreshold,
	canWrite,
	adjustStock,
	onSuccess,
}: {
	stock: number;
	variantId: string;
	lowThreshold: number;
	canWrite: boolean;
	adjustStock: ReturnType<typeof useAdjustStock>;
	onSuccess: () => void;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(String(stock));

	useEffect(() => {
		setValue(String(stock));
	}, [stock]);

	const commit = () => {
		const newStock = parseInt(value, 10);
		if (isNaN(newStock) || newStock < 0) {
			setValue(String(stock));
			setEditing(false);
			return;
		}
		if (newStock === stock) {
			setEditing(false);
			return;
		}
		const adjustment = newStock - stock;
		adjustStock.mutate(
			{
				variantId,
				adjustment,
				reason: "adjustment",
				notes: "Inline stock update from product page",
			},
			{
				onSuccess: () => {
					setEditing(false);
					onSuccess();
				},
				onError: () => {
					setValue(String(stock));
					setEditing(false);
				},
			},
		);
	};

	if (!canWrite) {
		return (
			<span className={stock <= 0 ? "text-destructive font-medium" : stock <= lowThreshold ? "text-yellow-600 font-medium" : ""}>
				{stock}
			</span>
		);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className={`rounded px-2 py-0.5 text-left font-medium tabular-nums hover:bg-muted transition-colors ${
					stock <= 0 ? "text-destructive" : stock <= lowThreshold ? "text-yellow-600" : ""
				}`}
				title="Click to edit stock"
			>
				{stock}
			</button>
		);
	}

	return (
		<Input
			type="number"
			min="0"
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					commit();
				}
				if (e.key === "Escape") {
					setValue(String(stock));
					setEditing(false);
				}
			}}
			disabled={adjustStock.isPending}
			autoFocus
			className="h-7 w-20 text-sm tabular-nums"
		/>
	);
}
