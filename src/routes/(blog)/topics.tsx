import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
import { usePublicCategories, publicCategoriesQueryOptions } from "@/lib/blog/queries";

export const Route = createFileRoute("/(blog)/topics")({
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(publicCategoriesQueryOptions());
	},
	component: TopicsPage,
});

function TopicsPage() {
	const query = usePublicCategories();
	const categories = query.data?.data ?? [];

	// Mark first 3 as trending, rest go to "All Topics"
	const trending = categories.slice(0, 3);
	const all = categories.slice(3);

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

			{/* Trending */}
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

					{trending.length > 0 && (
						<>
							<div className="flex items-center gap-2 mb-8">
								<TrendingUp className="w-5 h-5 text-carolina-blue" />
								<h2 className="text-xl font-bold text-white">Trending Topics</h2>
							</div>

							<div className="grid sm:grid-cols-3 gap-5 mb-16">
								{trending.map((category) => (
									<Link
										key={category.id}
										to="/search"
										search={{ category: category.slug }}
										className="block relative group overflow-hidden rounded-2xl"
									>
										<figure
											className="aspect-[4/3] overflow-hidden rounded-2xl"
											style={{
												background: category.color
													? `linear-gradient(135deg, ${category.color}33, ${category.color}66)`
													: "linear-gradient(135deg, hsl(222,44%,13%), hsl(222,44%,20%))",
											}}
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-[#000d1a] via-[#000d1a]/50 to-transparent" />
										<div className="absolute bottom-0 left-0 right-0 p-5">
											<div
												className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
												style={{
													background: category.color
														? `linear-gradient(135deg, ${category.color}99, ${category.color})`
														: "linear-gradient(135deg, hsl(199,89%,49%), hsl(180,70%,45%))",
												}}
											>
												Trending
											</div>
											<h3 className="text-xl font-bold text-white mb-1 group-hover:text-carolina-blue transition-colors">
												{category.name}
											</h3>
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
							<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
								{all.map((category) => (
									<Link
										key={category.id}
										to="/search"
										search={{ category: category.slug }}
										className="navy-blue-blog-card p-5 rounded-2xl group hover:-translate-y-1 transition-transform block"
									>
										<figure
											className="aspect-video rounded-xl overflow-hidden mb-4"
											style={{
												background: category.color
													? `linear-gradient(135deg, ${category.color}33, ${category.color}66)`
													: "linear-gradient(135deg, hsl(222,44%,13%), hsl(222,44%,22%))",
											}}
										/>
										<h3 className="font-bold text-columbia-blue mb-1 group-hover:text-carolina-blue transition-colors">
											{category.name}
										</h3>
										<p className="text-xs text-wild-blue-yonder mb-3 line-clamp-2">
											{category.description}
										</p>
										<div className="flex items-center justify-end">
											<ArrowRight className="w-4 h-4 text-carolina-blue opacity-0 group-hover:opacity-100 transition-opacity" />
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
