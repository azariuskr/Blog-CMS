import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Globe, MoreHorizontal, ExternalLink, Settings, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/(authenticated)/admin/blog/sites")({
	component: AdminSitesPage,
});

type SiteStatus = "active" | "pending" | "suspended";

const MOCK_SITES = [
	{
		id: "1",
		name: "Tech Insights",
		subdomain: "tech-insights",
		customDomain: "techinsights.blog",
		domainStatus: "active" as SiteStatus,
		status: "active" as SiteStatus,
		postCount: 64,
		owner: { name: "John Doe", username: "johndoe" },
		plan: "Pro",
		createdAt: "Jan 15, 2024",
		logo: null as string | null,
	},
	{
		id: "2",
		name: "Design Digest",
		subdomain: "design-digest",
		customDomain: null as string | null,
		domainStatus: "active" as SiteStatus,
		status: "active" as SiteStatus,
		postCount: 31,
		owner: { name: "Sarah Kim", username: "sarahkim" },
		plan: "Starter",
		createdAt: "Feb 3, 2024",
		logo: null as string | null,
	},
	{
		id: "3",
		name: "Dev Notes",
		subdomain: "dev-notes",
		customDomain: "devnotes.io",
		domainStatus: "pending" as SiteStatus,
		status: "active" as SiteStatus,
		postCount: 18,
		owner: { name: "Mike Johnson", username: "mikej" },
		plan: "Pro",
		createdAt: "Mar 18, 2024",
		logo: null as string | null,
	},
	{
		id: "4",
		name: "Suspended Blog",
		subdomain: "suspended-blog",
		customDomain: null as string | null,
		domainStatus: "active" as SiteStatus,
		status: "suspended" as SiteStatus,
		postCount: 5,
		owner: { name: "Diana Prince", username: "diana_p" },
		plan: "Starter",
		createdAt: "Apr 22, 2024",
		logo: null as string | null,
	},
];

const siteStatusConfig: Record<SiteStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
	active: { label: "Active", variant: "default", icon: CheckCircle2 },
	pending: { label: "Pending", variant: "outline", icon: Clock },
	suspended: { label: "Suspended", variant: "destructive", icon: AlertCircle },
};

const domainStatusConfig: Record<SiteStatus, { label: string; color: string }> = {
	active: { label: "Verified", color: "text-green-500" },
	pending: { label: "Pending DNS", color: "text-amber-500" },
	suspended: { label: "Error", color: "text-red-500" },
};

function AdminSitesPage() {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [newSite, setNewSite] = useState({ name: "", subdomain: "" });

	const filtered = MOCK_SITES.filter(
		(s) =>
			s.name.toLowerCase().includes(search.toLowerCase()) ||
			s.subdomain.toLowerCase().includes(search.toLowerCase()) ||
			s.owner.name.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<PageContainer title="Sites" description="Manage all tenant-owned blog sites on this platform.">
			<div className="flex items-center justify-between gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search sites…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={() => setDialogOpen(true)} className="gap-2">
					<Plus className="w-4 h-4" />
					New Site
				</Button>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[
					{ label: "Total Sites", value: MOCK_SITES.length },
					{ label: "Active", value: MOCK_SITES.filter((s) => s.status === "active").length },
					{ label: "Custom Domains", value: MOCK_SITES.filter((s) => s.customDomain).length },
					{ label: "Suspended", value: MOCK_SITES.filter((s) => s.status === "suspended").length },
				].map(({ label, value }) => (
					<Card key={label}>
						<CardContent className="pt-4">
							<div className="text-2xl font-bold">{value}</div>
							<p className="text-xs text-muted-foreground">{label}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Sites grid */}
			<div className="grid md:grid-cols-2 gap-4">
				{filtered.length === 0 && (
					<div className="md:col-span-2 rounded-lg border bg-card flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
						<Globe className="w-10 h-10 opacity-40" />
						<p>No sites found</p>
					</div>
				)}
				{filtered.map((site) => {
					const { label: statusLabel, variant: statusVariant, icon: StatusIcon } = siteStatusConfig[site.status];
					const domCfg = domainStatusConfig[site.domainStatus];
					return (
						<Card key={site.id} className="relative">
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center border">
											<Globe className="w-5 h-5 text-primary" />
										</div>
										<div>
											<CardTitle className="text-base">{site.name}</CardTitle>
											<CardDescription className="text-xs font-mono">
												{site.subdomain}.blogcms.app
											</CardDescription>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={statusVariant} className="gap-1 text-xs">
											<StatusIcon className="w-3 h-3" />
											{statusLabel}
										</Badge>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem className="gap-2">
													<ExternalLink className="w-4 h-4" /> Visit Site
												</DropdownMenuItem>
												<DropdownMenuItem className="gap-2">
													<Settings className="w-4 h-4" /> Settings
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
													<Trash2 className="w-4 h-4" /> Delete Site
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<p className="text-xs text-muted-foreground mb-0.5">Owner</p>
										<p className="font-medium">@{site.owner.username}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground mb-0.5">Plan</p>
										<p className="font-medium">{site.plan}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground mb-0.5">Posts</p>
										<p className="font-medium">{site.postCount}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground mb-0.5">Created</p>
										<p className="font-medium">{site.createdAt}</p>
									</div>
								</div>
								{site.customDomain && (
									<div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
										<div className="flex items-center gap-1.5">
											<Globe className="w-3.5 h-3.5 text-muted-foreground" />
											<span className="font-mono">{site.customDomain}</span>
										</div>
										<span className={`font-medium ${domCfg.color}`}>{domCfg.label}</span>
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* New Site Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Site</DialogTitle>
						<DialogDescription>Set up a new blog site for a tenant or author.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="site-name">Site Name</Label>
							<Input
								id="site-name"
								value={newSite.name}
								onChange={(e) => {
									const name = e.target.value;
									setNewSite((s) => ({
										...s,
										name,
										subdomain: s.subdomain || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
									}));
								}}
								placeholder="Tech Insights"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="site-subdomain">Subdomain</Label>
							<div className="flex items-center gap-0">
								<Input
									id="site-subdomain"
									value={newSite.subdomain}
									onChange={(e) => setNewSite((s) => ({ ...s, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
									placeholder="tech-insights"
									className="rounded-r-none font-mono"
								/>
								<span className="inline-flex items-center h-9 px-3 rounded-r-md border border-l-0 bg-muted text-sm text-muted-foreground whitespace-nowrap">
									.blogcms.app
								</span>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={() => setDialogOpen(false)} disabled={!newSite.name || !newSite.subdomain}>
							Create Site
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
