import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, X } from "lucide-react";
import { useState } from "react";
import { ProductCard } from "@/components/storefront/product-card";
import { $getProducts } from "@/lib/ecommerce/functions";

export const Route = createFileRoute("/(storefront)/store/search")({
	component: SearchPage,
	validateSearch: (search: Record<string, unknown>) => ({
		q: (search.q as string) || "",
	}),
});

function SearchPage() {
	const { q } = Route.useSearch();
	const [query, setQuery] = useState(q);
	const [searchTerm, setSearchTerm] = useState(q);

	const { data: productsData, isLoading } = useQuery({
		queryKey: ["storefront", "search", searchTerm],
		queryFn: () =>
			$getProducts({
				data: {
					page: 1,
					limit: 20,
					search: searchTerm || undefined,
					status: ["active"],
				},
			}),
		enabled: !!searchTerm,
		staleTime: 30_000,
	});

	const products = productsData?.ok ? productsData.data?.items ?? [] : [];
	const total = productsData?.ok ? productsData.data?.total ?? 0 : 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchTerm(query.trim());
	};

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

			{/* Search Form */}
			<form onSubmit={handleSearch} className="mb-8">
				<div className="relative">
					<Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--sf-text-light)]" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search for products..."
						autoFocus
						className="w-full rounded-2xl border border-[var(--sf-border)] bg-white py-4 pl-14 pr-12 text-lg outline-none transition-colors focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setSearchTerm("");
							}}
							className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--sf-text-light)] hover:text-[var(--sf-text)]"
						>
							<X className="h-5 w-5" />
						</button>
					)}
				</div>
			</form>

			{/* Results */}
			{searchTerm ? (
				<>
					<h2
						className="mb-6 text-2xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{isLoading
							? "Searching..."
							: `${total} result${total !== 1 ? "s" : ""} for "${searchTerm}"`}
					</h2>

					{isLoading ? (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="animate-pulse">
									<div className="aspect-square rounded-2xl bg-[var(--sf-border-light)]" />
									<div className="mt-3 h-4 w-3/4 rounded bg-[var(--sf-border-light)]" />
									<div className="mt-2 h-4 w-1/3 rounded bg-[var(--sf-border-light)]" />
								</div>
							))}
						</div>
					) : products.length === 0 ? (
						<div className="flex flex-col items-center py-20 text-center">
							<Search className="mb-4 h-16 w-16 text-[var(--sf-border)]" />
							<h3 className="text-lg font-bold">No products found</h3>
							<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
								Try different keywords or browse our catalog.
							</p>
							<Link
								to={"/store/products" as string}
								className="sf-btn-primary mt-6 inline-flex items-center gap-2"
							>
								Browse All Products
							</Link>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
							{products.map((product: any) => (
								<ProductCard
									key={product.id}
									name={product.name}
									slug={product.slug}
									price={product.basePrice}
									compareAtPrice={
										product.salePrice && product.salePrice < product.basePrice
											? product.basePrice
											: null
									}
									imageUrl={product.images?.[0]?.url}
									badge={product.isFeatured ? "hot" : null}
									tags={product.tags}
								/>
							))}
						</div>
					)}
				</>
			) : (
				<div className="flex flex-col items-center py-20 text-center">
					<Search className="mb-4 h-16 w-16 text-[var(--sf-border)]" />
					<h3
						className="text-xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						What are you looking for?
					</h3>
					<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
						Type a product name, category, or theme to get started.
					</p>
				</div>
			)}
		</div>
	);
}
