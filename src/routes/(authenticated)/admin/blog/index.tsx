import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	BarChart3,
	Eye,
	FileText,
	Mail,
	MessageCircle,
	PenLine,
	Plus,
	Tag,
	Users,
	Globe,
	HardDrive,
	CheckCircle,
	Clock,
	Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/admin/app-layout";
import { ROUTES } from "@/constants";
import {
	useAdminPosts,
	useAuthors,
	useComments,
	useTags,
} from "@/lib/blog/queries";
import { useSession } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/(authenticated)/admin/blog/")({
	component: AdminBlogDashboard,
});

const quickActions = [
	{
		label: "New Post",
		description: "Start writing",
		icon: PenLine,
		to: ROUTES.ADMIN.BLOG.POST_NEW,
		color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
	},
	{
		label: "All Posts",
		description: "Manage posts",
		icon: FileText,
		to: ROUTES.ADMIN.BLOG.POSTS,
		color:
			"bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
	},
	{
		label: "Categories",
		description: "Organize content",
		icon: Tag,
		to: ROUTES.ADMIN.BLOG.CATEGORIES,
		color:
			"bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
	},
	{
		label: "Comments",
		description: "Moderate discussions",
		icon: MessageCircle,
		to: ROUTES.ADMIN.BLOG.COMMENTS,
		color:
			"bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
	},
	{
		label: "Authors",
		description: "Manage authors",
		icon: Users,
		to: ROUTES.ADMIN.BLOG.AUTHORS,
		color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
	},
	{
		label: "Analytics",
		description: "Performance stats",
		icon: BarChart3,
		to: ROUTES.ADMIN.BLOG.ANALYTICS,
		color: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
	},
	{
		label: "Media",
		description: "Files & images",
		icon: HardDrive,
		to: ROUTES.ADMIN.BLOG.MEDIA,
		color: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
	},
	{
		label: "Newsletter",
		description: "Subscribers & emails",
		icon: Mail,
		to: ROUTES.ADMIN.BLOG.NEWSLETTER,
		color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
	},
	{
		label: "Sites",
		description: "Multi-site config",
		icon: Globe,
		to: ROUTES.ADMIN.BLOG.SITES,
		color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
	},
];

const statusConfig = {
	published: {
		label: "Published",
		className:
			"bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
	},
	draft: {
		label: "Draft",
		className:
			"bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
	},
	review: {
		label: "In Review",
		className:
			"bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
	},
	archived: {
		label: "Archived",
		className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
	},
};

const AUTHOR_QUICK_ACTIONS = [
	{ label: "New Post", description: "Start writing", icon: PenLine, to: ROUTES.ADMIN.BLOG.POST_NEW, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
	{ label: "Your Posts", description: "Manage posts", icon: FileText, to: ROUTES.ADMIN.BLOG.POSTS, color: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" },
];

function AdminBlogDashboard() {
	const { data: session } = useSession();
	const userRole = (session?.user as any)?.role ?? "user";
	const isAuthor = userRole === "author";

	const postsQuery = useAdminPosts({ limit: 100 });
	const authorsQuery = useAuthors();
	const commentsQuery = useComments({ page: 1 });
	const tagsQuery = useTags();

	const posts = useMemo(
		() => (postsQuery.data as any)?.data?.items ?? [],
		[(postsQuery.data as any)?.data?.items],
	);
	const authors = (authorsQuery.data as any)?.data?.items ?? [];
	const comments = (commentsQuery.data as any)?.data?.items ?? [];
	const tags = (tagsQuery.data as any)?.data ?? [];

	const statsCards = useMemo(() => {
		const totalPosts = posts.length;
		const publishedPosts = posts.filter(
			(post: any) => post.status === "published",
		).length;
		const draftPosts = posts.filter((post: any) => post.status === "draft").length;
		const totalViews = posts.reduce(
			(sum: any, post: any) => sum + (post.viewCount ?? 0),
			0,
		);

		return [
			{
				title: "Total Posts",
				value: totalPosts.toLocaleString(),
				description: "All time",
				icon: FileText,
				color: "text-blue-500",
				bg: "bg-blue-500/10",
			},
			{
				title: "Published",
				value: publishedPosts.toLocaleString(),
				description: "Live on site",
				icon: CheckCircle,
				color: "text-green-500",
				bg: "bg-green-500/10",
			},
			{
				title: "Drafts",
				value: draftPosts.toLocaleString(),
				description: "In progress",
				icon: Clock,
				color: "text-amber-500",
				bg: "bg-amber-500/10",
			},
			{
				title: "Total Views",
				value: totalViews.toLocaleString(),
				description: "Across all posts",
				icon: Eye,
				color: "text-violet-500",
				bg: "bg-violet-500/10",
			},
		];
	}, [posts]);

	const recentPosts = useMemo(() => posts.slice(0, 5), [posts]);

	return (
		<PageContainer
			title={isAuthor ? "Your Dashboard" : "Blog"}
			description={isAuthor ? "An overview of your writing activity." : "Manage your blog content, authors, and settings."}
		>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statsCards.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<div className={`p-2 rounded-lg ${stat.bg}`}>
								<stat.icon className={`h-4 w-4 ${stat.color}`} />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stat.value}</div>
							<p className="text-xs text-muted-foreground">
								{stat.description}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">
						Quick Actions
					</h2>
					<Button {...{asChild: true} as any}>
						<Link to={ROUTES.ADMIN.BLOG.POST_NEW as string}>
							<Plus className="mr-2 h-4 w-4" />
							New Post
						</Link>
					</Button>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{(isAuthor ? AUTHOR_QUICK_ACTIONS : quickActions).map((action) => (
						<Link
							key={action.label}
							to={action.to as string}
							className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
						>
							<div
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.color}`}
							>
								<action.icon className="h-5 w-5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">{action.label}</p>
								<p className="text-xs text-muted-foreground truncate">
									{action.description}
								</p>
							</div>
						</Link>
					))}
				</div>
			</div>

			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">{isAuthor ? "Your Recent Posts" : "Recent Posts"}</h2>
					<Button variant="outline" size="sm" {...{asChild: true} as any}>
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
							<Button {...{asChild: true} as any}>
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
								const status =
									statusConfig[post.status as keyof typeof statusConfig] ??
									statusConfig.draft;
								return (
									<div
										key={post.id}
										className="flex items-center justify-between p-4"
									>
										<div className="flex-1 min-w-0 mr-4">
											<p className="text-sm font-medium truncate">
												{post.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{post.author?.name ?? "—"} ·{" "}
												{post.category?.name ?? "Uncategorized"}
											</p>
										</div>
										<div className="flex items-center gap-3 shrink-0">
											<Badge className={status.className}>{status.label}</Badge>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Eye className="w-3 h-3" />
												{(post.viewCount ?? 0).toLocaleString()}
											</div>
											<Button variant="ghost" size="sm" {...{asChild: true} as any}>
												<Link to={ROUTES.ADMIN.BLOG.POST_EDIT(post.id) as string}>
													Edit
												</Link>
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</Card>
				)}
			</div>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base text-muted-foreground flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						Analytics Snapshot
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
						<div className="rounded-lg bg-muted/30 p-4">
							<p className="text-muted-foreground">Authors</p>
							<p className="text-xl font-semibold">{authors.length}</p>
						</div>
						<div className="rounded-lg bg-muted/30 p-4">
							<p className="text-muted-foreground">Comments</p>
							<p className="text-xl font-semibold">
								{(commentsQuery.data as any)?.data?.total ?? comments.length}
							</p>
						</div>
						<div className="rounded-lg bg-muted/30 p-4">
							<p className="text-muted-foreground">Tags</p>
							<p className="text-xl font-semibold">{tags.length}</p>
						</div>
						<div className="rounded-lg bg-muted/30 p-4">
							<p className="text-muted-foreground">Archived</p>
							<p className="text-xl font-semibold flex items-center gap-2">
								<Archive className="h-4 w-4 text-muted-foreground" />
								{posts.filter((post: any) => post.status === "archived").length}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</PageContainer>
	);
}
