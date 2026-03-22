import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Eye,
	FileText,
	Mail,
	MessageSquare,
	PenLine,
	Settings,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { useDashboardUserStats } from "@/lib/auth/queries";
import { useBlogStats } from "@/lib/blog/queries";
import { ROUTES } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/admin/app-layout";
import { useUser } from "@/hooks/auth-hooks";

export const Route = createFileRoute("/(authenticated)/admin/")({
	component: AdminDashboardPage,
});

function fmt(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function AdminDashboardPage() {
	const user = useUser();
	const { data: userStatsData, isLoading: userStatsLoading } = useDashboardUserStats();
	const userStats = userStatsData?.ok ? userStatsData.data : null;

	const statsQuery = useBlogStats();
	const stats = statsQuery.data?.ok ? statsQuery.data.data : null;
	const isLoading = statsQuery.isLoading || userStatsLoading;

	const kpiCards = [
		{
			label: "Total Views",
			value: stats ? fmt(stats.totalViews) : "—",
			sub: `${stats ? fmt(stats.premiumPostViews) : "—"} premium views`,
			icon: Eye,
			color: "text-blue-500 bg-blue-500/10",
		},
		{
			label: "Published Posts",
			value: stats ? fmt(stats.totalPosts) : "—",
			sub: `${stats ? fmt(stats.premiumPosts) : "—"} premium`,
			icon: FileText,
			color: "text-violet-500 bg-violet-500/10",
		},
		{
			label: "Newsletter",
			value: stats ? fmt(stats.subscriberCount) : "—",
			sub: "confirmed subscribers",
			icon: Mail,
			color: "text-sky-500 bg-sky-500/10",
		},
		{
			label: "Comments",
			value: stats ? fmt(stats.totalComments) : "—",
			sub: `${stats ? fmt(stats.totalReactions) : "—"} reactions`,
			icon: MessageSquare,
			color: "text-pink-500 bg-pink-500/10",
		},
		{
			label: "Total Users",
			value: userStats ? fmt(userStats.totalUsers) : "—",
			sub: `${userStats?.activeCount ?? 0} active`,
			icon: Users,
			color: "text-emerald-500 bg-emerald-500/10",
		},
	];

	const quickActions = [
		{ label: "New Post", icon: PenLine, to: ROUTES.EDITOR.NEW, primary: true },
		{ label: "Manage Posts", icon: FileText, to: ROUTES.ADMIN.BLOG.POSTS },
		{ label: "All Users", icon: Users, to: ROUTES.ADMIN.USERS },
		{ label: "View Blog", icon: TrendingUp, to: "/" },
		{ label: "Settings", icon: Settings, to: ROUTES.ADMIN.BLOG.SITES },
	];

	return (
		<PageContainer
			title="Dashboard"
			description={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Here's your blog overview.`}
		>
			{/* KPI cards */}
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
				{kpiCards.map((card) => (
					<Card key={card.label}>
						<CardContent className="pt-5">
							<div className="flex items-start justify-between gap-2 mb-3">
								<div className={`w-9 h-9 rounded-lg grid place-items-center ${card.color}`}>
									<card.icon className="w-4 h-4" />
								</div>
							</div>
							<div className="text-2xl font-bold">
								{isLoading ? (
									<span className="animate-pulse text-muted-foreground">…</span>
								) : (
									card.value
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-0.5 font-medium">{card.label}</p>
							<p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Quick actions */}
			<div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
				{quickActions.map((action) => (
					<Link
						key={action.label}
						to={action.to as string}
						className={`group flex items-center gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent ${action.primary ? "border-primary/40 bg-primary/5" : "bg-card"}`}
					>
						<action.icon className={`h-4 w-4 shrink-0 ${action.primary ? "text-primary" : "text-muted-foreground"}`} />
						<span className={`text-sm font-medium flex-1 ${action.primary ? "text-primary" : ""}`}>{action.label}</span>
						<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</Link>
				))}
			</div>

			{/* Views Chart */}
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-primary" />
					Top Posts by Views
				</CardTitle>
				<CardDescription>View distribution across your top published posts</CardDescription>
			</CardHeader>
			<CardContent>
				{statsQuery.isLoading ? (
					<div className="h-48 flex items-center justify-center text-muted-foreground text-sm animate-pulse">Loading chart…</div>
				) : !stats?.topPosts.length ? (
					<div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet — publish your first post.</div>
				) : (
					<ResponsiveContainer width="100%" height={200}>
						<BarChart
							data={stats.topPosts.map((p) => ({
								name: p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title,
								views: p.viewCount,
							}))}
							margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
						>
							<XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
							<YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={36} />
							<Tooltip
								contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
								cursor={{ fill: "hsl(var(--muted))" }}
								formatter={(value: number) => [fmt(value), "Views"]}
							/>
							<Bar dataKey="views" radius={[4, 4, 0, 0]} maxBarSize={52}>
								{stats.topPosts.map((_, i) => (
									<Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>

		{/* Top Posts + Top Categories */}
			<div className="grid lg:grid-cols-2 gap-6">
				{/* Top Posts */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-base">Top Posts</CardTitle>
							<CardDescription>By total views</CardDescription>
						</div>
						<Link
							to={ROUTES.ADMIN.BLOG.POSTS as string}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
						>
							All posts <ArrowRight className="w-3 h-3" />
						</Link>
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
										<span className="text-xl font-bold text-muted-foreground/30 w-5 shrink-0 tabular-nums">
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

				{/* Top Categories */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-base">Top Categories</CardTitle>
							<CardDescription>By post count</CardDescription>
						</div>
						<Link
							to={ROUTES.ADMIN.BLOG.CATEGORIES as string}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
						>
							Manage <ArrowRight className="w-3 h-3" />
						</Link>
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
									<div className="h-1.5 rounded-full bg-muted overflow-hidden">
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

			{/* Link to detailed analytics */}
			<div className="flex justify-end">
				<Link
					to={ROUTES.ADMIN.BLOG.ANALYTICS as string}
					className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
				>
					View detailed analytics <ArrowRight className="w-3 h-3" />
				</Link>
			</div>
		</PageContainer>
	);
}
