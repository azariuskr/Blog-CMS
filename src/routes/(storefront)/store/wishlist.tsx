import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { useWishlist } from "@/lib/ecommerce/queries";

export const Route = createFileRoute("/(storefront)/store/wishlist")({
	component: WishlistPage,
});

function WishlistPage() {
	const { data: wishlistData, isLoading } = useWishlist();

	const items = wishlistData?.ok ? wishlistData.data?.items ?? [] : [];
	const productIds = wishlistData?.ok ? wishlistData.data?.productIds ?? [] : [];

	return (
		<div className="sf-container py-10">
			{/* Back link */}
			<Link
				to="/store"
				className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Store
			</Link>

			<h1
				className="mb-2 text-3xl font-bold"
				style={{ fontFamily: "'Varela Round', sans-serif" }}
			>
				My Wishlist
			</h1>
			<p className="mb-8 text-sm text-[var(--sf-text-muted)]">
				{items.length} saved item{items.length !== 1 ? "s" : ""}
			</p>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="animate-pulse">
							<div className="aspect-square rounded-2xl bg-[var(--sf-border-light)]" />
							<div className="mt-3 h-4 w-3/4 rounded bg-[var(--sf-border-light)]" />
							<div className="mt-2 h-4 w-1/3 rounded bg-[var(--sf-border-light)]" />
						</div>
					))}
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center py-20 text-center">
					<Heart className="mb-4 h-16 w-16 text-[var(--sf-border)]" />
					<h3
						className="text-xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Your wishlist is empty
					</h3>
					<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
						Save your favorite items by tapping the heart icon on any product.
					</p>
					<Link
						to={"/store/products" as string}
						className="sf-btn-primary mt-6 inline-flex items-center gap-2"
					>
						<ShoppingBag className="h-4 w-4" />
						Browse Products
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
					{items.map((item: any) => {
						const product = item.product;
						if (!product) return null;
						return (
							<ProductCard
								key={item.id}
								productId={item.productId}
								name={product.name}
								slug={product.slug}
								price={product.basePrice}
								salePrice={product.salePrice}
								compareAtPrice={
									product.salePrice && product.salePrice < product.basePrice
										? product.basePrice
										: null
								}
								imageUrl={product.images?.[0]?.url}
								badge={product.isFeatured ? "hot" : null}
								tags={product.tags}
								isFavorited={productIds.includes(item.productId)}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
