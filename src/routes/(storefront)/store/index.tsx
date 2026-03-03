import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Gift,
	PartyPopper,
	Sparkles,
	Star,
	Truck,
} from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { useQuery } from "@tanstack/react-query";
import { $getProducts, $getStorefrontFacets } from "@/lib/ecommerce/functions";

export const Route = createFileRoute("/(storefront)/store/")({
	component: StoreLandingPage,
});

function StoreLandingPage() {
	const { data: productsData } = useQuery({
		queryKey: ["storefront", "featured-products"],
		queryFn: () =>
			$getProducts({
				data: { page: 1, limit: 8, status: ["active"], sortBy: "createdAt", sortOrder: "desc" },
			}),
		staleTime: 60_000,
	});

	const { data: facetsData } = useQuery({
		queryKey: ["storefront", "facets"],
		queryFn: () => $getStorefrontFacets(),
		staleTime: 300_000,
	});

	const products =
		productsData?.ok && productsData.data
			? productsData.data.items ?? []
			: [];

	const categories = facetsData?.ok ? facetsData.data?.categories ?? [] : [];

	return (
		<>
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[var(--sf-rose)] via-[#fb7185] to-[var(--sf-orange)]">
				{/* Decorative blobs */}
				<div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
				<div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

				<div className="sf-container relative z-10 py-14 md:py-20">
					<div className="grid items-center gap-10 md:grid-cols-2">
						<div className="space-y-6 text-white">
							<span className="sf-badge bg-white/20 text-white backdrop-blur-sm">
								<Sparkles className="mr-1.5 h-3.5 w-3.5" />
								New Collection
							</span>
							<h1
								className="text-4xl font-bold leading-tight md:text-6xl"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Make Every{" "}
								<span className="text-yellow-200">Celebration</span>{" "}
								Unforgettable
							</h1>
							<p className="max-w-lg text-lg text-white/80">
								Premium party supplies, decorations, and accessories to
								transform any occasion into a magical experience.
							</p>
							<div className="flex flex-wrap gap-4">
								<Link
									to={"/store/products" as string}
									className="sf-btn-primary inline-flex items-center gap-2 !bg-white !text-[var(--sf-rose)] hover:!bg-yellow-100"
								>
									Shop Now
									<ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									to="/store/about"
									className="sf-btn-outline inline-flex items-center gap-2 !border-white/50 !text-white hover:!bg-white/10"
								>
									Our Story
								</Link>
							</div>
						</div>

						{/* Hero image */}
						<div className="relative hidden md:block">
							<div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
								<img
									src="/template/products/1p.png"
									alt="Featured product"
									className="h-[28rem] w-full object-cover"
								/>
							</div>
							{/* Floating badge */}
							<div className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-xl">
								<div className="flex items-center gap-2">
									<div className="rounded-full bg-[var(--sf-rose)]/10 p-2">
										<Star className="h-5 w-5 text-[var(--sf-rose)]" />
									</div>
									<div>
										<div className="text-sm font-bold text-[var(--sf-text)]">4.9 Rating</div>
										<div className="text-xs text-[var(--sf-text-muted)]">2,000+ Reviews</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Trust Badges */}
			<section className="border-b border-[var(--sf-border-light)] bg-white py-4">
				<div className="sf-container">
					<div className="grid grid-cols-2 gap-6 md:grid-cols-4">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-[var(--sf-rose)]/10 p-2.5">
								<Truck className="h-5 w-5 text-[var(--sf-rose)]" />
							</div>
							<div>
								<div className="text-sm font-semibold">Free Shipping</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									Orders over $75
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-[var(--sf-orange)]/10 p-2.5">
								<Gift className="h-5 w-5 text-[var(--sf-orange)]" />
							</div>
							<div>
								<div className="text-sm font-semibold">Gift Wrapping</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									Available at checkout
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-emerald-500/10 p-2.5">
								<PartyPopper className="h-5 w-5 text-emerald-500" />
							</div>
							<div>
								<div className="text-sm font-semibold">500+ Themes</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									For any occasion
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-sky-500/10 p-2.5">
								<Sparkles className="h-5 w-5 text-sky-500" />
							</div>
							<div>
								<div className="text-sm font-semibold">Premium Quality</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									Satisfaction guaranteed
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Categories */}
			<section className="py-10">
				<div className="sf-container">
					<div className="mb-10 text-center">
						<h2
							className="text-3xl font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Shop by Category
						</h2>
						<p className="mt-2 text-[var(--sf-text-muted)]">
							Find everything you need for your perfect party
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{categories.slice(0, 4).map((cat: any, i: number) => {
							const gradients = [
								"from-rose-400 to-pink-500",
								"from-orange-400 to-amber-500",
								"from-emerald-400 to-teal-500",
								"from-sky-400 to-blue-500",
							];
							const emojis = ["👕", "📱", "👟", "💎"];
							return (
								<Link
									key={cat.id}
									to={"/store/products" as string}
									search={{ category: cat.id } as any}
									className="group relative overflow-hidden rounded-3xl p-8 text-center text-white transition-transform hover:scale-[1.02]"
								>
									<div
										className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]} opacity-90`}
									/>
									<div className="relative z-10">
										<div className="mb-3 text-4xl">{emojis[i % emojis.length]}</div>
										<h3 className="text-lg font-bold">{cat.name}</h3>
										<p className="mt-1 text-sm text-white/70">{cat.count} items</p>
									</div>
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			{/* Featured Products */}
			<section className="bg-white py-10">
				<div className="sf-container">
					<div className="mb-10 flex items-center justify-between">
						<div>
							<h2
								className="text-3xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Featured Products
							</h2>
							<p className="mt-2 text-[var(--sf-text-muted)]">
								Our most popular party essentials
							</p>
						</div>
						<Link
							to={"/store/products" as string}
							className="sf-btn-outline hidden items-center gap-2 text-sm md:inline-flex"
						>
							View All
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>

					<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
						{products.map((product: any) => {
							const colorSwatches = [
								...new Map(
									(product.variants ?? [])
										.filter((v: any) => v.color)
										.map((v: any) => [v.color.id, v.color])
								).values(),
							] as Array<{ id: string; name: string; hexCode: string }>;
							return (
								<ProductCard
									key={product.id}
									productId={product.id}
									name={product.name}
									slug={product.slug}
									price={product.basePrice}
									compareAtPrice={product.compareAtPrice}
									imageUrl={
										product.images?.[0]?.url || `/template/products/${product.slug}.png`
									}
									badge={product.isFeatured ? "hot" : null}
									tags={product.tags}
									rating={product.avgRating ? Number(product.avgRating) : undefined}
									reviewCount={product.reviewCount}
									colorSwatches={colorSwatches}
									defaultVariantId={product.variants?.[0]?.id}
								/>
							);
						})}
					</div>

					<div className="mt-8 text-center md:hidden">
						<Link
							to={"/store/products" as string}
							className="sf-btn-outline inline-flex items-center gap-2 text-sm"
						>
							View All Products
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</section>

			{/* Newsletter */}
			<section className="relative overflow-hidden bg-gradient-to-r from-[var(--sf-rose)] to-[var(--sf-orange)] py-16">
				<div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
				<div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

				<div className="sf-container relative z-10 text-center text-white">
					<h2
						className="text-3xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Stay in the Party Loop
					</h2>
					<p className="mx-auto mt-3 max-w-md text-white/80">
						Subscribe for exclusive deals, new arrivals, and party planning tips.
					</p>
					<form
						className="mx-auto mt-6 flex max-w-md gap-3"
						onSubmit={(e) => e.preventDefault()}
					>
						<input
							type="email"
							placeholder="your@email.com"
							className="flex-1 rounded-full border-2 border-white/30 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/60 backdrop-blur-sm focus:border-white focus:outline-none"
						/>
						<button
							type="submit"
							className="sf-btn-primary !bg-white !text-[var(--sf-rose)] hover:!bg-yellow-100"
						>
							Subscribe
						</button>
					</form>
				</div>
			</section>
		</>
	);
}
