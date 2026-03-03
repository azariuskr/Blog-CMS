import {
	Check,
	ChevronDown,
	Lock,
	Route as RouteIcon,
	Shield,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AppRole, ROLE_HIERARCHY, ROLE_LABELS } from "@/constants";
import {
	canAccessRoute,
	ROLE_GRANTS,
	routeConfig,
	statements,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

function AccessIcon({ allowed }: { allowed: boolean }) {
	return allowed ? (
		<Check className="h-4 w-4 text-emerald-500" />
	) : (
		<X className="h-4 w-4 text-muted-foreground" />
	);
}

function MinRoleBadge({ minRole }: { minRole?: AppRole }) {
	if (!minRole) return null;
	return (
		<Badge variant="secondary" className="whitespace-nowrap">
			minRole: {ROLE_LABELS[minRole]}
		</Badge>
	);
}

function PermissionsBadge({
	permissions,
}: {
	permissions?: Record<string, string[]>;
}) {
	if (!permissions) return null;

	const parts = Object.entries(permissions).flatMap(([resource, actions]) =>
		actions.map((a) => `${resource}:${a}`),
	);

	return (
		<Badge variant="outline" className="whitespace-nowrap">
			{parts.join(", ")}
		</Badge>
	);
}

function isProtectedRoute(config: (typeof routeConfig)[string]) {
	return Boolean(config?.minRole || config?.permissions);
}

export function RbacView() {
	const [routeSearch, setRouteSearch] = useState("");
	const [permissionSearch, setPermissionSearch] = useState("");
	const [protectedOnly, setProtectedOnly] = useState(true);

	const roles = ROLE_HIERARCHY;

	const routes = useMemo(() => {
		const q = routeSearch.trim().toLowerCase();
		return Object.entries(routeConfig)
			.map(([path, cfg]) => ({ path, cfg }))
			.filter(({ path, cfg }) => {
				if (protectedOnly && !isProtectedRoute(cfg)) return false;
				if (!q) return true;
				return (
					path.toLowerCase().includes(q) ||
					cfg.title.toLowerCase().includes(q) ||
					(cfg.description ?? "").toLowerCase().includes(q)
				);
			})
			.sort((a, b) => a.path.localeCompare(b.path));
	}, [protectedOnly, routeSearch]);

	const permissionRows = useMemo(() => {
		const q = permissionSearch.trim().toLowerCase();
		const resources = Object.keys(statements).sort();
		return resources
			.filter((resource) => (q ? resource.toLowerCase().includes(q) : true))
			.map((resource) => ({
				resource,
				actions: [...statements[resource as keyof typeof statements]].sort(),
			}));
	}, [permissionSearch]);

	const summary = useMemo(() => {
		const routeEntries = Object.entries(routeConfig);
		const protectedCount = routeEntries.filter(([, cfg]) =>
			isProtectedRoute(cfg),
		).length;
		const roleSummaries = roles.map((role) => {
			const allowedCount = routeEntries.filter(([path]) =>
				canAccessRoute(path, role),
			).length;
			return { role, allowedCount };
		});
		return { protectedCount, totalCount: routeEntries.length, roleSummaries };
	}, [roles]);

	return (
		<PageContainer
			title="RBAC"
			description="Read-only view of roles, permissions, and route access."
		>
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Protected Routes
						</CardTitle>
						<RouteIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{summary.protectedCount}</div>
						<p className="text-xs text-muted-foreground">
							out of {summary.totalCount} configured routes
						</p>
					</CardContent>
				</Card>

				<Card className="md:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Access By Role
						</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{summary.roleSummaries.map((r) => (
							<div key={r.role} className="rounded-md border p-3">
								<div className="text-xs text-muted-foreground">
									{ROLE_LABELS[r.role]}
								</div>
								<div className="text-lg font-semibold">{r.allowedCount}</div>
								<div className="text-xs text-muted-foreground">
									routes allowed
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="routes" className="w-full">
				<TabsList>
					<TabsTrigger value="routes">Routes</TabsTrigger>
					<TabsTrigger value="permissions">Permissions</TabsTrigger>
				</TabsList>

				<TabsContent value="routes" className="space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							value={routeSearch}
							onChange={(e) => setRouteSearch(e.target.value)}
							placeholder="Search routes…"
							className="sm:max-w-sm"
						/>
						<button
							type="button"
							onClick={() => setProtectedOnly((v) => !v)}
							className={cn(
								"inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
								protectedOnly
									? "bg-muted/50 text-foreground"
									: "bg-background text-muted-foreground",
							)}
						>
							<RouteIcon className="h-4 w-4" />
							Protected only
						</button>
					</div>

					<Card className="overflow-hidden">
						<CardHeader className="border-b">
							<CardTitle className="text-base">Route Access Matrix</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<div className="w-full overflow-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-96">Route</TableHead>
											{roles.map((role) => (
												<TableHead key={role} className="whitespace-nowrap">
													{ROLE_LABELS[role]}
												</TableHead>
											))}
										</TableRow>
									</TableHeader>
									<TableBody>
										{routes.map(({ path, cfg }) => (
											<TableRow key={path}>
												<TableCell>
													<div className="flex flex-col gap-1">
														<div className="font-medium">{cfg.title}</div>
														<div className="text-xs text-muted-foreground">
															<code className="rounded bg-muted px-1 py-0.5">
																{path}
															</code>
														</div>
														<div className="flex flex-wrap gap-2">
															<MinRoleBadge minRole={cfg.minRole} />
															<PermissionsBadge permissions={cfg.permissions} />
															{cfg.showInNav ? (
																<Badge variant="secondary">nav</Badge>
															) : null}
														</div>
													</div>
												</TableCell>
												{roles.map((role) => (
													<TableCell key={role} className="text-center">
														<AccessIcon allowed={canAccessRoute(path, role)} />
													</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="permissions" className="space-y-4">
					<Input
						value={permissionSearch}
						onChange={(e) => setPermissionSearch(e.target.value)}
						placeholder="Search resources…"
						className="sm:max-w-sm"
					/>

					<div className="grid gap-3">
						{permissionRows.map(({ resource, actions }) => (
							<Collapsible key={resource} defaultOpen={resource === "users"}>
								<Card className="overflow-hidden">
									<CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
										<div className="flex items-center gap-3">
											<Lock className="h-4 w-4 text-muted-foreground" />
											<div>
												<div className="font-medium">{resource}</div>
												<div className="text-xs text-muted-foreground">
													{actions.length} actions
												</div>
											</div>
										</div>
										<ChevronDown className="h-4 w-4 text-muted-foreground" />
									</CollapsibleTrigger>

									<CollapsibleContent className="border-t">
										<div className="w-full overflow-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead className="min-w-56">Action</TableHead>
														{roles.map((role) => (
															<TableHead
																key={role}
																className="whitespace-nowrap"
															>
																{ROLE_LABELS[role]}
															</TableHead>
														))}
													</TableRow>
												</TableHeader>
												<TableBody>
													{actions.map((action) => (
														<TableRow key={action}>
															<TableCell className="font-medium">
																{action}
															</TableCell>
															{roles.map((role) => {
																const grants =
																	(
																		ROLE_GRANTS[role] as Record<
																			string,
																			readonly string[]
																		>
																	)[resource] ?? [];
																return (
																	<TableCell key={role} className="text-center">
																		<AccessIcon
																			allowed={grants.includes(action)}
																		/>
																	</TableCell>
																);
															})}
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</CollapsibleContent>
								</Card>
							</Collapsible>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}
