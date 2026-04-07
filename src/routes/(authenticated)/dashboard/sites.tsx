import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Plus, Key, ExternalLink, Calendar, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $listSites, $createSite } from "@/lib/blog/functions";
import { toast } from "sonner";
import { useSession, useActiveOrganization } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/(authenticated)/dashboard/sites")({
	component: DashboardSitesPage,
});

function DashboardSitesPage() {
	const { data: session } = useSession();
	const { data: activeOrg } = useActiveOrganization();
	const queryClient = useQueryClient();

	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [subdomain, setSubdomain] = useState("");

	const { data: result, isLoading } = useQuery({
		queryKey: ["dashboard-sites"],
		queryFn: () => $listSites(),
	});

	const sites = result?.ok ? result.data : [];

	const createMutation = useMutation({
		mutationFn: (input: { name: string; subdomain?: string }) =>
			$createSite({ data: input }),
		onSuccess: (res) => {
			if (!res?.ok) {
				toast.error((res as any)?.error?.message ?? "Failed to create site");
				return;
			}
			toast.success(`${name} is ready.`);
			queryClient.invalidateQueries({ queryKey: ["dashboard-sites"] });
			setCreateOpen(false);
			setName("");
			setSubdomain("");
		},
		onError: () => toast.error("Failed to create site"),
	});

	const planLimit = (session?.user as any)?.planSitesLimit ?? 0;
	const atLimit = !["admin", "superAdmin"].includes((session?.user as any)?.role) && sites.length >= planLimit;
	const activeOrgName = activeOrg?.name;

	return (
		<PageContainer>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">My Sites</h1>
						<p className="text-muted-foreground">
							Manage your headless CMS sites, API keys, and webhooks.
						</p>
					</div>

					<Dialog open={createOpen} onOpenChange={setCreateOpen}>
						<DialogTrigger render={<Button disabled={atLimit} />}>
							<Plus className="mr-2 h-4 w-4" />
							New Site
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create a new site</DialogTitle>
								<DialogDescription>
									Your site will have a unique API key you can use to pull content.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-2">
								<div className="space-y-2">
									<Label htmlFor="site-name">Site name *</Label>
									<Input
										id="site-name"
										placeholder="My Blog"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="site-subdomain">Subdomain (optional)</Label>
									<div className="flex items-center gap-2">
										<Input
											id="site-subdomain"
											placeholder="my-blog"
											value={subdomain}
											onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
										/>
										<span className="text-sm text-muted-foreground whitespace-nowrap">.yourcms.com</span>
									</div>
								</div>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
								<Button
									onClick={() => createMutation.mutate({ name, subdomain: subdomain || undefined })}
									disabled={!name.trim() || createMutation.isPending}
								>
									{createMutation.isPending ? "Creating…" : "Create Site"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				{activeOrgName && (
					<Card className="border-blue-500/30 bg-blue-500/5">
						<CardContent className="pt-4 pb-3">
							<p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
								<Building2 className="h-4 w-4 shrink-0" />
								Showing sites for <strong>{activeOrgName}</strong>. Switch your active organization to view personal sites.
							</p>
						</CardContent>
					</Card>
				)}

				{atLimit && (
					<Card className="border-amber-500/30 bg-amber-500/5">
						<CardContent className="pt-4">
							<p className="text-sm text-amber-600 dark:text-amber-400">
								You've reached your site limit ({planLimit}). <Link to={"/billing" as string} className="underline font-medium">Upgrade your plan</Link> to add more sites.
							</p>
						</CardContent>
					</Card>
				)}

				{isLoading ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader><div className="h-5 bg-muted rounded w-2/3" /></CardHeader>
								<CardContent><div className="h-4 bg-muted rounded w-1/2" /></CardContent>
							</Card>
						))}
					</div>
				) : sites.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<Globe className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="font-semibold text-lg">No sites yet</h3>
							<p className="text-muted-foreground text-sm mt-1 mb-4 max-w-xs">
								Create a site to get your API key and start pulling content into your external website.
							</p>
							<Button onClick={() => setCreateOpen(true)} disabled={atLimit}>
								<Plus className="mr-2 h-4 w-4" /> Create your first site
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{sites.map((site) => (
							<Card key={site.id} className="flex flex-col">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<CardTitle className="text-base truncate">{site.name}</CardTitle>
											{site.subdomain && (
												<CardDescription className="text-xs flex items-center gap-1 mt-0.5">
													<ExternalLink className="h-3 w-3 shrink-0" />
													{site.subdomain}.yourcms.com
												</CardDescription>
											)}
										</div>
										<div className="flex gap-1 shrink-0">
											<Badge variant={site.status === "active" ? "default" : "secondary"} className="text-xs">
												{site.status}
											</Badge>
											{(site as any).grantedByAdmin && (
												<Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600">
													Gifted
												</Badge>
											)}
										</div>
									</div>
								</CardHeader>
								<CardContent className="flex-1 flex flex-col justify-between gap-4">
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											{new Date(site.createdAt).toLocaleDateString()}
										</span>
									</div>
									<div className="flex gap-2">
										<Link to={`/dashboard/sites/${site.id}` as string} className="flex-1">
											<Button variant="outline" size="sm" className="w-full gap-1">
												<Key className="h-3.5 w-3.5" /> Manage
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</PageContainer>
	);
}
