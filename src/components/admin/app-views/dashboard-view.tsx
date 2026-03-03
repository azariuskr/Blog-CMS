import { Link } from "@tanstack/react-router";
import { Activity, Clock, Shield, Users } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS, ROUTES } from "@/constants";
import { useDashboardUserStats, useRoleInfo } from "@/lib/auth/queries";

export function DashboardView() {
	const { data: statsResult, isLoading: statsLoading } =
		useDashboardUserStats();
	const { data: roleInfo } = useRoleInfo();

	const stats = statsResult?.ok ? statsResult.data : null;

	return (
		<PageContainer title="Dashboard" description="Overview of your application">
			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Users"
					value={statsLoading ? "..." : String(stats?.totalUsers ?? 0)}
					description="Registered users"
					icon={Users}
					href={ROUTES.ADMIN.USERS}
				/>
				<StatsCard
					title="Administrators"
					value={statsLoading ? "..." : String(stats?.adminCount ?? 0)}
					description="Admin & Super Admin"
					icon={Shield}
				/>
				<StatsCard
					title="Active Users"
					value={statsLoading ? "..." : String(stats?.activeCount ?? 0)}
					description="Non-banned users"
					icon={Activity}
				/>
				<StatsCard
					title="Your Role"
					value={
						roleInfo?.role
							? ROLE_LABELS[roleInfo.role as keyof typeof ROLE_LABELS]
							: "..."
					}
					description="Current permissions"
					icon={Clock}
				/>
			</div>

			{/* Quick Actions */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<QuickActionCard
					title="User Management"
					description="View, create, and manage users"
					href={ROUTES.ADMIN.USERS}
					icon={Users}
				/>
				<QuickActionCard
					title="Account Settings"
					description="Manage your profile and security"
					href={ROUTES.ACCOUNT.SETTINGS}
					icon={Shield}
				/>
				<QuickActionCard
					title="Session Management"
					description="View and manage your sessions"
					href={ROUTES.ACCOUNT.SESSIONS}
					icon={Activity}
				/>
			</div>

			{/* Recent Users */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Users</CardTitle>
					<CardDescription>
						Latest registered users in the system
					</CardDescription>
				</CardHeader>
				<CardContent>
					{statsLoading ? (
						<div className="text-muted-foreground">Loading users...</div>
					) : !stats?.recentUsers?.length ? (
						<div className="text-muted-foreground">No users found</div>
					) : (
						<div className="space-y-4">
							{stats.recentUsers.map(
								(user: {
									id: string;
									name?: string;
									email: string;
									role?: string;
									createdAt?: Date | string;
								}) => (
									<div
										key={user.id}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
												{user.name?.charAt(0).toUpperCase() ??
													user.email.charAt(0).toUpperCase()}
											</div>
											<div>
												<div className="font-medium">
													{user.name ?? "Unnamed"}
												</div>
												<div className="text-sm text-muted-foreground">
													{user.email}
												</div>
											</div>
										</div>
										<div className="text-sm text-muted-foreground">
											{user.role
												? (ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ??
													user.role)
												: "user"}
										</div>
									</div>
								),
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</PageContainer>
	);
}

interface StatsCardProps {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	href?: string;
}

function StatsCard({
	title,
	value,
	description,
	icon: Icon,
	href,
}: StatsCardProps) {
	const content = (
		<Card
			className={
				href ? "cursor-pointer transition-colors hover:bg-muted/50" : ""
			}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);

	if (href) {
		return <Link to={href}>{content}</Link>;
	}

	return content;
}

interface QuickActionCardProps {
	title: string;
	description: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
}

function QuickActionCard({
	title,
	description,
	href,
	icon: Icon,
}: QuickActionCardProps) {
	return (
		<Link to={href}>
			<Card className="cursor-pointer transition-colors hover:bg-muted/50">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Icon className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-lg">{title}</CardTitle>
					</div>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
			</Card>
		</Link>
	);
}
