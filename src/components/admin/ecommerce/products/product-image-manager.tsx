import {
	ArrowDown,
	ArrowUp,
	Check,
	Globe,
	ImageIcon,
	Library,
	Loader2,
	Search,
	Star,
	Trash2,
	Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import {
	useAddProductImage,
	useDeleteProductImage,
	useSetPrimaryImage,
	useReorderProductImages,
} from "@/hooks/ecommerce-actions";
import { useMultipleFileUpload } from "@/hooks/use-file-upload";
import { useAdminFiles } from "@/lib/storage/queries";

interface ProductImage {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
	sortOrder: number;
}

interface ProductImageManagerProps {
	productId: string;
	images: ProductImage[];
	onImagesChanged?: () => void;
}

export function ProductImageManager({
	productId,
	images,
	onImagesChanged,
}: ProductImageManagerProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [urlDialogOpen, setUrlDialogOpen] = useState(false);
	const [imageUrl, setImageUrl] = useState("");
	const {
		upload: uploadFiles,
		isUploading,
		totalProgress,
	} = useMultipleFileUpload("media");

	const addImageMutation = useAddProductImage();
	const deleteImageMutation = useDeleteProductImage();
	const setPrimaryMutation = useSetPrimaryImage();
	const reorderMutation = useReorderProductImages();

	const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

	const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const fileArray = Array.from(files);

		uploadFiles(fileArray, {
			onSuccess: async (result) => {
				if (!result.ok) return;
				// Create product_image records for each uploaded file
				for (const uploaded of result.data) {
					await addImageMutation.mutateAsync({
						productId,
						url: uploaded.url,
						altText: undefined,
					});
				}
				onImagesChanged?.();
			},
		});

		e.target.value = "";
	};

	const handleAddFromUrl = () => {
		const url = imageUrl.trim();
		if (!url) return;
		addImageMutation.mutate(
			{ productId, url, altText: undefined },
			{
				onSuccess: () => {
					setImageUrl("");
					setUrlDialogOpen(false);
					onImagesChanged?.();
				},
			},
		);
	};

	const handleLibrarySelect = (url: string) => {
		addImageMutation.mutate(
			{ productId, url, altText: undefined },
			{
				onSuccess: () => {
					setLibraryOpen(false);
					onImagesChanged?.();
				},
			},
		);
	};

	const handleDelete = (imageId: string) => {
		deleteImageMutation.mutate(
			{ imageId },
			{ onSuccess: () => onImagesChanged?.() },
		);
	};

	const handleSetPrimary = (imageId: string) => {
		setPrimaryMutation.mutate(
			{ imageId, productId },
			{ onSuccess: () => onImagesChanged?.() },
		);
	};

	const handleMoveUp = (index: number) => {
		if (index <= 0) return;
		const newOrder = [...sortedImages];
		[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
		reorderMutation.mutate(
			{ productId, imageIds: newOrder.map((img) => img.id) },
			{ onSuccess: () => onImagesChanged?.() },
		);
	};

	const handleMoveDown = (index: number) => {
		if (index >= sortedImages.length - 1) return;
		const newOrder = [...sortedImages];
		[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
		reorderMutation.mutate(
			{ productId, imageIds: newOrder.map((img) => img.id) },
			{ onSuccess: () => onImagesChanged?.() },
		);
	};

	const isBusy =
		isUploading ||
		addImageMutation.isPending ||
		deleteImageMutation.isPending ||
		setPrimaryMutation.isPending ||
		reorderMutation.isPending;

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<ImageIcon className="h-5 w-5" />
							Images ({images.length})
						</CardTitle>
						<div className="flex gap-2">
							<input
								ref={inputRef}
								type="file"
								accept="image/*"
								multiple
								onChange={handleFilesSelected}
								className="hidden"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setUrlDialogOpen(true)}
								disabled={isBusy}
							>
								<Globe className="mr-2 h-4 w-4" />
								From URL
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setLibraryOpen(true)}
								disabled={isBusy}
							>
								<Library className="mr-2 h-4 w-4" />
								Library
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => inputRef.current?.click()}
								disabled={isBusy}
							>
								{isUploading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Uploading...
									</>
								) : (
									<>
										<Upload className="mr-2 h-4 w-4" />
										Upload
									</>
								)}
							</Button>
						</div>
					</div>
					{isUploading && (
						<div className="mt-2">
							<ProgressBar value={totalProgress} />
						</div>
					)}
				</CardHeader>
				<CardContent>
					{sortedImages.length > 0 ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
							{sortedImages.map((img, index) => (
								<div
									key={img.id}
									className="group relative overflow-hidden rounded-lg border bg-muted"
								>
									<div className="aspect-square">
										<img
											src={img.url}
											alt={img.altText ?? "Product image"}
											className="h-full w-full object-cover"
										/>
									</div>

									{/* Primary badge */}
									{img.isPrimary && (
										<Badge
											className="absolute left-2 top-2"
											variant="default"
										>
											Primary
										</Badge>
									)}

									{/* Sort order badge */}
									<Badge
										variant="secondary"
										className="absolute right-2 top-2 text-xs"
									>
										#{index + 1}
									</Badge>

									{/* Actions overlay */}
									<div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
										<div className="flex gap-1">
											{!img.isPrimary && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-white hover:bg-white/20"
													onClick={() => handleSetPrimary(img.id)}
													title="Set as primary"
												>
													<Star className="h-3.5 w-3.5" />
												</Button>
											)}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-white hover:bg-white/20"
												onClick={() => handleMoveUp(index)}
												disabled={index === 0}
												title="Move up"
											>
												<ArrowUp className="h-3.5 w-3.5" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-white hover:bg-white/20"
												onClick={() => handleMoveDown(index)}
												disabled={index === sortedImages.length - 1}
												title="Move down"
											>
												<ArrowDown className="h-3.5 w-3.5" />
											</Button>
										</div>

										<AlertDialog>
											<AlertDialogTrigger
												render={
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300"
														title="Delete"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												}
											/>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Delete Image</AlertDialogTitle>
													<AlertDialogDescription>
														Are you sure? This will permanently remove this image from the product.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => handleDelete(img.id)}
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
													>
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
							))}
						</div>
					) : (
						<div
							className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
							onClick={() => inputRef.current?.click()}
						>
							<div className="text-center">
								<Upload className="mx-auto h-8 w-8 mb-2" />
								<p className="text-sm">Click to upload product images</p>
								<p className="mt-1 text-xs text-muted-foreground">
									or use Library / URL buttons above
								</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* URL Dialog */}
			<Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Image from URL</DialogTitle>
						<DialogDescription>
							Paste an image URL to add it to this product.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Input
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder="https://example.com/image.jpg"
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAddFromUrl();
							}}
						/>
						{imageUrl.trim() && (
							<div className="overflow-hidden rounded-lg border bg-muted">
								<img
									src={imageUrl.trim()}
									alt="Preview"
									className="mx-auto max-h-48 object-contain"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							</div>
						)}
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setImageUrl("");
									setUrlDialogOpen(false);
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={handleAddFromUrl}
								disabled={!imageUrl.trim() || addImageMutation.isPending}
							>
								{addImageMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Adding...
									</>
								) : (
									"Add Image"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Media Library Dialog */}
			<Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Media Library</DialogTitle>
						<DialogDescription>
							Select an image from previously uploaded files.
						</DialogDescription>
					</DialogHeader>
					<MediaLibraryPicker
						onSelect={handleLibrarySelect}
						isAdding={addImageMutation.isPending}
						existingUrls={images.map((img) => img.url)}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}

// =============================================================================
// Media Library Picker (inline component for the dialog)
// =============================================================================

function MediaLibraryPicker({
	onSelect,
	isAdding,
	existingUrls,
}: {
	onSelect: (url: string) => void;
	isAdding: boolean;
	existingUrls: string[];
}) {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading } = useAdminFiles({
		page,
		limit: 20,
		category: "media",
		search: searchQuery || undefined,
	});

	const files = data?.ok ? (data.data as any)?.items ?? [] : [];
	const totalPages = data?.ok ? (data.data as any)?.totalPages ?? 1 : 1;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchQuery(search);
		setPage(1);
	};

	const isImage = (mimeType: string) =>
		mimeType?.startsWith("image/");

	const imageFiles = files.filter((f: any) => isImage(f.mimeType));

	return (
		<div className="space-y-4">
			{/* Search */}
			<form onSubmit={handleSearch} className="flex gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search files..."
						className="pl-9"
					/>
				</div>
				<Button type="submit" variant="secondary" size="sm">
					Search
				</Button>
			</form>

			{/* Grid */}
			{isLoading ? (
				<div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
					{Array.from({ length: 10 }).map((_, i) => (
						<div
							key={i}
							className="aspect-square animate-pulse rounded-lg bg-muted"
						/>
					))}
				</div>
			) : imageFiles.length === 0 ? (
				<div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
					<ImageIcon className="h-10 w-10" />
					<p className="text-sm">No images found</p>
				</div>
			) : (
				<div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
					{imageFiles.map((file: any) => {
						const isAlreadyUsed = existingUrls.includes(file.storageUrl);
						return (
							<button
								key={file.id}
								type="button"
								disabled={isAdding || isAlreadyUsed}
								onClick={() => onSelect(file.storageUrl)}
								className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
									isAlreadyUsed
										? "border-primary/50 opacity-60"
										: "border-transparent hover:border-primary hover:shadow-md"
								}`}
							>
								<img
									src={file.storageUrl}
									alt={file.originalName}
									className="h-full w-full object-cover"
								/>
								{isAlreadyUsed && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/40">
										<Check className="h-6 w-6 text-white" />
									</div>
								)}
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
									<p className="truncate text-[10px] text-white">
										{file.originalName}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
					>
						Previous
					</Button>
					<span className="text-xs text-muted-foreground">
						Page {page} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage(page + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
