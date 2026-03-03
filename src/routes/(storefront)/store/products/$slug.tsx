import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Check,
	Heart,
	Loader2,
	Minus,
	Package,
	Plus,
	Shield,
	ShoppingBag,
	Star,
	Truck,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/storefront/product-card";
import { $getProductBySlug, $getRelatedProducts, $submitReview, $toggleWishlist } from "@/lib/ecommerce/functions";
import { useProductReviews, useWishlist } from "@/lib/ecommerce/queries";
import { useAddToCart } from "@/hooks/ecommerce-actions";
import { useUser } from "@/hooks/auth-hooks";
import { formatPrice, QUERY_KEYS } from "@/constants";

export const Route = createFileRoute("/(storefront)/store/products/$slug")({
	component: ProductDetailPage,
});

function ProductDetailPage() {
	const { slug } = Route.useParams();
	const [selectedColor, setSelectedColor] = useState<string | null>(null);
	const [selectedSize, setSelectedSize] = useState<string | null>(null);
	const [quantity, setQuantity] = useState(1);
	const [mainImage, setMainImage] = useState(0);

	const { data: productData, isLoading } = useQuery({
		queryKey: ["storefront", "product", slug],
		queryFn: () => $getProductBySlug({ data: { slug } }),
		staleTime: 60_000,
	});

	const addToCart = useAddToCart();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const product = productData?.ok ? productData.data : null;
	const [buyingNow, setBuyingNow] = useState(false);

	// Wishlist state
	const { data: wishlistData } = useWishlist();
	const wishlistIds = wishlistData?.ok ? wishlistData.data?.productIds ?? [] : [];
	const [favorited, setFavorited] = useState<boolean | null>(null);
	const [togglingFav, setTogglingFav] = useState(false);
	const isFavorited = favorited ?? (product ? wishlistIds.includes(product.id) : false);

	const images = product?.images ?? [];

	// Derive available colors and sizes from variants
	const primaryImage = images.find((img: any) => img.isPrimary) ?? images[0];
	const primaryColorId = primaryImage?.colorId ?? null;
	const colorsUnsorted = product?.variants
		? [...new Map(product.variants.filter((v: any) => v.color).map((v: any) => [v.color.id, v.color])).values()]
		: [];
	// Put the primary image's color first
	const colors = primaryColorId
		? [...colorsUnsorted.filter((c: any) => c.id === primaryColorId), ...colorsUnsorted.filter((c: any) => c.id !== primaryColorId)]
		: colorsUnsorted;
	const sizes = product?.variants
		? [...new Map(product.variants.filter((v: any) => v.size).map((v: any) => [v.size.id, v.size])).values()]
		: [];

	// Auto-select the primary image's color on load
	useEffect(() => {
		if (product && primaryColorId && selectedColor === null) {
			setSelectedColor(primaryColorId);
		}
	}, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	// Find matching variant
	const matchingVariant = product?.variants?.find((v: any) => {
		if (selectedColor && v.color?.id !== selectedColor) return false;
		if (selectedSize && v.size?.id !== selectedSize) return false;
		return true;
	});

	const currentPrice = matchingVariant?.price ?? product?.basePrice ?? 0;
	const currentImage = images[mainImage]?.url;

	const canAddToCart = !!(matchingVariant?.id ?? product?.variants?.[0]?.id);

	const handleAddToCart = () => {
		if (!matchingVariant && product?.variants?.length) return;
		const variantId = matchingVariant?.id ?? product?.variants?.[0]?.id;
		if (!variantId) return;
		addToCart.mutate({ variantId, quantity });
	};

	const handleBuyNow = async () => {
		if (!matchingVariant && product?.variants?.length) return;
		const variantId = matchingVariant?.id ?? product?.variants?.[0]?.id;
		if (!variantId) return;
		setBuyingNow(true);
		try {
			const result = await addToCart.mutateAsync({ variantId, quantity });
			if (result.ok) {
				navigate({ to: "/store/checkout" as string });
			} else {
				setBuyingNow(false);
			}
		} catch {
			setBuyingNow(false);
		}
	};

	const handleToggleFavorite = async () => {
		if (!product?.id || togglingFav) return;
		setTogglingFav(true);
		setFavorited(!isFavorited);
		try {
			await $toggleWishlist({ data: { productId: product.id } });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WISHLIST.ITEMS });
		} catch (err: any) {
			setFavorited(isFavorited);
			const msg = err?.message || err?.data?.message || "Sign in to save favorites";
			toast.error(msg);
		} finally {
			setTogglingFav(false);
		}
	};

	if (isLoading) {
		return (
			<div className="sf-container py-10">
				<div className="grid gap-10 md:grid-cols-2">
					<div className="aspect-square animate-pulse rounded-[2.5rem] bg-[var(--sf-border-light)]" />
					<div className="space-y-4">
						<div className="h-8 w-3/4 animate-pulse rounded bg-[var(--sf-border-light)]" />
						<div className="h-6 w-1/4 animate-pulse rounded bg-[var(--sf-border-light)]" />
						<div className="h-24 animate-pulse rounded bg-[var(--sf-border-light)]" />
					</div>
				</div>
			</div>
		);
	}

	if (!product) {
		return (
			<div className="sf-container flex flex-col items-center py-20 text-center">
				<Package className="mb-4 h-16 w-16 text-[var(--sf-border)]" />
				<h2 className="text-2xl font-bold">Product Not Found</h2>
				<p className="mt-2 text-[var(--sf-text-muted)]">
					The product you're looking for doesn't exist.
				</p>
				<Link to={"/store/products" as string} className="sf-btn-primary mt-6 inline-flex items-center gap-2">
					<ArrowLeft className="h-4 w-4" />
					Back to Shop
				</Link>
			</div>
		);
	}

	return (
		<div className="sf-container py-8">
			{/* Breadcrumb */}
			<nav className="mb-6 flex items-center gap-2 text-sm text-[var(--sf-text-muted)]">
				<Link to="/store" className="hover:text-[var(--sf-rose)]">Home</Link>
				<span>/</span>
				<Link to={"/store/products" as string} className="hover:text-[var(--sf-rose)]">Shop</Link>
				<span>/</span>
				<span className="text-[var(--sf-text)]">{product.name}</span>
			</nav>

			<div className="grid gap-10 lg:grid-cols-2">
				{/* Image Gallery */}
				<div className="space-y-4">
					<div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--sf-bg-warm)]">
						{currentImage ? (
							<img
								src={currentImage}
								alt={product.name}
								className="aspect-square w-full object-cover"
							/>
						) : (
							<div className="flex aspect-square items-center justify-center">
								<ShoppingBag className="h-20 w-20 text-[var(--sf-border)]" />
							</div>
						)}
						<button
							onClick={handleToggleFavorite}
							disabled={togglingFav}
							className={`absolute right-4 top-4 rounded-full p-3 shadow-md transition-colors ${
								isFavorited
									? "bg-[var(--sf-rose)] text-white"
									: "bg-white hover:bg-[var(--sf-rose)] hover:text-white"
							}`}
						>
							<Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
						</button>
					</div>
					{images.length > 1 && (
						<div className="flex gap-3 overflow-x-auto">
							{images.map((img: any, i: number) => (
								<button
									key={img.id}
									onClick={() => setMainImage(i)}
									className={`shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${
										i === mainImage
											? "border-[var(--sf-rose)]"
											: "border-transparent hover:border-[var(--sf-border)]"
									}`}
								>
									<img
										src={img.url}
										alt={img.altText || product.name}
										className="h-20 w-20 object-cover"
									/>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Product Info */}
				<div className="space-y-6">
					<div className="flex items-center gap-3">
						{product.brand && (
							<span className="sf-badge bg-[var(--sf-bg-warm)] text-[var(--sf-text-muted)]">
								{product.brand.name}
							</span>
						)}
						{product.category && (
							<span className="sf-badge bg-[var(--sf-bg-warm)] text-[var(--sf-text-muted)]">
								{product.category.name}
							</span>
						)}
					</div>

					<h1
						className="text-3xl font-bold lg:text-4xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{product.name}
					</h1>

					{/* Rating summary - link to reviews */}
					{product.reviews && product.reviews.length > 0 && (
						<a href="#reviews" className="flex items-center gap-2 hover:opacity-80">
							<div className="flex">
								{Array.from({ length: 5 }).map((_, i) => (
									<Star
										key={i}
										className={`h-5 w-5 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-[var(--sf-border)]"}`}
									/>
								))}
							</div>
							<span className="text-sm text-[var(--sf-text-muted)]">
								({product.reviews.length} reviews)
							</span>
						</a>
					)}

					{/* Price */}
					<div className="flex items-center gap-3">
						<span className="text-3xl font-bold text-[var(--sf-rose)]">
							{formatPrice(currentPrice)}
						</span>
						{product.salePrice && product.salePrice < product.basePrice && (
							<span className="text-lg text-[var(--sf-text-light)] line-through">
								{formatPrice(product.basePrice)}
							</span>
						)}
					</div>

					{product.shortDescription && (
						<p className="text-[var(--sf-text-muted)] leading-relaxed">
							{product.shortDescription}
						</p>
					)}

					{/* Color selector */}
					{(colors as any[]).length > 0 && (
						<div>
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Color</h4>
							<div className="flex flex-wrap gap-3">
								{(colors as any[]).map((color: any) => (
									<button
										key={color.id}
										onClick={() => {
										const newColor = color.id === selectedColor ? null : color.id;
										setSelectedColor(newColor);
										if (newColor) {
											const idx = images.findIndex((img: any) =>
												img.colorId === newColor ||
												(img.variantId && product?.variants?.some((v: any) => v.id === img.variantId && v.color?.id === newColor))
											);
											if (idx >= 0) setMainImage(idx);
										} else {
											setMainImage(0);
										}
									}}
										title={color.name}
										className={`relative h-10 w-10 rounded-full border-2 transition-all ${
											selectedColor === color.id
												? "border-[var(--sf-rose)] ring-2 ring-[var(--sf-rose-light)]"
												: "border-[var(--sf-border)] hover:border-[var(--sf-text-light)]"
										}`}
										style={{ backgroundColor: color.hexCode }}
									>
										{selectedColor === color.id && (
											<Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
										)}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Size selector */}
					{(sizes as any[]).length > 0 && (
						<div>
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Size</h4>
							<div className="flex flex-wrap gap-2">
								{(sizes as any[]).map((size: any) => (
									<button
										key={size.id}
										onClick={() => setSelectedSize(size.id === selectedSize ? null : size.id)}
										className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
											selectedSize === size.id
												? "border-[var(--sf-rose)] bg-[var(--sf-rose)] text-white"
												: "border-[var(--sf-border)] hover:border-[var(--sf-rose)]"
										}`}
									>
										{size.name}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Quantity + Add to Cart + Buy Now */}
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="flex items-center rounded-full border border-[var(--sf-border)]">
								<button
									onClick={() => setQuantity(Math.max(1, quantity - 1))}
									className="px-4 py-2.5 text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)]"
								>
									<Minus className="h-4 w-4" />
								</button>
								<span className="w-10 text-center text-sm font-semibold">{quantity}</span>
								<button
									onClick={() => setQuantity(quantity + 1)}
									className="px-4 py-2.5 text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)]"
								>
									<Plus className="h-4 w-4" />
								</button>
							</div>
							<button
								onClick={handleAddToCart}
								disabled={addToCart.isPending || !canAddToCart || buyingNow}
								className="sf-btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
							>
								<ShoppingBag className="h-5 w-5" />
								{addToCart.isPending && !buyingNow ? "Adding..." : !canAddToCart ? "Unavailable" : "Add to Cart"}
							</button>
						</div>
						<button
							onClick={handleBuyNow}
							disabled={addToCart.isPending || !canAddToCart || buyingNow}
							className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--sf-rose)] bg-white px-6 py-3 text-sm font-bold text-[var(--sf-rose)] transition-colors hover:bg-[var(--sf-rose)] hover:text-white disabled:opacity-50"
						>
							{buyingNow ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Zap className="h-5 w-5" />
							)}
							{buyingNow ? "Redirecting..." : "Buy Now"}
						</button>
					</div>

					{/* Trust badges */}
					<div className="grid grid-cols-3 gap-4 rounded-2xl bg-[var(--sf-bg)] p-4">
						<div className="flex flex-col items-center gap-1 text-center">
							<Truck className="h-5 w-5 text-[var(--sf-rose)]" />
							<span className="text-xs font-medium">Free Shipping</span>
						</div>
						<div className="flex flex-col items-center gap-1 text-center">
							<Shield className="h-5 w-5 text-[var(--sf-rose)]" />
							<span className="text-xs font-medium">Secure Payment</span>
						</div>
						<div className="flex flex-col items-center gap-1 text-center">
							<Package className="h-5 w-5 text-[var(--sf-rose)]" />
							<span className="text-xs font-medium">Easy Returns</span>
						</div>
					</div>

					{product.description && (
						<div>
							<h4 className="mb-2 text-sm font-bold uppercase tracking-wider">Description</h4>
							<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
								{product.description}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Reviews Section */}
			<ReviewsSection productId={product.id} />

			{/* Related Products */}
			<RelatedProducts
				productId={product.id}
				categoryId={product.category?.id}
				brandId={product.brand?.id}
			/>
		</div>
	);
}

// =============================================================================
// Related Products Section
// =============================================================================

function RelatedProducts({
	productId,
	categoryId,
	brandId,
}: {
	productId: string;
	categoryId?: string;
	brandId?: string;
}) {
	const { data } = useQuery({
		queryKey: ["storefront", "related-products", productId],
		queryFn: () =>
			$getRelatedProducts({ data: { productId, categoryId, brandId, limit: 8 } }),
		staleTime: 5 * 60_000,
		enabled: !!(categoryId || brandId),
	});

	const products = data?.ok ? (data.data as any[]) : [];
	if (!products.length) return null;

	return (
		<section className="mt-16">
			<h2
				className="mb-8 text-2xl font-bold"
				style={{ fontFamily: "'Varela Round', sans-serif" }}
			>
				You May Also Like
			</h2>
			<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
				{products.map((p: any) => {
					const primaryImage = p.images?.find((img: any) => img.isPrimary) ?? p.images?.[0];
					const secondImage = p.images?.find(
						(img: any) => !img.isPrimary && img.url !== primaryImage?.url,
					);
					return (
						<ProductCard
							key={p.id}
							productId={p.id}
							name={p.name}
							slug={p.slug}
							price={p.basePrice}
							salePrice={p.salePrice}
							compareAtPrice={
								p.salePrice && p.salePrice < p.basePrice ? p.basePrice : null
							}
							imageUrl={primaryImage?.url}
							secondImageUrl={secondImage?.url}
							badge={p.isFeatured ? "hot" : null}
							tags={p.tags}
							defaultVariantId={p.variants?.[0]?.id}
						/>
					);
				})}
			</div>
		</section>
	);
}

// =============================================================================
// Reviews Section Component
// =============================================================================

function ReviewsSection({ productId }: { productId: string }) {
	const user = useUser();
	const queryClient = useQueryClient();
	const [reviewPage, setReviewPage] = useState(1);
	const [showForm, setShowForm] = useState(false);
	const [rating, setRating] = useState(0);
	const [hoverRating, setHoverRating] = useState(0);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState(false);

	const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(productId, reviewPage);
	const reviewsResult = reviewsData?.ok ? reviewsData.data : null;
	const reviews = reviewsResult?.items ?? [];
	const avgRating = reviewsResult?.avgRating ?? 0;
	const totalReviews = reviewsResult?.totalReviews ?? 0;
	const totalPages = reviewsResult?.totalPages ?? 1;

	const handleSubmitReview = async () => {
		if (submitting || rating === 0 || !title.trim() || content.trim().length < 10) return;
		setSubmitting(true);
		setSubmitError(null);

		try {
			const result = await $submitReview({
				data: { productId, rating, title: title.trim(), content: content.trim() },
			});
			if (result?.ok) {
				setSubmitSuccess(true);
				setShowForm(false);
				setRating(0);
				setTitle("");
				setContent("");
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.REVIEWS.BY_PRODUCT(productId),
				});
			} else {
				setSubmitError((result as any)?.error?.message || "Failed to submit review");
			}
		} catch (err: any) {
			setSubmitError(err?.message || "Something went wrong");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div id="reviews" className="mt-16 scroll-mt-24">
			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2
						className="text-2xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Customer Reviews
					</h2>
					{totalReviews > 0 && (
						<div className="mt-2 flex items-center gap-3">
							<div className="flex">
								{Array.from({ length: 5 }).map((_, i) => (
									<Star
										key={i}
										className={`h-5 w-5 ${
											i < Math.round(avgRating)
												? "fill-amber-400 text-amber-400"
												: "text-[var(--sf-border)]"
										}`}
									/>
								))}
							</div>
							<span className="text-sm font-medium text-[var(--sf-text)]">
								{avgRating.toFixed(1)}
							</span>
							<span className="text-sm text-[var(--sf-text-muted)]">
								({totalReviews} review{totalReviews !== 1 ? "s" : ""})
							</span>
						</div>
					)}
				</div>
				{user && !showForm && !submitSuccess && (
					<button
						onClick={() => setShowForm(true)}
						className="sf-btn-primary text-sm"
					>
						Write a Review
					</button>
				)}
			</div>

			{/* Success message */}
			{submitSuccess && (
				<div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
					Thank you! Your review has been submitted and is pending approval.
				</div>
			)}

			{/* Review Form */}
			{showForm && (
				<div className="mb-8 rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
					<h3
						className="mb-4 text-lg font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Write Your Review
					</h3>

					{/* Star rating */}
					<div className="mb-4">
						<label className="mb-2 block text-sm font-bold">Rating *</label>
						<div className="flex gap-1">
							{Array.from({ length: 5 }).map((_, i) => (
								<button
									key={i}
									onClick={() => setRating(i + 1)}
									onMouseEnter={() => setHoverRating(i + 1)}
									onMouseLeave={() => setHoverRating(0)}
									className="p-0.5"
								>
									<Star
										className={`h-7 w-7 transition-colors ${
											i < (hoverRating || rating)
												? "fill-amber-400 text-amber-400"
												: "text-[var(--sf-border)]"
										}`}
									/>
								</button>
							))}
						</div>
					</div>

					{/* Title */}
					<div className="mb-4">
						<label className="mb-1.5 block text-sm font-bold">Title *</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={200}
							placeholder="Summarize your experience"
							className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
						/>
					</div>

					{/* Content */}
					<div className="mb-4">
						<label className="mb-1.5 block text-sm font-bold">Review *</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							maxLength={2000}
							rows={4}
							placeholder="Share your thoughts (minimum 10 characters)"
							className="w-full resize-none rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
						/>
						<p className="mt-1 text-xs text-[var(--sf-text-muted)]">
							{content.length}/2000 characters
						</p>
					</div>

					{submitError && (
						<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
							{submitError}
						</div>
					)}

					<div className="flex gap-3">
						<button
							onClick={handleSubmitReview}
							disabled={submitting || rating === 0 || !title.trim() || content.trim().length < 10}
							className="sf-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
						>
							{submitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Submitting...
								</>
							) : (
								"Submit Review"
							)}
						</button>
						<button
							onClick={() => {
								setShowForm(false);
								setSubmitError(null);
							}}
							className="rounded-xl border border-[var(--sf-border)] px-4 py-2 text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Reviews List */}
			{reviewsLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
					))}
				</div>
			) : reviews.length === 0 ? (
				<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-12 text-center">
					<Star className="mx-auto h-12 w-12 text-[var(--sf-border)]" />
					<p className="mt-3 text-sm font-medium text-[var(--sf-text-muted)]">
						No reviews yet
					</p>
					<p className="mt-1 text-xs text-[var(--sf-text-light)]">
						Be the first to share your experience with this product.
					</p>
					{user && !showForm && (
						<button
							onClick={() => setShowForm(true)}
							className="sf-btn-primary mt-4 text-sm"
						>
							Write a Review
						</button>
					)}
					{!user && (
						<Link
							to="/login"
							className="sf-btn-primary mt-4 inline-block text-sm"
						>
							Sign in to Review
						</Link>
					)}
				</div>
			) : (
				<div className="space-y-4">
					{reviews.map((review: any) => (
						<div
							key={review.id}
							className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-5"
						>
							<div className="flex items-start justify-between">
								<div>
									<div className="flex gap-0.5">
										{Array.from({ length: 5 }).map((_, i) => (
											<Star
												key={i}
												className={`h-4 w-4 ${
													i < review.rating
														? "fill-amber-400 text-amber-400"
														: "text-[var(--sf-border)]"
												}`}
											/>
										))}
									</div>
									<h4 className="mt-2 font-semibold text-[var(--sf-text)]">
										{review.title}
									</h4>
								</div>
								{review.verifiedPurchase && (
									<span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
										<Check className="h-3 w-3" />
										Verified
									</span>
								)}
							</div>
							<p className="mt-2 text-sm leading-relaxed text-[var(--sf-text-muted)]">
								{review.content}
							</p>
							<p className="mt-3 text-xs text-[var(--sf-text-light)]">
								{review.userName || "Anonymous"} &middot;{" "}
								{new Date(review.createdAt).toLocaleDateString(undefined, {
									year: "numeric",
									month: "short",
									day: "numeric",
								})}
							</p>
						</div>
					))}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 pt-4">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
								<button
									key={p}
									onClick={() => setReviewPage(p)}
									className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
										p === reviewPage
											? "bg-[var(--sf-rose)] text-white"
											: "bg-[var(--sf-border-light)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]"
									}`}
								>
									{p}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
