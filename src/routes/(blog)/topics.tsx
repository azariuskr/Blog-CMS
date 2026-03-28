import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
import { usePublicCategories, publicCategoriesQueryOptions } from "@/lib/blog/queries";

export const Route = createFileRoute("/(blog)/topics")({
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(publicCategoriesQueryOptions());
	},
	component: TopicsPage,
});

// Curated fallback images per slug — used when a category has no iconUrl
const CATEGORY_IMAGES: Record<string, string> = {
	technology:  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format",
	development: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop&auto=format",
	design:      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop&auto=format",
	career:      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&auto=format",
	tools:       "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&h=600&fit=crop&auto=format",
	"open-source": "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop&auto=format",
	science:     "https://images.unsplash.com/photo-1532094349884-543559debfee?w=800&h=600&fit=crop&auto=format",
	business:    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&auto=format",
	startup:     "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop&auto=format",
	ai:          "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&h=600&fit=crop&auto=format",
	security:    "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=600&fit=crop&auto=format",
	devops:      "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=600&fit=crop&auto=format",
	cloud:       "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=600&fit=crop&auto=format",
	mobile:      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop&auto=format",
	writing:     "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=600&fit=crop&auto=format",
	tutorial:    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop&auto=format",
};

// Generic fallbacks cycling through nice tech imagery
const GENERIC_IMAGES = [
	"https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format",
	"https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop&auto=format",
	"https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop&auto=format",
	"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&auto=format",
	"https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&h=600&fit=crop&auto=format",
	"https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop&auto=format",
];

function getCategoryImage(category: { slug: string; iconUrl?: string | null }, index = 0) {
	if (category.iconUrl) return category.iconUrl;
	return CATEGORY_IMAGES[category.slug] ?? GENERIC_IMAGES[index % GENERIC_IMAGES.length];
}

function TopicsPage() {
	const query = usePublicCategories();
	const categories = (query.data as any)?.data ?? [];

	// Server already orders by postCount DESC — top 3 with at least 1 post are trending
	const trending = categories.filter((c: any) => c.postCount > 0).slice(0, 3);
	// All Topics = every category
	const all = categories;

	return (
		<div>
			{/* Hero */}
			<section className="pt-[180px] pb-[60px] relative">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<p className="text-sm font-bold text-wild-blue-yonder mb-4">Explore</p>
					<h1 className="headline headline-1 mb-4">
						Browse <span className="navy-blue-blog-gradient-text">Topics</span>
					</h1>
					<p className="text-lg text-wild-blue-yonder max-w-xl">
						Find articles organized by topic. From tech and design to travel and lifestyle — there's something for everyone.
					</p>
				</div>
				<div className="hidden sm:block absolute top-20 right-0 w-[400px] h-[500px] bg-gradient-to-l from-[#0ea5ea10] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Content */}
			<section className="navy-blue-blog-section pt-0">
				<div className="container mx-auto px-4 max-w-[1140px]">
					{query.isLoading && (
						<div className="animate-pulse opacity-50 py-20 text-center text-wild-blue-yonder">
							Loading topics…
						</div>
					)}

					{query.isError && (
						<p className="text-red-500 py-10 text-center">Failed to load topics.</p>
					)}

					{!query.isLoading && !query.isError && categories.length === 0 && (
						<div className="py-20 text-center text-wild-blue-yonder">
							No topics found.
						</div>
					)}

					{/* Trending Topics — only if any category has published posts */}
					{trending.length > 0 && (
						<>
							<div className="flex items-center gap-2 mb-8">
								<TrendingUp className="w-5 h-5 text-carolina-blue" />
								<h2 className="text-xl font-bold text-white">Trending Topics</h2>
							</div>

							<div className="grid sm:grid-cols-3 gap-5 mb-16">
								{trending.map((category: any, i: number) => (
									<Link
										key={category.id}
										to={"/search" as string}
										search={{ category: category.slug } as any}
										className="block relative group overflow-hidden rounded-2xl"
									>
										<figure className="aspect-[4/3] overflow-hidden rounded-2xl m-0">
											<img
												src={getCategoryImage(category, i)}
												alt={category.name}
												className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
											/>
										</figure>
										<div className="absolute inset-0 bg-gradient-to-t from-[#000d1a] via-[#000d1a]/50 to-transparent rounded-2xl" />
										<div className="absolute bottom-0 left-0 right-0 p-5">
											<div
												className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
												style={{
													background: category.color
														? `linear-gradient(135deg, ${category.color}99, ${category.color})`
														: "linear-gradient(135deg, hsl(199,89%,49%), hsl(180,70%,45%))",
												}}
											>
												{category.postCount} post{category.postCount !== 1 ? "s" : ""}
											</div>
											<h3 className="text-xl font-bold text-white mb-1 group-hover:text-carolina-blue transition-colors">
												{category.name}
											</h3>
											{category.description && (
												<p className="text-sm text-white/70 line-clamp-2">{category.description}</p>
											)}
										</div>
									</Link>
								))}
							</div>
						</>
					)}

					{/* All Topics */}
					{all.length > 0 && (
						<>
							<h2 className="text-xl font-bold text-white mb-8">All Topics</h2>
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{all.map((category: any, i: number) => (
									<Link
										key={category.id}
										to={"/search" as string}
										search={{ category: category.slug } as any}
										className="navy-blue-blog-card rounded-2xl group hover:-translate-y-1 transition-transform block overflow-hidden"
									>
										<figure className="aspect-video overflow-hidden m-0">
											<img
												src={getCategoryImage(category, i)}
												alt={category.name}
												className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
											/>
										</figure>
										<div className="p-5">
											<div className="flex items-start justify-between gap-2 mb-1">
												<h3 className="font-bold text-columbia-blue group-hover:text-carolina-blue transition-colors">
													{category.name}
												</h3>
												{category.postCount > 0 && (
													<span className="shrink-0 text-xs text-wild-blue-yonder mt-0.5">
														{category.postCount} post{category.postCount !== 1 ? "s" : ""}
													</span>
												)}
											</div>
											<p className="text-xs text-wild-blue-yonder mb-3 line-clamp-2">
												{category.description}
											</p>
											<div className="flex items-center justify-end">
												<ArrowRight className="w-4 h-4 text-carolina-blue opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
										</div>
									</Link>
								))}
							</div>
						</>
					)}
				</div>
			</section>
		</div>
	)
}
