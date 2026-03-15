import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Clock, Eye, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePublishedPosts, useInfinitePublishedPosts, usePublicCategories, useSubscribeNewsletter } from "@/lib/blog/queries";
import { publishedPostsQueryOptions, publicCategoriesQueryOptions } from "@/lib/blog/queries";
import { toast } from "sonner";
import { ThrottledImage } from "@/components/shared/ThrottledImage";

export const Route = createFileRoute("/(blog)/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.prefetchQuery(publishedPostsQueryOptions({ limit: 6 })),
			context.queryClient.prefetchQuery(publicCategoriesQueryOptions()),
		]);
	},
	component: BlogHomePage,
});

const TOPIC_IMAGES = [
	"https://images.unsplash.com/photo-1518770660439-4636190af475?w=507&h=618&fit=crop",
	"https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=507&h=618&fit=crop",
	"https://images.unsplash.com/photo-1561070791-2526d30994b5?w=507&h=618&fit=crop",
	"https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=507&h=618&fit=crop",
	"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=507&h=618&fit=crop",
];

function BlogHomePage() {
	const [currentSlide, setCurrentSlide] = useState(0);
	const sliderRef = useRef<HTMLUListElement>(null);
	const [sliderItems, setSliderItems] = useState(1);

	useEffect(() => {
		const update = () => setSliderItems(window.innerWidth >= 575 ? 3 : 1);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	// Featured posts (shown in hero/featured section)
	const featuredQuery = usePublishedPosts({ isFeatured: true, limit: 3 });
	const featuredPosts = featuredQuery.data?.data?.items ?? [];

	// Recent posts (infinite / load-more)
	const recentQuery = useInfinitePublishedPosts({ limit: 6 });
	const recentPosts = recentQuery.data?.pages.flatMap((p) => (p?.ok ? (p.data as any).items : [])) ?? [];

	// Popular posts (by view count)
	const popularQuery = usePublishedPosts({ sortBy: "viewCount", limit: 5 });
	const popularPosts = popularQuery.data?.data?.items ?? [];

	// Hot topics (categories)
	const topicsQuery = usePublicCategories();
	const topics = topicsQuery.data?.data ?? [];

	const subscribeNewsletter = useSubscribeNewsletter();
	const [newsletterEmail, setNewsletterEmail] = useState("");

	const handleNewsletterSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newsletterEmail.trim()) return;
		const result = await subscribeNewsletter.mutateAsync({ email: newsletterEmail.trim() });
		if (result?.ok) {
			const d = result.data as any;
			toast.success(d?.alreadySubscribed ? "You're already subscribed!" : "Subscribed! Check your inbox.");
			setNewsletterEmail("");
		} else {
			toast.error("Failed to subscribe.");
		}
	};

	const totalSlidable = Math.max(0, topics.length - sliderItems);
	const slideNext = () =>
		setCurrentSlide((p) => (p >= totalSlidable ? 0 : p + 1));
	const slidePrev = () =>
		setCurrentSlide((p) => (p <= 0 ? totalSlidable : p - 1));

	return (
		<>
			{/* Hero */}
			<section className="pt-[230px] pb-[70px] sm:pb-[100px] relative" id="home">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						<div>
							<p className="text-sm font-bold text-[hsl(216,33%,68%)] mb-5">
								The Modern Publishing Platform
							</p>
							<h1 className="headline headline-1 mb-5">
								Write, Share &{" "}
								<span className="navy-blue-blog-gradient-text">Connect</span>
							</h1>
							<p className="text-[hsl(217,24%,59%)] mb-10 leading-relaxed text-lg">
								A powerful blogging platform with git-backed publishing, block editor, and
								multi-tenant sites. Create your own publication or contribute to the community.
							</p>
							<div className="relative max-w-[390px] p-2.5 pl-5 bg-[hsl(216,33%,20%)] rounded-md border border-[hsl(199,89%,49%)] flex items-center hover:shadow-[0px_3px_20px_hsla(180,90%,43%,0.2)] transition-shadow">
								<input
									type="email"
									placeholder="Type your email address"
									className="flex-1 bg-transparent outline-none text-[hsl(216,100%,95%)] placeholder:text-[hsl(216,33%,68%)] pr-2"
								/>
								<button type="button" className="navy-blue-blog-btn px-4 py-2 rounded-md text-sm flex items-center gap-1">
									<span>Subscribe</span>
									<ArrowRight className="w-4 h-4" />
								</button>
							</div>
						</div>

						<div className="relative hidden lg:block">
							<img
								src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=400&h=600&fit=crop"
								alt="BlogCMS workspace"
								className="max-w-full mx-auto rounded-2xl"
							/>
							{/* Decorative stars */}
							<div className="absolute top-12 right-10 w-7 h-7 animate-bounce">
								<svg viewBox="0 0 27 26" fill="none" className="w-full h-full">
									<title>star</title>
									<path
										d="M13.5 0L16.5 10H27L18.5 16L21.5 26L13.5 20L5.5 26L8.5 16L0 10H10.5L13.5 0Z"
										fill="#0ea5ea"
									/>
								</svg>
							</div>
							<div
								className="absolute bottom-5 left-6 w-7 h-7 animate-bounce"
								style={{ animationDelay: "0.5s" }}
							>
								<svg viewBox="0 0 27 26" fill="none" className="w-full h-full">
									<title>star</title>
									<path
										d="M13.5 0L16.5 10H27L18.5 16L21.5 26L13.5 20L5.5 26L8.5 16L0 10H10.5L13.5 0Z"
										fill="#0bd1d1"
									/>
								</svg>
							</div>
						</div>
					</div>

					{/* Background blurs */}
					<div className="hidden sm:block absolute top-20 left-0 w-[500px] h-[800px] bg-gradient-to-b from-[#0ea5ea20] to-transparent rounded-full blur-3xl pointer-events-none" />
					<div className="hidden sm:block absolute bottom-[-200px] left-[-20px] w-[500px] h-[500px] bg-gradient-to-t from-[#0bd1d120] to-transparent rounded-full blur-3xl pointer-events-none" />
				</div>
			</section>

			{/* Hot Topics */}
			<section className="navy-blue-blog-section" id="topics">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="navy-blue-blog-card p-6 rounded-lg">
						<div className="grid lg:grid-cols-[0.3fr_1fr] gap-5 items-center">
							<div className="mb-4 lg:mb-0">
								<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-2.5">Hot topics</h2>
								<p className="text-[hsl(216,33%,68%)] text-sm mb-5">
									Explore trending categories and find what interests you most.
								</p>
								<div className="flex items-center gap-2.5">
									<button type="button" onClick={slidePrev} className="btn-icon" aria-label="Previous">
										<ArrowLeft className="w-4 h-4" />
									</button>
									<button type="button" onClick={slideNext} className="btn-icon" aria-label="Next">
										<ArrowRight className="w-4 h-4" />
									</button>
								</div>
							</div>

							<div className="overflow-hidden">
								<ul
									ref={sliderRef}
									className="flex gap-5 transition-transform duration-500"
									style={{
										transform: `translateX(-${currentSlide * (100 / sliderItems + 5)}%)`,
									}}
								>
									{topics.map((topic, index) => (
										<li
											key={topic.id}
											className="min-w-full sm:min-w-[calc(33.33%-13.33px)]"
										>
											<Link
												to="/topics"
												className="block relative group"
											>
												<figure className="aspect-[507/618] rounded-lg overflow-hidden bg-[hsl(216,33%,20%)]">
													<img
														src={TOPIC_IMAGES[index % TOPIC_IMAGES.length]}
														alt={topic.name}
														className="w-full h-full object-cover"
														loading="lazy"
													/>
												</figure>
												<div className="absolute inset-0 bg-gradient-to-t from-[#000d1a] to-transparent rounded-lg" />
												<div className="absolute bottom-4 left-4">
													<span className="text-[hsl(199,69%,84%)] font-bold group-hover:text-[hsl(199,89%,49%)] transition-colors">
														{topic.name}
													</span>
												</div>
											</Link>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Featured Posts */}
			<section className="navy-blue-blog-section relative" id="featured">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-2.5">
						<span className="navy-blue-blog-gradient-text">Featured</span> Posts
					</h2>
					<p className="text-lg text-[hsl(216,33%,68%)] mb-16">
						Discover our most popular and trending articles
					</p>

					{featuredQuery.isLoading ? (
						<div className="flex flex-wrap gap-8">
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className={`navy-blue-blog-card p-5 rounded-2xl animate-pulse ${
										i < 2
											? "w-full lg:w-[calc(50%-16px)]"
											: "w-full lg:w-[calc(33.33%-22px)]"
									}`}
								>
									<div className="aspect-video rounded-2xl bg-[hsl(216,33%,20%)] mb-6" />
									<div className="space-y-3">
										<div className="h-4 bg-[hsl(216,33%,20%)] rounded w-3/4" />
										<div className="h-4 bg-[hsl(216,33%,20%)] rounded w-full" />
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-wrap gap-8">
							{featuredPosts.map((post, index) => (
								<div
									key={post.id}
									className={`navy-blue-blog-card p-5 rounded-2xl transition-transform hover:-translate-y-1 ${
										index < 2
											? "w-full lg:w-[calc(50%-16px)]"
											: "w-full lg:w-[calc(33.33%-22px)]"
									}`}
								>
									<figure className="aspect-video rounded-2xl overflow-hidden bg-[hsl(216,33%,20%)] mb-6 relative">
										<ThrottledImage
											src={post.featuredImageUrl ?? "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop"}
											alt={post.title}
											className="w-full h-full object-cover"
											placeholder={<div className="w-full h-full bg-[hsl(216,33%,20%)] animate-pulse" />}
										/>
										{(post as any).isPremium && (
											<div className="absolute top-3 left-3 flex items-center gap-1 bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
												✦ Premium
											</div>
										)}
									</figure>

									<div className="flex items-center justify-between gap-5 text-sm mb-5">
										<div className="flex items-center gap-2.5">
											<Avatar className="w-10 h-10">
												<AvatarImage src={post.author?.avatarUrl ?? undefined} alt={post.author?.displayName ?? "Unknown"} />
												<AvatarFallback className="bg-[hsl(216,33%,20%)]">
													{(post.author?.displayName ?? "U").charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div>
												<p className="text-[hsl(217,17%,48%)] font-bold">{post.author?.displayName ?? "Unknown"}</p>
												<p className="text-xs text-[hsl(217,17%,48%)]">
													{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
												</p>
											</div>
										</div>
										{post.category?.name && (
											<span className="navy-blue-blog-badge">{post.category.name}</span>
										)}
									</div>

									<h3
										className={`headline-3 text-[hsl(199,69%,84%)] mb-4 hover:text-[hsl(199,89%,49%)] transition-colors ${index >= 2 ? "text-xl" : ""}`}
									>
										<Link to="/$slug" params={{ slug: post.slug }}>
											{post.title}
										</Link>
									</h3>

									<p className="text-[hsl(216,33%,68%)] text-sm mb-5 line-clamp-2">
										{post.excerpt}
									</p>

									<div className="flex items-center justify-between text-sm text-[hsl(216,33%,68%)]">
										<div className="flex items-center gap-1">
											<Clock className="w-4 h-4" />
											<span>{Math.max(1, Math.round((post.excerpt?.split(" ").length ?? 200) / 200))} min read</span>
										</div>
										<Link
											to="/$slug"
											params={{ slug: post.slug }}
											className="text-[hsl(199,89%,49%)] font-medium hover:underline"
										>
											Read More
										</Link>
									</div>
								</div>
							))}
						</div>
					)}

					<div className="text-center mt-8">
						<Link
							to="/"
							className="navy-blue-blog-btn inline-flex items-center gap-2 px-8 py-4 rounded-full"
						>
							<span>View All Posts</span>
							<ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</div>

				<div className="hidden sm:block absolute top-[-100px] right-0 w-[400px] h-[600px] bg-gradient-to-l from-[#0ea5ea10] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Recent Posts + Sidebar */}
			<section className="navy-blue-blog-section" id="recent">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="grid lg:grid-cols-[1fr_0.6fr] gap-12 items-start">
						{/* Recent Posts */}
						<div>
							<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-2.5">
								Recent Posts
							</h2>
							<p className="text-lg text-[hsl(216,33%,68%)] mb-16">
								Stay updated with our latest articles
							</p>

							<div className="space-y-8">
								{recentPosts.map((post) => (
									<article
										key={post.id}
										className="grid sm:grid-cols-[0.7fr_1fr] gap-5 group"
									>
										<figure className="aspect-[4/3] rounded-2xl overflow-hidden bg-[hsl(216,33%,20%)] transition-transform group-hover:-translate-y-0.5">
											<ThrottledImage
												src={post.featuredImageUrl ?? "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop"}
												alt={post.title}
												className="w-full h-full object-cover"
												placeholder={<div className="w-full h-full bg-[hsl(216,33%,20%)] animate-pulse" />}
											/>
										</figure>
										<div>
											{post.category?.name && (
												<span className="navy-blue-blog-badge mb-4">{post.category.name}</span>
											)}
											<h3 className="headline-3 text-[hsl(199,69%,84%)] mb-4 hover:text-[hsl(199,89%,49%)] transition-colors text-xl mt-2">
												<Link to="/$slug" params={{ slug: post.slug }}>
													{post.title}
												</Link>
											</h3>
											<p className="text-[hsl(216,33%,68%)] text-sm leading-tight mb-5">
												{post.excerpt}
											</p>
											<div className="flex items-center gap-4 text-sm text-[hsl(217,17%,48%)]">
												<div className="flex items-center gap-2">
													<Avatar className="w-6 h-6">
														<AvatarImage
															src={post.author?.avatarUrl ?? undefined}
															alt={post.author?.displayName ?? "Unknown"}
														/>
														<AvatarFallback className="bg-[hsl(216,33%,20%)] text-xs">
															{(post.author?.displayName ?? "U").charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span>{post.author?.displayName ?? "Unknown"}</span>
												</div>
												<span>
													{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
												</span>
												<div className="flex items-center gap-1">
													<Eye className="w-4 h-4" />
													<span>{post.viewCount?.toLocaleString() ?? "0"}</span>
												</div>
											</div>
										</div>
									</article>
								))}
							</div>

							{/* Load More */}
							{recentQuery.hasNextPage && (
								<div className="flex justify-center mt-10">
									<button
										type="button"
										onClick={() => recentQuery.fetchNextPage()}
										disabled={recentQuery.isFetchingNextPage}
										className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[hsl(216,33%,20%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,49%)] transition-colors disabled:opacity-60"
									>
										{recentQuery.isFetchingNextPage ? (
											<><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
										) : "Load More Posts"}
									</button>
								</div>
							)}
						</div>

						{/* Sidebar */}
						<aside className="space-y-8">
							{/* Popular Posts */}
							<div className="navy-blue-blog-card p-6 rounded-2xl">
								<h3 className="headline-2 text-[hsl(199,69%,84%)] mb-10 text-xl">
									<span className="relative">
										Popular Posts
										<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-[hsl(199,89%,49%)]" />
									</span>
								</h3>

								<div className="space-y-5">
									{popularPosts.map((post) => (
										<article key={post.id} className="flex items-start gap-3">
											<Avatar className="w-14 h-14 flex-shrink-0">
												<AvatarImage src={post.author?.avatarUrl ?? undefined} alt={post.title} />
												<AvatarFallback className="bg-[hsl(216,33%,20%)]">P</AvatarFallback>
											</Avatar>
											<div className="flex-1 border-b border-[hsl(216,33%,20%)] pb-5">
												<h4 className="text-[hsl(199,69%,84%)] font-medium mb-3 hover:text-[hsl(199,89%,49%)] transition-colors text-sm">
													<Link to="/$slug" params={{ slug: post.slug }}>
														{post.title}
													</Link>
												</h4>
												<div className="flex items-center gap-2.5 text-sm text-[hsl(217,17%,48%)]">
													<span>
														{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
													</span>
													<span>•</span>
													<div className="flex items-center gap-1">
														<Eye className="w-3 h-3" />
														<span>{post.viewCount?.toLocaleString() ?? "0"}</span>
													</div>
												</div>
											</div>
										</article>
									))}
								</div>
							</div>

							{/* Newsletter */}
							<div className="navy-blue-blog-card p-6 rounded-2xl">
								<h3 className="headline-2 text-[hsl(199,69%,84%)] mb-4 text-xl">
									<span className="relative">
										Newsletter
										<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-[hsl(199,89%,49%)]" />
									</span>
								</h3>
								<p className="text-[hsl(217,17%,48%)] font-bold text-sm mb-8 mt-6">
									Subscribe to get the latest updates
								</p>
								<form onSubmit={handleNewsletterSubmit}>
									<div className="relative mb-6">
										<input
											type="email"
											value={newsletterEmail}
											onChange={(e) => setNewsletterEmail(e.target.value)}
											placeholder="Your email"
											className="w-full bg-transparent border-b border-[hsl(216,33%,68%)] py-3 pr-8 text-sm outline-none focus:border-[hsl(199,89%,49%)] transition-colors text-[hsl(216,100%,95%)]"
											disabled={subscribeNewsletter.isPending}
										/>
									</div>
									<button
										type="submit"
										disabled={subscribeNewsletter.isPending}
										className="navy-blue-blog-btn w-full py-3 rounded-md text-sm disabled:opacity-50"
									>
										{subscribeNewsletter.isPending ? "Subscribing…" : "Subscribe"}
									</button>
								</form>
							</div>
						</aside>
					</div>
				</div>
			</section>
		</>
	)
}
