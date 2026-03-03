import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatPrice, QUERY_KEYS } from "@/constants";
import { useAddToCart } from "@/hooks/ecommerce-actions";
import { $toggleWishlist } from "@/lib/ecommerce/functions";

type BadgeType = "new" | "hot" | "sale";

interface ProductCardProps {
	name: string;
	slug: string;
	price: number;
	salePrice?: number | null;
	compareAtPrice?: number | null;
	imageUrl?: string | null;
	secondImageUrl?: string | null;
	badge?: BadgeType | null;
	tags?: string[];
	rating?: number;
	reviewCount?: number;
	productId?: string;
	isFavorited?: boolean;
	colorSwatches?: Array<{ id: string; name: string; hexCode: string }>;
	defaultVariantId?: string;
}

const badgeStyles: Record<BadgeType, string> = {
	new: "bg-[var(--sf-orange)] text-white",
	hot: "bg-[var(--sf-rose)] text-white",
	sale: "bg-emerald-500 text-white",
};

const KNOWN_BADGES: BadgeType[] = ["new", "hot", "sale"];

export function ProductCard({
	name,
	slug,
	price,
	salePrice,
	compareAtPrice,
	imageUrl,
	secondImageUrl,
	badge,
	tags,
	rating,
	reviewCount,
	productId,
	isFavorited = false,
	colorSwatches,
	defaultVariantId,
}: ProductCardProps) {
	const queryClient = useQueryClient();
	const addToCart = useAddToCart();
	const [favorited, setFavorited] = useState(isFavorited);
	const [togglingFav, setTogglingFav] = useState(false);

	const displayPrice = salePrice && salePrice < price ? salePrice : price;
	const originalPrice = salePrice && salePrice < price ? price : compareAtPrice;
	const hasDiscount = originalPrice && originalPrice > displayPrice;
	const discountPercent = hasDiscount
		? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
		: 0;

	// Badge priority: tags > explicit badge prop > auto-sale
	const tagBadge = tags?.find((t): t is BadgeType => KNOWN_BADGES.includes(t as BadgeType));
	const effectiveBadge = tagBadge ?? badge ?? (hasDiscount ? "sale" as const : null);

	const handleQuickAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!defaultVariantId || addToCart.isPending) return;
		addToCart.mutate({ variantId: defaultVariantId, quantity: 1 });
	};

	const handleToggleFavorite = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!productId || togglingFav) return;
		setTogglingFav(true);
		setFavorited(!favorited);
		try {
			await $toggleWishlist({ data: { productId } });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WISHLIST.ITEMS });
		} catch (err: any) {
			setFavorited(favorited);
			const msg = err?.message || err?.data?.message || "Sign in to save favorites";
			toast.error(msg);
		} finally {
			setTogglingFav(false);
		}
	};

	return (
		<Link to={`/store/products/${slug}` as string} className="group sf-card overflow-hidden block">
			{/* Image */}
			<div className="relative aspect-square overflow-hidden bg-[var(--sf-bg-warm)]">
				{imageUrl ? (
					<>
						<img
							src={imageUrl}
							alt={name}
							className={`h-full w-full object-cover transition-all duration-500 ${secondImageUrl ? "group-hover:opacity-0" : "group-hover:scale-110"}`}
						/>
						{secondImageUrl && (
							<img
								src={secondImageUrl}
								alt={`${name} alternate`}
								className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110"
							/>
						)}
					</>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<ShoppingBag className="h-12 w-12 text-[var(--sf-border)]" />
					</div>
				)}

				{/* Badge */}
				{effectiveBadge && (
					<span
						className={`sf-badge absolute left-3 top-3 ${badgeStyles[effectiveBadge]}`}
					>
						{effectiveBadge === "sale" && discountPercent > 0
							? `-${discountPercent}%`
							: effectiveBadge}
					</span>
				)}

				{/* Favorite button */}
				{productId && (
					<button
						onClick={handleToggleFavorite}
						className={`absolute right-3 top-3 z-10 rounded-full p-2 shadow-sm transition-all ${
							favorited
								? "bg-[var(--sf-rose)] text-white"
								: "bg-white/90 text-[var(--sf-text-muted)] opacity-0 hover:text-[var(--sf-rose)] group-hover:opacity-100"
						}`}
					>
						<Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
					</button>
				)}

				{/* Hover overlay */}
				{defaultVariantId && (
					<div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
						<button
							onClick={handleQuickAdd}
							disabled={addToCart.isPending}
							className="rounded-full bg-[var(--sf-rose)] px-5 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
						>
							<span className="flex items-center gap-1.5">
								{addToCart.isPending ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<ShoppingBag className="h-3.5 w-3.5" />
								)}
								Quick Add
							</span>
						</button>
					</div>
				)}
			</div>

			{/* Info */}
			<div className="p-4">
				{/* Color swatches */}
				{colorSwatches && colorSwatches.length > 0 && (
					<div className="mb-2 flex gap-1">
						{colorSwatches.slice(0, 5).map((c) => (
							<span
								key={c.id}
								title={c.name}
								className="h-3.5 w-3.5 rounded-full border border-[var(--sf-border-light)]"
								style={{ backgroundColor: c.hexCode }}
							/>
						))}
						{colorSwatches.length > 5 && (
							<span className="text-[10px] text-[var(--sf-text-light)]">
								+{colorSwatches.length - 5}
							</span>
						)}
					</div>
				)}

				<h3 className="line-clamp-2 text-sm font-semibold text-[var(--sf-text)] transition-colors group-hover:text-[var(--sf-rose)]">
					{name}
				</h3>

				{/* Rating */}
				{rating !== undefined && rating > 0 && (
					<div className="mt-1 flex items-center gap-1">
						<div className="flex">
							{Array.from({ length: 5 }).map((_, i) => (
								<svg
									key={i}
									className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "text-amber-400" : "text-[var(--sf-border)]"}`}
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							))}
						</div>
						{reviewCount !== undefined && (
							<span className="text-xs text-[var(--sf-text-light)]">
								({reviewCount})
							</span>
						)}
					</div>
				)}

				{/* Price */}
				<div className="mt-2 flex items-center gap-2">
					<span className="text-base font-bold text-[var(--sf-rose)]">
						{formatPrice(displayPrice)}
					</span>
					{hasDiscount && (
						<span className="text-sm text-[var(--sf-text-light)] line-through">
							{formatPrice(originalPrice)}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
