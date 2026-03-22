import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CreditCard,
	Database,
	FileText,
	LayoutDashboard,
	Settings,
	Users,
} from "lucide-react";
import { useDashboardUserStats } from "@/lib/auth/queries";
import { ROUTES } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/admin/app-layout";

export const Route = createFileRoute("/(authenticated)/admin/")({
	component: AdminDashboardPage,
});

function AdminDashboardPage() {
	const { data: userStatsData, isLoading: userStatsLoading } = useDashboardUserStats();
	const userStats = userStatsData?.ok ? userStatsData.data : null;

	const modules = [
		{
			label: "Users",
			description: "Manage accounts & roles",
			icon: Users,
			to: ROUTES.ADMIN.USERS,
			color: "bg-blue-50 text-blue-600",
		},
		{
			label: "Billing",
			description: "Subscriptions & payments",
			icon: CreditCard,
			to: ROUTES.ADMIN.BILLING,
			color: "bg-emerald-50 text-emerald-600",
		},
		{
			label: "Storage",
			description: "Files & media",
			icon: Database,
			to: ROUTES.ADMIN.STORAGE,
			color: "bg-violet-50 text-violet-600",
		},
		{
			label: "Blog",
			description: "Posts, authors & sites",
			icon: FileText,
			to: ROUTES.ADMIN.BLOG.BASE,
			color: "bg-amber-50 text-amber-600",
		},
		{
			label: "Roles & Permissions",
			description: "Access control",
			icon: Settings,
			to: ROUTES.ADMIN.RBAC.BASE,
			color: "bg-rose-50 text-rose-600",
		},
	] as const;

	return (
		<PageContainer
			title="Dashboard"
			description="Welcome to your admin panel."
		>
			{/* User stats */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{userStatsLoading ? "..." : (userStats?.totalUsers ?? 0)}
						</div>
						<p className="text-xs text-muted-foreground">
							{userStats?.activeCount ?? 0} active
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Admins</CardTitle>
						<Settings className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{userStatsLoading ? "..." : (userStats?.adminCount ?? 0)}
						</div>
						<p className="text-xs text-muted-foreground">With admin access</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Banned</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{userStatsLoading ? "..." : ((userStats as any)?.bannedCount ?? 0)}
						</div>
						<p className="text-xs text-muted-foreground">Suspended accounts</p>
					</CardContent>
				</Card>

				<Card className="border-dashed">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Your Metric</CardTitle>
						<LayoutDashboard className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-muted-foreground">—</div>
						<p className="text-xs text-muted-foreground">Add project-specific stats here</p>
					</CardContent>
				</Card>
			</div>

			{/* Module quick links */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight">Installed Modules</h2>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{modules.map((mod) => (
						<Link
							key={mod.label}
							to={mod.to as string}
							className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
						>
							<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mod.color}`}>
								<mod.icon className="h-5 w-5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">{mod.label}</p>
								<p className="text-xs text-muted-foreground truncate">{mod.description}</p>
							</div>
							<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
						</Link>
					))}

					<div className="flex items-center gap-4 rounded-lg border border-dashed bg-card/50 p-4">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
							<LayoutDashboard className="h-5 w-5 text-muted-foreground" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-muted-foreground">Your Module</p>
							<p className="text-xs text-muted-foreground">Add project-specific sections here</p>
						</div>
					</div>
				</div>
			</div>

			{/* Project-specific widgets placeholder */}
			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base text-muted-foreground">Project Widgets</CardTitle>
					<CardDescription>
						Replace this section with domain-specific data visualizations, recent activity feeds,
						or any other widgets relevant to your project.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-32 items-center justify-center rounded-lg bg-muted/30">
						<p className="text-sm text-muted-foreground">
							Add charts, tables, or feeds here
						</p>
					</div>
				</CardContent>
			</Card>
		</PageContainer>
	);
}
