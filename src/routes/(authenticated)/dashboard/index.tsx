import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, FileText, Eye, Clock, BookOpen, User, ArrowRight, Edit, HardDrive, Feather, BookMarked, ListMusic, Compass } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { useAdminPosts, useMyAuthorApplication, useMyReadingLists } from "@/lib/blog/queries";
import { ROUTES, ROLES } from "@/constants";
import { useRole } from "@/hooks/auth-hooks";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
	component: DashboardRouter,
});

function DashboardRouter() {
	const role = useRole();

	// Admins and above go directly to the admin panel — no dashboard needed
	if (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN || role === ROLES.MODERATOR) {
		return <AdminRedirect />;
	}

	if (role === ROLES.AUTHOR) {
		return <AuthorDashboard />;
	}

	return <ReaderDashboard />;
}

// ---------------------------------------------------------------------------
// Admin redirect shim (renders nothing, navigates immediately)
// ---------------------------------------------------------------------------

function AdminRedirect() {
	// Use a useEffect-based redirect so it works inside the component tree
	if (typeof window !== "undefined") {
		window.location.replace(ROUTES.ADMIN.BLOG.BASE);
	}
	return null;
}

// ---------------------------------------------------------------------------
// Author Dashboard
// ---------------------------------------------------------------------------

function AuthorDashboard() {
	const { data: session } = useSession();
	const userName = session?.user?.name ?? "Author";

	const postsQuery = useAdminPosts({ limit: 20 });
	const allPosts = postsQuery.data?.ok ? postsQuery.data.data.items : [];

	const published = allPosts.filter((p: any) => p.status === "published");
	const drafts = allPosts.filter((p: any) => p.status === "draft");
	const inReview = allPosts.filter((p: any) => p.status === "review");

	function formatDate(val: string | Date | null | undefined) {
		if (!val) return "—";
		return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	}

	const statusColor: Record<string, string> = {
		published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
		draft: "bg-[var(--bg-prussian-blue)] text-[var(--text-wild-blue-yonder)] border-[var(--bg-prussian-blue-dark)]",
		review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
		scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
		archived: "bg-red-500/20 text-red-400 border-red-500/30",
	};

	return (
		<div className="min-h-screen bg-[var(--bg-oxford-blue-2)] text-[var(--text-shadow-blue)]">
			<header className="border-b border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] px-6 py-4">
				<div className="max-w-4xl mx-auto flex items-center justify-between">
					<div>
						<h1 className="text-xl font-bold text-[var(--text-alice-blue)]">
							Welcome back, {userName.split(" ")[0]}
						</h1>
						<p className="text-sm text-[var(--text-slate-gray)] mt-0.5">Your author workspace</p>
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
				{/* Stats */}
				<div className="grid grid-cols-3 gap-4">
					{[
						{ label: "Total Posts", value: allPosts.length, icon: FileText, color: "text-[var(--bg-carolina-blue)]" },
						{ label: "Published", value: published.length, icon: Eye, color: "text-emerald-400" },
						{ label: "In Review", value: inReview.length, icon: Clock, color: "text-amber-400" },
					].map((stat) => (
						<div
							key={stat.label}
							className="p-5 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)]"
						>
							<stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
							<div className="text-2xl font-bold text-[var(--text-alice-blue)]">{stat.value}</div>
							<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">{stat.label}</p>
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
							className="p-4 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] hover:border-[var(--bg-carolina-blue)]/40 hover:bg-[var(--bg-oxford-blue-light)] transition-colors group"
						>
							<action.icon className="w-5 h-5 text-[var(--bg-carolina-blue)] mb-2" />
							<p className="text-sm font-medium text-[var(--text-alice-blue)]">{action.label}</p>
							<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">{action.desc}</p>
						</Link>
					))}
				</div>

				{/* My Posts */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-sm font-semibold text-[var(--text-alice-blue)]">My Posts</h2>
						<Link
							to={"/admin/blog/posts" as string}
							className="text-xs text-[var(--bg-carolina-blue)] hover:underline flex items-center gap-1"
						>
							View all <ArrowRight className="h-3 w-3" />
						</Link>
					</div>

					{postsQuery.isLoading ? (
						<p className="text-sm text-[var(--text-slate-gray)] py-8 text-center">Loading posts…</p>
					) : allPosts.length === 0 ? (
						<div className="text-center py-12 rounded-xl border border-dashed border-[var(--bg-prussian-blue)]">
							<FileText className="w-8 h-8 text-[var(--text-slate-darker)] mx-auto mb-3" />
							<p className="text-sm text-[var(--text-slate-gray)]">No posts yet</p>
							<Link
								to={ROUTES.EDITOR.NEW as string}
								className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--bg-carolina-blue)] hover:underline"
							>
								<Plus className="h-3 w-3" /> Write your first post
							</Link>
						</div>
					) : (
						<div className="space-y-2">
							{allPosts.slice(0, 8).map((post: any) => (
								<div
									key={post.id}
									className="flex items-center gap-4 p-4 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] hover:border-[var(--bg-prussian-blue-mid)] transition-colors"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[var(--text-alice-blue)] truncate">
											{post.title || "Untitled"}
										</p>
										<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">
											{formatDate(post.updatedAt ?? post.createdAt)}
										</p>
									</div>
									<span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${statusColor[post.status] ?? ""}`}>
										{post.status}
									</span>
									<Link
										to={`/admin/blog/posts/${post.id}/edit` as string}
										className="p-1.5 rounded-md text-[var(--text-slate-gray)] hover:text-[var(--bg-carolina-blue)] hover:bg-[var(--bg-prussian-blue)] transition-colors"
									>
										<Edit className="h-3.5 w-3.5" />
									</Link>
								</div>
							))}
						</div>
					)}
				</div>

				{drafts.length > 0 && (
					<p className="text-xs text-[var(--text-slate-gray)] text-center">
						{drafts.length} draft{drafts.length > 1 ? "s" : ""} waiting to be finished
					</p>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Reader Dashboard
// ---------------------------------------------------------------------------

function ReaderDashboard() {
	const { data: session } = useSession();
	const userName = session?.user?.name ?? "Reader";

	const applicationQuery = useMyAuthorApplication();
	const application = applicationQuery.data?.ok ? applicationQuery.data.data : null;

	const readingListsQuery = useMyReadingLists();
	const readingLists = readingListsQuery.data?.ok ? (readingListsQuery.data.data as any[]) : [];

	return (
		<div className="min-h-screen bg-[var(--bg-oxford-blue-2)] text-[var(--text-shadow-blue)]">
			<header className="border-b border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] px-6 py-4">
				<div className="max-w-4xl mx-auto flex items-center justify-between">
					<div>
						<h1 className="text-xl font-bold text-[var(--text-alice-blue)]">
							Welcome back, {userName.split(" ")[0]}
						</h1>
						<p className="text-sm text-[var(--text-slate-gray)] mt-0.5">Your reading dashboard</p>
					</div>
					<Link
						to={"/" as string}
						className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium navy-blue-blog-btn"
					>
						<Compass className="w-4 h-4" />
						Explore
					</Link>
				</div>
			</header>

			<div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
				{/* Become an Author banner */}
				{!application && (
					<div className="rounded-xl border border-[var(--bg-carolina-blue)]/30 bg-[var(--bg-carolina-blue)]/5 p-5 flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-full bg-[var(--bg-carolina-blue)]/10 border border-[var(--bg-carolina-blue)]/30 flex items-center justify-center">
								<Feather className="h-5 w-5 text-[var(--bg-carolina-blue)]" />
							</div>
							<div>
								<p className="text-sm font-semibold text-[var(--text-alice-blue)]">Want to publish on this platform?</p>
								<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">Apply to become an author and share your writing with readers.</p>
							</div>
						</div>
						<Link
							to={"/dashboard/become-author" as string}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors whitespace-nowrap flex-shrink-0"
						>
							Apply Now <ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				)}

				{/* Pending application notice */}
				{application?.applicationStatus === "pending" && (
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3 text-sm text-amber-400">
						<Clock className="h-4 w-4 flex-shrink-0" />
						<span>
							Your author application is <strong>pending review</strong>. We'll notify you once a decision is made.
						</span>
					</div>
				)}

				{/* Quick actions */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{[
						{ label: "Browse Posts", desc: "Discover new content", icon: Compass, to: "/" as string },
						{ label: "Reading Lists", desc: "Your saved collections", icon: ListMusic, to: ROUTES.ACCOUNT.READING_LISTS as string },
						{ label: "My Profile", desc: "Edit your profile", icon: User, to: ROUTES.ACCOUNT.BASE as string },
					].map((action) => (
						<Link
							key={action.label}
							to={action.to}
							className="p-4 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] hover:border-[var(--bg-carolina-blue)]/40 hover:bg-[var(--bg-oxford-blue-light)] transition-colors"
						>
							<action.icon className="w-5 h-5 text-[var(--bg-carolina-blue)] mb-2" />
							<p className="text-sm font-medium text-[var(--text-alice-blue)]">{action.label}</p>
							<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">{action.desc}</p>
						</Link>
					))}
				</div>

				{/* Reading Lists */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-sm font-semibold text-[var(--text-alice-blue)]">Reading Lists</h2>
						<Link
							to={ROUTES.ACCOUNT.READING_LISTS as string}
							className="text-xs text-[var(--bg-carolina-blue)] hover:underline flex items-center gap-1"
						>
							Manage <ArrowRight className="h-3 w-3" />
						</Link>
					</div>

					{readingListsQuery.isLoading ? (
						<p className="text-sm text-[var(--text-slate-gray)] py-8 text-center">Loading reading lists…</p>
					) : readingLists.length === 0 ? (
						<div className="text-center py-12 rounded-xl border border-dashed border-[var(--bg-prussian-blue)]">
							<BookMarked className="w-8 h-8 text-[var(--text-slate-darker)] mx-auto mb-3" />
							<p className="text-sm text-[var(--text-slate-gray)]">No reading lists yet</p>
							<p className="text-xs text-[var(--text-slate-gray)] mt-1">Save posts to reading lists to keep track of what you want to read.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{readingLists.slice(0, 4).map((list: any) => (
								<Link
									key={list.id}
									to={ROUTES.ACCOUNT.READING_LISTS as string}
									className="flex items-center gap-3 p-4 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] hover:border-[var(--bg-prussian-blue-mid)] transition-colors"
								>
									<div className="h-9 w-9 rounded-lg bg-[var(--bg-carolina-blue)]/10 border border-[var(--bg-carolina-blue)]/20 flex items-center justify-center flex-shrink-0">
										<BookMarked className="h-4 w-4 text-[var(--bg-carolina-blue)]" />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium text-[var(--text-alice-blue)] truncate">{list.name}</p>
										<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">
											{list.postCount ?? 0} post{(list.postCount ?? 0) !== 1 ? "s" : ""}
										</p>
									</div>
									<ArrowRight className="h-3.5 w-3.5 text-[var(--text-slate-gray)] ml-auto flex-shrink-0" />
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
