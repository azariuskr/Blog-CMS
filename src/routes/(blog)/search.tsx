import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Clock, Eye, X } from "lucide-react";
import { z } from "zod";
import { usePublishedPosts, usePublicCategories } from "@/lib/blog/queries";

export const Route = createFileRoute("/(blog)/search")({
	validateSearch: z.object({
		q: z.string().optional(),
		tag: z.string().optional(),
		category: z.string().optional(),
	}),
	component: BlogSearchPage,
});

function BlogSearchPage() {
	const navigate = useNavigate();
	const { q, tag, category } = Route.useSearch() as any;
	const [inputValue, setInputValue] = useState(q ?? "");

	// Debounce URL update
	useEffect(() => {
		const id = setTimeout(() => {
			navigate({
				to: "/search" as string,
				search: { q: inputValue || undefined, tag, category } as any,
				replace: true,
			})
		}, 300);
		return () => clearTimeout(id);
	}, [inputValue]);

	const resultsQuery = usePublishedPosts({
		search: q || undefined,
		categorySlug: category || undefined,
		tagSlug: tag || undefined,
		limit: 20,
	});
	const results = (resultsQuery.data as any)?.data?.items ?? [];

	const topicsQuery = usePublicCategories();
	const topics = (topicsQuery.data as any)?.data ?? [];

	const hasFilters = !!q || !!tag || !!category;

	return (
		<div>
			{/* Search hero */}
			<section className="pt-[140px] pb-10 relative">
				<div className="container mx-auto px-4 max-w-[760px]">
					<h1 className="headline headline-1 text-center mb-8">
						Search <span className="navy-blue-blog-gradient-text">Articles</span>
					</h1>
					<div className="relative">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wild-blue-yonder" />
						<input
							type="search"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							placeholder="Search articles, topics, authors…"
							autoFocus
							className="w-full h-14 pl-12 pr-4 rounded-2xl bg-oxford-blue border border-prussian-blue text-white placeholder:text-yonder-dim focus:outline-none focus:border-carolina-blue text-base transition-colors"
						/>
						{inputValue && (
							<button
								onClick={() => setInputValue("")}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-wild-blue-yonder hover:text-white transition-colors"
								aria-label="Clear search"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>

					{/* Browse Topics */}
					{!hasFilters && (
						<div className="mt-6">
							<p className="text-sm text-wild-blue-yonder mb-3">Browse Topics</p>
							<div className="flex flex-wrap gap-2">
								{topics.map((t: any) => (
									<Link
										key={t.id}
										to={"/search" as string}
										search={{ category: t.slug } as any}
										className="navy-blue-blog-badge hover:bg-carolina-blue transition-colors"
									>
										{t.name}
									</Link>
								))}
							</div>
						</div>
					)}
				</div>
				<div className="hidden sm:block absolute top-16 right-0 w-[400px] h-[400px] bg-gradient-to-l from-[#0ea5ea10] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Results */}
			<section className="navy-blue-blog-section pt-0">
				<div className="container mx-auto px-4 max-w-[1140px]">
					{/* Active filters */}
					{hasFilters && (
						<div className="flex flex-wrap items-center gap-2 mb-6">
							<span className="text-sm text-wild-blue-yonder">Filtering by:</span>
							{q && (
								<Link
									to={"/search" as string}
									search={{ q: undefined, tag, category } as any}
									className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carolina-blue/20 text-carolina-blue text-sm border border-carolina-blue/40 hover:bg-carolina-blue/30 transition-colors"
								>
									"{q}" <X className="w-3 h-3" />
								</Link>
							)}
							{tag && (
								<Link
									to={"/search" as string}
									search={{ q, tag: undefined, category } as any}
									className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carolina-blue/20 text-carolina-blue text-sm border border-carolina-blue/40 hover:bg-carolina-blue/30 transition-colors"
								>
									#{tag} <X className="w-3 h-3" />
								</Link>
							)}
							{category && (
								<Link
									to={"/search" as string}
									search={{ q, tag, category: undefined } as any}
									className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carolina-blue/20 text-carolina-blue text-sm border border-carolina-blue/40 hover:bg-carolina-blue/30 transition-colors"
								>
									{category} <X className="w-3 h-3" />
								</Link>
							)}
							<span className="text-sm text-wild-blue-yonder ml-2">
								{results.length} result{results.length !== 1 ? "s" : ""}
							</span>
						</div>
					)}

					{/* Loading skeleton */}
					{resultsQuery.isLoading && (
						<div className="space-y-5">
							{[1, 2, 3].map((n) => (
								<div
									key={n}
									className="navy-blue-blog-card rounded-2xl overflow-hidden sm:flex gap-0 animate-pulse"
								>
									<div className="sm:w-56 shrink-0 aspect-video sm:aspect-auto bg-prussian-blue" />
									<div className="p-5 flex-1 space-y-3">
										<div className="h-4 bg-prussian-blue rounded w-1/4" />
										<div className="h-5 bg-prussian-blue rounded w-3/4" />
										<div className="h-4 bg-prussian-blue rounded w-full" />
										<div className="h-4 bg-prussian-blue rounded w-2/3" />
									</div>
								</div>
							))}
						</div>
					)}

					{/* Empty state */}
					{results.length === 0 && !resultsQuery.isLoading && (
						<div className="flex flex-col items-center justify-center py-24 text-center">
							<Search className="w-14 h-14 text-yonder-dim mb-4" />
							<h2 className="text-xl font-bold text-white mb-2">No results found</h2>
							<p className="text-wild-blue-yonder max-w-sm">
								{q ? `We couldn't find anything for "${q}".` : "Try searching for a topic, tag, or author."}
							</p>
							{hasFilters && (
								<Link
									to={"/search" as string}
									className="mt-6 navy-blue-blog-btn px-6 py-2 rounded-full inline-flex items-center gap-2 text-sm"
								>
									Clear all filters
								</Link>
							)}
						</div>
					)}

					{/* Results list */}
					{results.length > 0 && (
						<div className="space-y-5">
							{results.map((post: any) => (
								<article
									key={post.id}
									className="navy-blue-blog-card rounded-2xl overflow-hidden sm:flex gap-0 hover:-translate-y-0.5 transition-transform"
								>
									<figure className="sm:w-56 shrink-0 aspect-video sm:aspect-auto overflow-hidden">
										{post.featuredImageUrl ? (
											<img
												src={post.featuredImageUrl}
												alt={post.title}
												className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
												loading="lazy"
											/>
										) : (
											<div className="w-full h-full bg-muted" />
										)}
									</figure>
									<div className="p-5 flex-1">
										<div className="flex flex-wrap items-center gap-2 mb-2">
											{post.category?.name && (
												<span className="navy-blue-blog-badge text-xs">{post.category.name}</span>
											)}
										</div>
										<h2 className="text-columbia-blue font-bold text-lg mb-2 hover:text-carolina-blue transition-colors line-clamp-2">
											<Link to={"/$slug" as string} params={{ slug: post.slug } as any}>
												{post.title}
											</Link>
										</h2>
										<p className="text-sm text-wild-blue-yonder mb-4 line-clamp-2">
											{post.excerpt}
										</p>
										<div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-gray">
											<Link
												to={`/@${post.author?.username}` as string}
												className="flex items-center gap-2 hover:text-carolina-blue transition-colors"
											>
												{((post as any).authorProfile?.avatarUrl ?? post.author?.image) ? (
													<img
														src={(post as any).authorProfile?.avatarUrl ?? post.author?.image}
														alt={(post as any).authorProfile?.displayName ?? post.author?.name ?? "Anonymous"}
														className="w-5 h-5 rounded-full"
													/>
												) : (
													<div className="w-5 h-5 rounded-full bg-prussian-blue flex items-center justify-center text-[8px] text-white font-bold">
														{((post as any).authorProfile?.displayName ?? post.author?.name ?? "A").charAt(0).toUpperCase()}
													</div>
												)}
												{(post as any).authorProfile?.displayName ?? post.author?.name ?? "Anonymous"}
											</Link>
											<div className="flex items-center gap-3">
												<span>{new Date(post.publishedAt).toLocaleDateString()}</span>
												<span className="flex items-center gap-1">
													<Clock className="w-3 h-3" />
													{Math.max(1, Math.round((post.excerpt?.split(" ").length ?? 200) / 200))} min read
												</span>
												<span className="flex items-center gap-1">
													<Eye className="w-3 h-3" />
													{(post.viewCount ?? 0).toLocaleString()}
												</span>
											</div>
										</div>
									</div>
								</article>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}
