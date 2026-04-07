import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, Clock, Edit, Eye, Loader2, Plus } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Badge } from "@/components/ui/badge";
import { useAdminPosts } from "@/lib/blog/queries";
import { ROLES, ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/dashboard/calendar")({
	beforeLoad: ({ context }) => {
		const role = context.user?.user?.role;
		const allowed = [ROLES.AUTHOR, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
		if (!role || !allowed.includes(role as any)) {
			throw redirect({ to: ROUTES.DASHBOARD as string, replace: true });
		}
	},
	component: CalendarPage,
});

function formatDateTime(val: string | Date | null | undefined) {
	if (!val) return "—";
	const d = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDate(val: string | Date | null | undefined) {
	if (!val) return "—";
	const d = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CalendarPage() {
	const scheduledQuery = useAdminPosts({ status: "scheduled", limit: 50 });
	const publishedQuery = useAdminPosts({ status: "published", limit: 20 });

	const scheduled = scheduledQuery.data?.ok ? scheduledQuery.data.data.items : [];
	const published = publishedQuery.data?.ok ? publishedQuery.data.data.items : [];

	const isLoading = scheduledQuery.isLoading || publishedQuery.isLoading;

	return (
		<PageContainer
			title="Calendar"
			description="Scheduled and recently published posts."
		>
			<div className="space-y-8">
				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<Loader2 className="w-5 h-5 animate-spin text-[var(--text-wild-blue-yonder)]" />
					</div>
				) : (
					<>
						{/* Upcoming / Scheduled */}
						<section>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<Clock className="w-4 h-4 text-blue-400" />
									<h2 className="text-sm font-semibold text-[var(--text-alice-blue)]">
										Upcoming
									</h2>
									{scheduled.length > 0 && (
										<span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
											{scheduled.length}
										</span>
									)}
								</div>
								<Link
									to={ROUTES.EDITOR.NEW as string}
									className="flex items-center gap-1.5 text-xs text-[var(--bg-carolina-blue)] hover:underline"
								>
									<Plus className="w-3 h-3" /> New post
								</Link>
							</div>

							{scheduled.length === 0 ? (
								<div className="rounded-xl border border-dashed border-[var(--bg-prussian-blue)] py-10 flex flex-col items-center gap-2 text-center">
									<CalendarDays className="w-8 h-8 text-[var(--bg-prussian-blue-dark)]" />
									<p className="text-sm text-[var(--text-slate-gray)]">No scheduled posts</p>
									<p className="text-xs text-[var(--text-slate-gray)] opacity-60">
										Set a publish date in the editor to schedule a post
									</p>
								</div>
							) : (
								<div className="rounded-xl border border-[var(--bg-prussian-blue)] overflow-hidden divide-y divide-[var(--bg-prussian-blue)]">
									{scheduled
										.slice()
										.sort((a, b) => {
											const da = (a as any).scheduledAt ? new Date((a as any).scheduledAt).getTime() : 0;
											const db2 = (b as any).scheduledAt ? new Date((b as any).scheduledAt).getTime() : 0;
											return da - db2;
										})
										.map((post: any) => (
											<div
												key={post.id}
												className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-oxford-blue)] hover:bg-[var(--bg-prussian-blue)]/30 transition-colors"
											>
												<Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] shrink-0">
													Scheduled
												</Badge>
												<span className="text-xs text-[var(--text-slate-gray)] shrink-0 w-36">
													{formatDateTime((post as any).scheduledAt)}
												</span>
												<p className="flex-1 text-sm text-[var(--text-alice-blue)] truncate">
													{post.title || "Untitled"}
												</p>
												<Link
													to={ROUTES.ADMIN.BLOG.POST_EDIT(post.id) as string}
													className="p-1.5 rounded hover:bg-[var(--bg-prussian-blue)] transition-colors shrink-0"
													title="Edit"
												>
													<Edit className="w-3.5 h-3.5 text-[var(--text-slate-gray)]" />
												</Link>
											</div>
										))}
								</div>
							)}
						</section>

						{/* Recently Published */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<Eye className="w-4 h-4 text-emerald-400" />
								<h2 className="text-sm font-semibold text-[var(--text-alice-blue)]">
									Recently Published
								</h2>
							</div>

							{published.length === 0 ? (
								<div className="rounded-xl border border-dashed border-[var(--bg-prussian-blue)] py-10 flex flex-col items-center gap-2 text-center">
									<Eye className="w-8 h-8 text-[var(--bg-prussian-blue-dark)]" />
									<p className="text-sm text-[var(--text-slate-gray)]">No published posts yet</p>
								</div>
							) : (
								<div className="rounded-xl border border-[var(--bg-prussian-blue)] overflow-hidden divide-y divide-[var(--bg-prussian-blue)]">
									{published.map((post: any) => (
										<div
											key={post.id}
											className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-oxford-blue)] hover:bg-[var(--bg-prussian-blue)]/30 transition-colors"
										>
											<Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
												Published
											</Badge>
											<span className="text-xs text-[var(--text-slate-gray)] shrink-0 w-36">
												{formatDate(post.publishedAt)}
											</span>
											<p className="flex-1 text-sm text-[var(--text-alice-blue)] truncate">
												{post.title || "Untitled"}
											</p>
											<Link
												to={"/$slug" as string}
												params={{ slug: post.slug } as any}
												target="_blank"
												className="p-1.5 rounded hover:bg-[var(--bg-prussian-blue)] transition-colors shrink-0"
												title="View live"
											>
												<Eye className="w-3.5 h-3.5 text-[var(--text-slate-gray)]" />
											</Link>
										</div>
									))}
								</div>
							)}
						</section>
					</>
				)}
			</div>
		</PageContainer>
	);
}
