import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, FileText, Eye, Clock, BookOpen, User, ArrowRight, Edit, HardDrive, Feather } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { useAdminPosts, useMyAuthorApplication } from "@/lib/blog/queries";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
	component: ContributorDashboard,
});

function ContributorDashboard() {
	const { data: session } = useSession();
	const userName = session?.user?.name ?? "Contributor";
	const userRole = (session?.user as any)?.role ?? "user";

	const postsQuery = useAdminPosts({ limit: 20 });
	const allPosts = postsQuery.data?.ok ? postsQuery.data.data.items : [];

	const applicationQuery = useMyAuthorApplication();
	const application = applicationQuery.data?.ok ? applicationQuery.data.data : null;
	const isReader = userRole === "user" || userRole === "reader";

	const published = allPosts.filter((p: any) => p.status === "published");
	const drafts = allPosts.filter((p: any) => p.status === "draft");
	const inReview = allPosts.filter((p: any) => p.status === "review");

	function formatDate(val: string | Date | null | undefined) {
		if (!val) return "—";
		return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	}

	const statusColor: Record<string, string> = {
		published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
		draft: "bg-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] border-[hsl(216,33%,30%)]",
		review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
		scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
		archived: "bg-red-500/20 text-red-400 border-red-500/30",
	};

	return (
		<div className="min-h-screen bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)]">
			{/* Header */}
			<header className="border-b border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] px-6 py-4">
				<div className="max-w-4xl mx-auto flex items-center justify-between">
					<div>
						<h1 className="text-xl font-bold text-[hsl(216,100%,95%)]">
							Welcome back, {userName.split(" ")[0]}
						</h1>
						<p className="text-sm text-[hsl(217,17%,48%)] mt-0.5">Your contributor dashboard</p>
					</div>
					<Link
						to={ROUTES.EDITOR.NEW as string}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium navy-blue-blog-btn"
					>
						<Plus className="w-4 h-4" />
						New Post
					</Link>
				</div>
			</header>

			<div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
				{/* Become an Author banner */}
				{isReader && !application && (
					<div className="rounded-xl border border-[hsl(199,89%,49%)]/30 bg-[hsl(199,89%,49%)]/5 p-5 flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-full bg-[hsl(199,89%,49%)]/10 border border-[hsl(199,89%,49%)]/30 flex items-center justify-center">
								<Feather className="h-5 w-5 text-[hsl(199,89%,49%)]" />
							</div>
							<div>
								<p className="text-sm font-semibold text-[hsl(216,100%,95%)]">Want to publish on this platform?</p>
								<p className="text-xs text-[hsl(217,17%,48%)] mt-0.5">Apply to become an author and share your writing with readers.</p>
							</div>
						</div>
						<Link
							to={"/dashboard/become-author" as string}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(199,89%,49%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,42%)] transition-colors whitespace-nowrap flex-shrink-0"
						>
							Apply Now <ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				)}

				{/* Pending application banner */}
				{isReader && application?.applicationStatus === "pending" && (
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3 text-sm text-amber-400">
						<Clock className="h-4 w-4 flex-shrink-0" />
						<span>
							Your author application is <strong>pending review</strong>. We'll notify you once a decision is made.
						</span>
					</div>
				)}

				{/* Stats row */}
				<div className="grid grid-cols-3 gap-4">
					{[
						{ label: "Total Posts", value: allPosts.length, icon: FileText, color: "text-[hsl(199,89%,49%)]" },
						{ label: "Published", value: published.length, icon: Eye, color: "text-emerald-400" },
						{ label: "In Review", value: inReview.length, icon: Clock, color: "text-amber-400" },
					].map((stat) => (
						<div
							key={stat.label}
							className="p-5 rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)]"
						>
							<stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
							<div className="text-2xl font-bold text-[hsl(216,100%,95%)]">{stat.value}</div>
							<p className="text-xs text-[hsl(217,17%,48%)] mt-0.5">{stat.label}</p>
						</div>
					))}
				</div>

				{/* Quick actions */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{[
						{ label: "New Post", desc: "Start writing", icon: BookOpen, to: ROUTES.EDITOR.NEW as string },
						{ label: "My Assets", desc: "Files & images", icon: HardDrive, to: ROUTES.DASHBOARD_ASSETS as string },
						{ label: "View Blog", desc: "See your work live", icon: Eye, to: "/" as string },
						{ label: "My Profile", desc: "Edit author profile", icon: User, to: ROUTES.ACCOUNT.BASE as string },
					].map((action) => (
						<Link
							key={action.label}
							to={action.to}
							className="p-4 rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] hover:border-[hsl(199,89%,49%)]/40 hover:bg-[hsl(222,44%,15%)] transition-colors group"
						>
							<action.icon className="w-5 h-5 text-[hsl(199,89%,49%)] mb-2" />
							<p className="text-sm font-medium text-[hsl(216,100%,95%)]">{action.label}</p>
							<p className="text-xs text-[hsl(217,17%,48%)] mt-0.5">{action.desc}</p>
						</Link>
					))}
				</div>

				{/* Recent posts */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-sm font-semibold text-[hsl(216,100%,95%)]">Recent Posts</h2>
						<Link
							to={"/admin/blog/posts" as string}
							className="text-xs text-[hsl(199,89%,49%)] hover:underline flex items-center gap-1"
						>
							View all <ArrowRight className="h-3 w-3" />
						</Link>
					</div>

					{postsQuery.isLoading ? (
						<p className="text-sm text-[hsl(217,17%,48%)] py-8 text-center">Loading posts…</p>
					) : allPosts.length === 0 ? (
						<div className="text-center py-12 rounded-xl border border-dashed border-[hsl(216,33%,20%)]">
							<FileText className="w-8 h-8 text-[hsl(217,17%,35%)] mx-auto mb-3" />
							<p className="text-sm text-[hsl(217,17%,48%)]">No posts yet</p>
							<Link
								to={ROUTES.EDITOR.NEW as string}
								className="mt-3 inline-flex items-center gap-2 text-xs text-[hsl(199,89%,49%)] hover:underline"
							>
								<Plus className="h-3 w-3" /> Write your first post
							</Link>
						</div>
					) : (
						<div className="space-y-2">
							{allPosts.slice(0, 8).map((post: any) => (
								<div
									key={post.id}
									className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] hover:border-[hsl(216,33%,28%)] transition-colors"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[hsl(216,100%,95%)] truncate">
											{post.title || "Untitled"}
										</p>
										<p className="text-xs text-[hsl(217,17%,48%)] mt-0.5">
											{formatDate(post.updatedAt ?? post.createdAt)}
										</p>
									</div>
									<span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${statusColor[post.status] ?? ""}`}>
										{post.status}
									</span>
									<Link
										to={`/admin/blog/posts/${post.id}/edit` as string}
										className="p-1.5 rounded-md text-[hsl(217,17%,48%)] hover:text-[hsl(199,89%,49%)] hover:bg-[hsl(216,33%,20%)] transition-colors"
									>
										<Edit className="h-3.5 w-3.5" />
									</Link>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Drafts count */}
				{drafts.length > 0 && (
					<p className="text-xs text-[hsl(217,17%,48%)] text-center">
						{drafts.length} draft{drafts.length > 1 ? "s" : ""} waiting to be finished
					</p>
				)}
			</div>
		</div>
	);
}
