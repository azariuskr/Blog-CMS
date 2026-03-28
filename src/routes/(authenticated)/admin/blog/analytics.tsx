import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, FileText, ThumbsUp, MessageSquare, Sparkles, TrendingUp, Mail } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlogStats } from "@/lib/blog/queries";

export const Route = createFileRoute("/(authenticated)/admin/blog/analytics")({
	component: BlogAnalyticsPage,
});

function fmt(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function BlogAnalyticsPage() {
	const statsQuery = useBlogStats();
	const stats = statsQuery.data?.ok ? statsQuery.data.data : null;

	const statCards = [
		{ label: "Total Views", value: stats ? fmt(stats.totalViews) : "—", icon: Eye, color: "text-blue-500 bg-blue-500/10" },
		{ label: "Published Posts", value: stats ? fmt(stats.totalPosts) : "—", icon: FileText, color: "text-violet-500 bg-violet-500/10" },
		{ label: "Premium Posts", value: stats ? fmt((stats as any).premiumPosts ?? 0) : "—", icon: Sparkles, color: "text-[var(--bg-carolina-blue)] bg-[var(--bg-carolina-blue)]/10" },
		{ label: "Premium Views", value: stats ? fmt((stats as any).premiumPostViews ?? 0) : "—", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
		{ label: "Subscribers", value: stats ? fmt((stats as any).subscriberCount ?? 0) : "—", icon: Mail, color: "text-sky-500 bg-sky-500/10" },
		{ label: "Total Reactions", value: stats ? fmt(stats.totalReactions) : "—", icon: ThumbsUp, color: "text-amber-500 bg-amber-500/10" },
		{ label: "Approved Comments", value: stats ? fmt(stats.totalComments) : "—", icon: MessageSquare, color: "text-pink-500 bg-pink-500/10" },
	];

	return (
		<PageContainer
			title="Analytics"
			description="Performance overview for your blog."
		>
			{/* Stat cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				{statCards.map((stat) => (
					<Card key={stat.label}>
						<CardContent className="pt-5">
							<div className="flex items-start justify-between gap-2 mb-3">
								<div className={`w-9 h-9 rounded-lg grid place-items-center ${stat.color}`}>
									<stat.icon className="w-4 h-4" />
								</div>
							</div>
							<div className="text-2xl font-bold">
								{statsQuery.isLoading ? (
									<span className="animate-pulse text-muted-foreground">…</span>
								) : (
									stat.value
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Chart placeholder */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Views Over Time</CardTitle>
					<CardDescription>Last 30 days — connect a time-series analytics provider</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-48 rounded-lg bg-muted/30 flex items-center justify-center">
						<div className="text-center text-muted-foreground">
							<TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
							<p className="text-sm">PostHog / Plausible / Umami chart here</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid lg:grid-cols-2 gap-6">
				{/* Top posts */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Top Posts</CardTitle>
						<CardDescription>By total views</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{statsQuery.isLoading ? (
							<div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
						) : !stats?.topPosts.length ? (
							<div className="p-6 text-center text-muted-foreground text-sm">No published posts yet.</div>
						) : (
							<div className="divide-y">
								{stats.topPosts.map((post, i) => (
									<div key={post.id} className="flex items-center gap-4 px-6 py-3">
										<span className="text-xl font-bold text-muted-foreground/40 w-6 shrink-0">
											{i + 1}
										</span>
										<div className="flex-1 min-w-0">
											<Link
												to={"/$slug" as string}
												params={{ slug: post.slug } as any}
												className="text-sm font-medium line-clamp-1 hover:underline"
											>
												{post.title}
											</Link>
											{post.categoryName && (
												<p className="text-xs text-muted-foreground">{post.categoryName}</p>
											)}
										</div>
										<div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
											<Eye className="w-3.5 h-3.5" />
											{fmt(post.viewCount)}
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Top categories */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Top Categories</CardTitle>
						<CardDescription>By post count</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{statsQuery.isLoading ? (
							<div className="text-center text-muted-foreground text-sm">Loading…</div>
						) : !stats?.topCategories.length ? (
							<div className="text-center text-muted-foreground text-sm">No categories yet.</div>
						) : (() => {
							const max = Math.max(...stats.topCategories.map((c) => c.postCount), 1);
							return stats.topCategories.map((cat) => (
								<div key={cat.id}>
									<div className="flex items-center justify-between text-sm mb-1.5">
										<span className="font-medium">{cat.name}</span>
										<span className="text-muted-foreground">{cat.postCount} posts</span>
									</div>
									<div className="h-2 rounded-full bg-muted overflow-hidden">
										<div
											className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
											style={{ width: `${Math.round((cat.postCount / max) * 100)}%` }}
										/>
									</div>
								</div>
							));
						})()}
					</CardContent>
				</Card>
			</div>
		</PageContainer>
	);
}
