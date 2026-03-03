import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	Minus,
	Plus,
	ShoppingBag,
	Tag,
	Trash2,
	Truck,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/product-card";
import { $getCartRecommendations } from "@/lib/ecommerce/functions";
import { useCart } from "@/lib/ecommerce/queries";
import {
	useUpdateCartItem,
	useRemoveFromCart,
	useApplyCoupon,
	useRemoveCoupon,
} from "@/hooks/ecommerce-actions";
import { formatPrice } from "@/constants";

export const Route = createFileRoute("/(storefront)/store/cart")({
	component: CartPage,
});

function getCartItemImage(item: any): string | null {
	// 1. Direct variant-linked image (set by cart formatting)
	if (item.variant?.image?.url) return item.variant.image.url;
	// 2. Product image matching variant's color
	const colorId = item.variant?.color?.id;
	const productImages = item.product?.images;
	if (colorId && productImages?.length) {
		const colorImg = productImages.find((img: any) => img.colorId === colorId);
		if (colorImg) return colorImg.url;
	}
	// 3. Product's primary or first image
	if (productImages?.length) {
		const primary = productImages.find((img: any) => img.isPrimary);
		return (primary ?? productImages[0]).url;
	}
	return null;
}

function CartPage() {
	const { data: cartData, isLoading } = useCart();
	const updateItem = useUpdateCartItem();
	const removeItem = useRemoveFromCart();
	const applyCoupon = useApplyCoupon();
	const removeCoupon = useRemoveCoupon();
	const [couponCode, setCouponCode] = useState("");

	const cart = cartData?.ok ? cartData.data : null;
	const items = cart?.items ?? [];
	const cartProductIds = useMemo(
		() => [...new Set(items.map((item: any) => item.variant?.product?.id).filter(Boolean))],
		[items],
	);

	const { data: recsData } = useQuery({
		queryKey: ["storefront", "cart-recommendations", cartProductIds],
		queryFn: () => $getCartRecommendations({ data: { productIds: cartProductIds, limit: 8 } }),
		staleTime: 5 * 60_000,
		enabled: cartProductIds.length > 0,
	});
	const recommendations = recsData?.ok ? (recsData.data as any[]) : [];
	const FREE_SHIPPING_THRESHOLD = 7500; // $75 in cents
	const shippingProgress = cart
		? Math.min(100, Math.round((cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100))
		: 0;
	const amountToFreeShipping = cart
		? Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal)
		: FREE_SHIPPING_THRESHOLD;

	const handleApplyCoupon = () => {
		if (couponCode.trim()) {
			applyCoupon.mutate({ code: couponCode.trim() });
			setCouponCode("");
		}
	};

	if (isLoading) {
		return (
			<div className="sf-container py-10">
				<div className="h-10 w-48 animate-pulse rounded bg-[var(--sf-border-light)]" />
				<div className="mt-8 grid gap-10 lg:grid-cols-12">
					<div className="space-y-4 lg:col-span-8">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
						))}
					</div>
					<div className="lg:col-span-4">
						<div className="h-64 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
					</div>
				</div>
			</div>
		);
	}

	if (!items.length) {
		return (
			<div className="sf-container flex flex-col items-center py-20 text-center">
				<div className="rounded-full bg-[var(--sf-bg-warm)] p-6">
					<ShoppingBag className="h-16 w-16 text-[var(--sf-border)]" />
				</div>
				<h2
					className="mt-6 text-2xl font-bold"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					Your Cart is Empty
				</h2>
				<p className="mt-2 text-[var(--sf-text-muted)]">
					Looks like you haven't added anything to your cart yet.
				</p>
				<Link
					to={"/store/products" as string}
					className="sf-btn-primary mt-6 inline-flex items-center gap-2"
				>
					Start Shopping
				</Link>
			</div>
		);
	}

	return (
		<div className="sf-container py-10">
			{/* Header */}
			<h1
				className="text-3xl font-bold md:text-4xl"
				style={{ fontFamily: "'Varela Round', sans-serif" }}
			>
				Shopping Cart{" "}
				<span className="ml-2 text-xl font-medium text-[var(--sf-text-light)]">
					({cart?.itemCount ?? 0} items)
				</span>
			</h1>

			{/* Free shipping progress */}
			{shippingProgress < 100 ? (
				<div className="mt-6 flex items-center gap-4 rounded-2xl border border-[var(--sf-border-light)] bg-white p-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
						<Truck className="h-5 w-5" />
					</div>
					<div className="flex-grow">
						<div className="mb-1.5 flex justify-between text-xs font-bold">
							<span>You're {formatPrice(amountToFreeShipping)} away from free shipping!</span>
							<span className="text-emerald-600">{shippingProgress}%</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sf-border-light)]">
							<div
								className="h-full rounded-full bg-emerald-400 transition-all"
								style={{ width: `${shippingProgress}%` }}
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
					<Truck className="h-5 w-5" />
					You've earned free shipping!
				</div>
			)}

			<div className="mt-8 grid items-start gap-10 lg:grid-cols-12">
				{/* Cart Items */}
				<section className="space-y-4 lg:col-span-8">
					{/* Desktop header */}
					<div className="hidden border-b border-[var(--sf-border)] pb-2 text-xs font-bold uppercase tracking-wide text-[var(--sf-text-light)] md:grid md:grid-cols-12 md:gap-4">
						<div className="col-span-6">Product</div>
						<div className="col-span-2 text-center">Quantity</div>
						<div className="col-span-2 text-right">Price</div>
						<div className="col-span-2 text-right">Total</div>
					</div>

					{items.map((item: any) => (
						<div
							key={item.id}
							className="group relative rounded-2xl border border-[var(--sf-border-light)] bg-white p-4 transition-shadow hover:shadow-md"
						>
							<button
								onClick={() => removeItem.mutate({ cartItemId: item.id })}
								className="absolute right-4 top-4 text-[var(--sf-border)] transition-colors hover:text-[var(--sf-rose)]"
							>
								<X className="h-4 w-4" />
							</button>

							<div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
								{/* Product info */}
								<div className="col-span-12 flex gap-4 md:col-span-6">
									<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--sf-border-light)] bg-[var(--sf-bg-warm)]">
										{getCartItemImage(item) ? (
											<img
												src={getCartItemImage(item)!}
												alt={item.product?.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<ShoppingBag className="h-8 w-8 text-[var(--sf-border)]" />
											</div>
										)}
									</div>
									<div>
										<Link
											to={`/store/products/${item.product?.slug}` as string}
											className="font-bold transition-colors hover:text-[var(--sf-rose)]"
										>
											{item.product?.name}
										</Link>
										{item.variant?.color && (
											<p className="mt-1 text-xs text-[var(--sf-text-muted)]">
												Color: {item.variant.color.name}
											</p>
										)}
										{item.variant?.size && (
											<p className="text-xs text-[var(--sf-text-light)]">
												Size: {item.variant.size.name}
											</p>
										)}
									</div>
								</div>

								{/* Quantity */}
								<div className="col-span-12 md:col-span-2">
									<div className="mx-auto flex w-max items-center rounded-lg border border-[var(--sf-border)]">
										<button
											onClick={() =>
												updateItem.mutate({
													cartItemId: item.id,
													quantity: Math.max(1, item.quantity - 1),
												})
											}
											className="flex h-8 w-8 items-center justify-center text-[var(--sf-text-light)] transition-colors hover:text-[var(--sf-rose)]"
										>
											<Minus className="h-3 w-3" />
										</button>
										<span className="w-8 text-center text-sm font-bold">
											{item.quantity}
										</span>
										<button
											onClick={() =>
												updateItem.mutate({
													cartItemId: item.id,
													quantity: item.quantity + 1,
												})
											}
											className="flex h-8 w-8 items-center justify-center text-[var(--sf-text-light)] transition-colors hover:text-[var(--sf-rose)]"
										>
											<Plus className="h-3 w-3" />
										</button>
									</div>
								</div>

								{/* Price */}
								<div className="col-span-6 text-left md:col-span-2 md:text-right">
									<span className="text-sm font-medium text-[var(--sf-text-muted)]">
										{formatPrice(item.price)}
									</span>
								</div>

								{/* Total */}
								<div className="col-span-6 text-right md:col-span-2">
									<span className="text-sm font-bold">
										{formatPrice(item.lineTotal)}
									</span>
								</div>
							</div>
						</div>
					))}

					<div className="pt-4">
						<Link
							to={"/store/products" as string}
							className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)]"
						>
							<ArrowLeft className="h-4 w-4" /> Continue Shopping
						</Link>
					</div>
				</section>

				{/* Order Summary */}
				<aside className="lg:col-span-4">
					<div className="sticky top-24 space-y-6 rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
						<h3
							className="text-lg font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Order Summary
						</h3>

						<div className="space-y-3">
							<div className="flex justify-between text-sm font-medium text-[var(--sf-text-muted)]">
								<span>Subtotal</span>
								<span className="text-[var(--sf-text)]">
									{formatPrice(cart?.subtotal ?? 0)}
								</span>
							</div>
							<div className="flex justify-between text-sm font-medium text-[var(--sf-text-muted)]">
								<span>Shipping</span>
								<span className="text-[var(--sf-text)]">
									{(cart?.subtotal ?? 0) >= FREE_SHIPPING_THRESHOLD
										? "Free"
										: "Calculated at checkout"}
								</span>
							</div>
							{(cart?.discount ?? 0) > 0 && (
								<div className="flex justify-between text-sm font-bold text-emerald-600">
									<span>Discount</span>
									<span>-{formatPrice(cart?.discount ?? 0)}</span>
								</div>
							)}
						</div>

						<div className="border-t border-[var(--sf-border-light)] pt-4">
							<div className="flex justify-between text-lg font-bold">
								<span>Total</span>
								<span className="text-[var(--sf-rose)]">
									{formatPrice(cart?.total ?? 0)}
								</span>
							</div>
						</div>

						{/* Coupon */}
						{cart?.coupon ? (
							<div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
								<div className="flex items-center gap-2">
									<Tag className="h-4 w-4 text-emerald-600" />
									<span className="text-sm font-bold text-emerald-700">
										{cart.coupon.code}
									</span>
								</div>
								<button
									onClick={() => removeCoupon.mutate()}
									className="text-[var(--sf-text-light)] transition-colors hover:text-[var(--sf-rose)]"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						) : (
							<div className="flex gap-2">
								<input
									type="text"
									value={couponCode}
									onChange={(e) => setCouponCode(e.target.value)}
									placeholder="Coupon code"
									className="flex-1 rounded-xl border border-[var(--sf-border)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
								/>
								<button
									onClick={handleApplyCoupon}
									disabled={!couponCode.trim() || applyCoupon.isPending}
									className="sf-btn-outline shrink-0 text-sm disabled:opacity-50"
								>
									Apply
								</button>
							</div>
						)}

						<Link
							to="/store/checkout"
							className="sf-btn-primary flex w-full items-center justify-center gap-2 text-center"
						>
							<ShoppingBag className="h-5 w-5" />
							Proceed to Checkout
						</Link>

						<div className="text-center text-xs text-[var(--sf-text-light)]">
							Secure checkout powered by Stripe
						</div>
					</div>
				</aside>
			</div>

			{/* You May Also Like */}
			{recommendations.length > 0 && (
				<section className="mt-16">
					<h2
						className="mb-8 text-2xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						You May Also Like
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
						{recommendations.map((p: any) => {
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
			)}
		</div>
	);
}
