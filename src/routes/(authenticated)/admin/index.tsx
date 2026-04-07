import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	Archive,
	ArrowRight,
	BarChart3,
	CheckCircle,
	Clock,
	Eye,
	FileText,
	Globe,
	HardDrive,
	Mail,
	MessageCircle,
	MessageSquare,
	PenLine,
	Plus,
	Sparkles,
	Tag,
	ThumbsUp,
	TrendingUp,
	Users,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboardUserStats } from "@/lib/auth/queries";
import {
	useBlogStats,
	useAuthorStats,
	useAdminPosts,
	useAuthors,
	useComments,
	useTags,
} from "@/lib/blog/queries";
import { useRole, useUser } from "@/hooks/auth-hooks";
import { ROLES, ROUTES } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/")({ component: AdminDashboardPage });

function fmt(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

const statusConfig = {
	published: { label: "Published", className: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400" },
	draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
	review: { label: "In Review", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400" },
	archived: { label: "Archived", className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400" },
};

function AdminDashboardPage() {
	const user = useUser();
	const role = useRole();

	// Role levels
	const isAuthorOnly = role === ROLES.AUTHOR;
	const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
	const canModerate = !isAuthorOnly; // moderator, admin, super_admin

	// Shared queries
	const postsQuery = useAdminPosts({ limit: 5 });
	const recentPosts = useMemo(
		() => (postsQuery.data as any)?.data?.items ?? [],
		[postsQuery.data],
	);

	// Platform-wide queries (moderator+)
	const globalStatsQuery = useBlogStats();
	const globalStats = globalStatsQuery.data?.ok ? globalStatsQuery.data.data : null;
	const { data: userStatsData, isLoading: userStatsLoading } = useDashboardUserStats();
	const userStats = userStatsData?.ok ? userStatsData.data : null;
	const authorsQuery = useAuthors();
	const commentsQuery = useComments({ page: 1 });
	const tagsQuery = useTags();

	// Author-scoped queries
	const authorStatsQuery = useAuthorStats();
	const authorStats = authorStatsQuery.data?.ok ? authorStatsQuery.data.data : null;

	// Unified stats — scoped to the role
	const statsQuery = isAuthorOnly ? authorStatsQuery : globalStatsQuery;
	const stats = isAuthorOnly ? authorStats : globalStats;
	const isLoading = isAuthorOnly
		? authorStatsQuery.isLoading || postsQuery.isLoading
		: globalStatsQuery.isLoading || userStatsLoading || postsQuery.isLoading;

	// KPI cards — same count (5), different metrics per role
	const kpiCards = isAuthorOnly
		? [
				{ label: "My Posts", value: authorStats ? fmt((authorStats as any).totalPosts ?? 0) : "—", sub: "all time", icon: FileText, color: "text-violet-500 bg-violet-500/10" },
				{ label: "Published", value: authorStats ? fmt((authorStats as any).publishedPosts ?? 0) : "—", sub: "live on site", icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
				{ label: "Total Views", value: authorStats ? fmt((authorStats as any).totalViews ?? 0) : "—", sub: "across your posts", icon: TrendingUp, color: "text-blue-500 bg-blue-500/10" },
				{ label: "Reactions", value: authorStats ? fmt((authorStats as any).totalReactions ?? 0) : "—", sub: "total", icon: ThumbsUp, color: "text-amber-500 bg-amber-500/10" },
				{ label: "Comments", value: authorStats ? fmt((authorStats as any).totalComments ?? 0) : "—", sub: "on your posts", icon: MessageSquare, color: "text-pink-500 bg-pink-500/10" },
			]
		: [
				{ label: "Total Views", value: globalStats ? fmt(globalStats.totalViews) : "—", sub: `${globalStats ? fmt(globalStats.premiumPostViews) : "—"} premium views`, icon: Eye, color: "text-blue-500 bg-blue-500/10" },
				{ label: "Published Posts", value: globalStats ? fmt(globalStats.totalPosts) : "—", sub: `${globalStats ? fmt(globalStats.premiumPosts) : "—"} premium`, icon: FileText, color: "text-violet-500 bg-violet-500/10" },
				{ label: "Newsletter", value: globalStats ? fmt(globalStats.subscriberCount) : "—", sub: "confirmed subscribers", icon: Mail, color: "text-sky-500 bg-sky-500/10" },
				{ label: "Comments", value: globalStats ? fmt(globalStats.totalComments) : "—", sub: `${globalStats ? fmt(globalStats.totalReactions) : "—"} reactions`, icon: MessageSquare, color: "text-pink-500 bg-pink-500/10" },
				{ label: "Total Users", value: userStats ? fmt(userStats.totalUsers) : "—", sub: `${userStats?.activeCount ?? 0} active`, icon: Users, color: "text-emerald-500 bg-emerald-500/10" },
			];

	// Quick actions — base 4 for everyone, +2 for moderators, +4 for admins
	const quickActions = useMemo(() => {
		const actions = [
			{ label: "New Post", description: "Start writing", icon: PenLine, to: ROUTES.ADMIN.BLOG.POST_NEW, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
			{ label: isAuthorOnly ? "Your Posts" : "All Posts", description: "Manage posts", icon: FileText, to: ROUTES.ADMIN.BLOG.POSTS, color: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" },
			{ label: "Media", description: "Files & images", icon: HardDrive, to: (isAdmin ? ROUTES.ADMIN.STORAGE : ROUTES.DASHBOARD_ASSETS) as string, color: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400" },
			{ label: "View Blog", description: "Live site", icon: TrendingUp, to: "/", color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
		];
		if (canModerate) {
			actions.push(
				{ label: "Comments", description: "Moderate discussions", icon: MessageCircle, to: ROUTES.ADMIN.BLOG.COMMENTS as string, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
				{ label: "Categories", description: "Organize content", icon: Tag, to: ROUTES.ADMIN.BLOG.CATEGORIES as string, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
			);
		}
		if (isAdmin) {
			actions.push(
				{ label: "Authors", description: "Manage authors", icon: Users, to: ROUTES.ADMIN.BLOG.AUTHORS as string, color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
				{ label: "Newsletter", description: "Subscribers & emails", icon: Mail, to: ROUTES.ADMIN.BLOG.NEWSLETTER as string, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
				{ label: "Sites", description: "Multi-site config", icon: Globe, to: ROUTES.ADMIN.BLOG.SITES as string, color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400" },
				{ label: "Users", description: "Manage accounts", icon: Users, to: ROUTES.ADMIN.USERS as string, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
			);
		}
		return actions;
	}, [isAuthorOnly, isAdmin, canModerate]);

	return (
		<PageContainer
			title="Dashboard"
			description={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. ${
				isAuthorOnly ? "Here's your writing activity." : "Here's your blog overview."
			}`}
		>
			{/* KPI cards */}
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
				{kpiCards.map((card) => (
					<Card key={card.label}>
						<CardContent className="pt-5">
							<div className="flex items-start gap-2 mb-3">
								<div className={`w-9 h-9 rounded-lg grid place-items-center ${card.color}`}>
									<card.icon className="w-4 h-4" />
								</div>
							</div>
							<div className="text-2xl font-bold">
								{isLoading ? <span className="animate-pulse text-muted-foreground">…</span> : card.value}
							</div>
							<p className="text-xs text-muted-foreground mt-0.5 font-medium">{card.label}</p>
							<p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Quick actions */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
					<Button {...{ asChild: true } as any}>
						<Link to={ROUTES.ADMIN.BLOG.POST_NEW as string}>
							<Plus className="mr-2 h-4 w-4" />
							New Post
						</Link>
					</Button>
				</div>
				<div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{quickActions.map((action) => (
						<Link
							key={action.label}
							to={action.to}
							className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
						>
							<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
								<action.icon className="h-5 w-5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">{action.label}</p>
								<p className="text-xs text-muted-foreground truncate">{action.description}</p>
							</div>
						</Link>
					))}
				</div>
			</div>

			{/* Recent Posts */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">
						{isAuthorOnly ? "Your Recent Posts" : "Recent Posts"}
					</h2>
					<Button variant="outline" size="sm" {...{ asChild: true } as any}>
						<Link to={ROUTES.ADMIN.BLOG.POSTS as string}>View all</Link>
					</Button>
				</div>
				{postsQuery.isLoading ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
							Loading recent posts…
						</CardContent>
					</Card>
				) : recentPosts.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<FileText className="h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground text-sm mb-4">No posts yet</p>
							<Button {...{ asChild: true } as any}>
								<Link to={ROUTES.ADMIN.BLOG.POST_NEW as string}>
									<Plus className="mr-2 h-4 w-4" />
									Create your first post
								</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<Card>
						<div className="divide-y">
							{recentPosts.map((post: any) => {
								const status = statusConfig[post.status as keyof typeof statusConfig] ?? statusConfig.draft;
								return (
									<div key={post.id} className="flex items-center justify-between p-4">
										<div className="flex-1 min-w-0 mr-4">
											<p className="text-sm font-medium truncate">{post.title}</p>
											<p className="text-xs text-muted-foreground">
												{post.author?.name ?? "—"} · {post.category?.name ?? "Uncategorized"}
											</p>
										</div>
										<div className="flex items-center gap-3 shrink-0">
											<Badge className={status.className}>{status.label}</Badge>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Eye className="w-3 h-3" />
												{(post.viewCount ?? 0).toLocaleString()}
											</div>
											<Button variant="ghost" size="sm" {...{ asChild: true } as any}>
												<Link to={ROUTES.ADMIN.BLOG.POST_EDIT(post.id) as string}>Edit</Link>
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</Card>
				)}
			</div>

			{/* Top Posts by Views bar chart — scoped to role */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base flex items-center gap-2">
						<TrendingUp className="w-4 h-4 text-primary" />
						{isAuthorOnly ? "Your Top Posts by Views" : "Top Posts by Views"}
					</CardTitle>
					<CardDescription>
						{isAuthorOnly
							? "View distribution across your published posts"
							: "View distribution across your top published posts"}
					</CardDescription>
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
								<XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
								<YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={36} />
								<Tooltip
									contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
									cursor={{ fill: "var(--muted)" }}
									formatter={(value: number) => [fmt(value), "Views"]}
								/>
								<Bar dataKey="views" radius={[4, 4, 0, 0]} maxBarSize={52}>
									{stats.topPosts.map((_, i) => (
										<Cell key={i} fill={i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)"} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>

			{/* Top Posts + Top Categories — same layout for all roles */}
			<div className="grid lg:grid-cols-2 gap-6">
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
										<span className="text-xl font-bold text-muted-foreground/30 w-5 shrink-0 tabular-nums">{i + 1}</span>
										<div className="flex-1 min-w-0">
											<Link
												to={"/$slug" as string}
												params={{ slug: post.slug } as any}
												className="text-sm font-medium line-clamp-1 hover:underline"
											>
												{post.title}
											</Link>
											{post.categoryName && <p className="text-xs text-muted-foreground">{post.categoryName}</p>}
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

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-base">Top Categories</CardTitle>
							<CardDescription>By post count</CardDescription>
						</div>
						{canModerate && (
							<Link
								to={ROUTES.ADMIN.BLOG.CATEGORIES as string}
								className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
							>
								Manage <ArrowRight className="w-3 h-3" />
							</Link>
						)}
					</CardHeader>
					<CardContent className="space-y-4">
						{globalStatsQuery.isLoading ? (
							<div className="text-center text-muted-foreground text-sm">Loading…</div>
						) : !globalStats?.topCategories.length ? (
							<div className="text-center text-muted-foreground text-sm">No categories yet.</div>
						) : (() => {
							const max = Math.max(...globalStats.topCategories.map((c) => c.postCount), 1);
							return globalStats.topCategories.map((cat) => (
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

			{/* Platform Snapshot — moderators and above */}
			{canModerate && (
				<Card className="border-dashed">
					<CardHeader>
						<CardTitle className="text-base text-muted-foreground flex items-center gap-2">
							<BarChart3 className="h-5 w-5" />
							Platform Snapshot
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
							<div className="rounded-lg bg-muted/30 p-4">
								<p className="text-muted-foreground">Authors</p>
								<p className="text-xl font-semibold">
									{(authorsQuery.data as any)?.data?.items?.length ?? "—"}
								</p>
							</div>
							<div className="rounded-lg bg-muted/30 p-4">
								<p className="text-muted-foreground">Comments</p>
								<p className="text-xl font-semibold">
									{(commentsQuery.data as any)?.data?.total ?? "—"}
								</p>
							</div>
							<div className="rounded-lg bg-muted/30 p-4">
								<p className="text-muted-foreground">Tags</p>
								<p className="text-xl font-semibold">
									{Array.isArray((tagsQuery.data as any)?.data)
										? (tagsQuery.data as any).data.length
										: "—"}
								</p>
							</div>
							<div className="rounded-lg bg-muted/30 p-4">
								<p className="text-muted-foreground">Premium Posts</p>
								<p className="text-xl font-semibold flex items-center gap-2">
									<Sparkles className="h-4 w-4 text-muted-foreground" />
									{globalStats ? fmt(globalStats.premiumPosts) : "—"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Views Over Time — all roles */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Views Over Time</CardTitle>
					<CardDescription>
						{isAuthorOnly
							? "Your post views over the last 30 days — connect an analytics provider"
							: "Last 30 days — connect a time-series analytics provider"}
					</CardDescription>
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
		</PageContainer>
	);
}
