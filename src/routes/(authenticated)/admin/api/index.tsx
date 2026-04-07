import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, MoreHorizontal, ShieldOff, ExternalLink, Globe, ArrowRight, Info, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES, QUERY_KEYS } from "@/constants";
import { $listApiKeys, $revokeApiKey, $copyApiKey } from "@/lib/api-keys/functions";
import { toast } from "sonner";

// ── Inline copy button for admin support use ──────────────────────────────────
function AdminCopyKeyButton({ apiKeyId }: { apiKeyId: string }) {
	const [copied, setCopied] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleCopy() {
		if (loading) return;
		setLoading(true);
		try {
			const res = await $copyApiKey({ data: { id: apiKeyId } });
			if (!res?.ok) {
				toast.error((res as any)?.error?.message ?? "Could not retrieve key");
				return;
			}
			await navigator.clipboard.writeText(res.data.raw);
			setCopied(true);
			toast.success("API key copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Clipboard access denied");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Button variant="ghost" size="icon" onClick={handleCopy} title="Copy API key (admin)" disabled={loading}>
			{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}

export const Route = createFileRoute("/(authenticated)/admin/api/")({
	component: ApiKeysListPage,
});

function ApiKeysListPage() {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: QUERY_KEYS.BLOG.API_KEYS.LIST,
		queryFn: () => $listApiKeys({ data: { page: 1, limit: 100 } }),
	});

	const revokeMutation = useMutation({
		mutationFn: (id: string) => $revokeApiKey({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.LIST });
			toast.success("API key revoked");
		},
	});

	const items = data?.ok ? (data.data as any)?.items ?? [] : [];

	function getStatus(key: any) {
		if (key.revokedAt) return "revoked";
		if (key.expiresAt && new Date(key.expiresAt) < new Date()) return "expired";
		return "active";
	}

	return (
		<div className="p-6 max-w-6xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">API Integrations</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Overview of all API keys across all sites. Manage keys from the per-site dashboard.
					</p>
				</div>
				<div className="flex gap-2">
					<Link to={ROUTES.DASHBOARD_SITES as string}>
						<Button variant="outline">
							<Globe className="w-4 h-4 mr-2" />
							My Sites
						</Button>
					</Link>
					<Link to={ROUTES.ADMIN.BLOG.SITES as string}>
						<Button>
							<Key className="w-4 h-4 mr-2" />
							Manage Sites
							<ArrowRight className="w-4 h-4 ml-2" />
						</Button>
					</Link>
				</div>
			</div>

			{/* Guidance banner */}
			<Card className="border-blue-500/30 bg-blue-500/5">
				<CardContent className="pt-4 pb-3">
					<div className="flex gap-2 text-sm text-blue-700 dark:text-blue-400">
						<Info className="h-4 w-4 shrink-0 mt-0.5" />
						<span>
							API keys are managed per-site. To create, rotate, copy, or revoke keys — go to{" "}
							<Link to={ROUTES.DASHBOARD_SITES as string} className="font-medium underline">My Sites</Link>{" "}
							and open the site you want to manage. Admins can also{" "}
							<Link to={ROUTES.ADMIN.BLOG.SITES as string} className="font-medium underline">gift sites</Link>{" "}
							to users.
						</span>
					</div>
				</CardContent>
			</Card>

			{isLoading ? (
				<div className="text-muted-foreground animate-pulse py-10 text-center">Loading...</div>
			) : items.length === 0 ? (
				<div className="text-center py-20 text-muted-foreground">
					<Key className="w-12 h-12 mx-auto mb-4 opacity-30" />
					<p>No API keys yet.</p>
					<p className="text-sm mt-1">Create a site and generate an API key to get started.</p>
					<Link to={ROUTES.DASHBOARD_SITES as string} className="mt-4 inline-block">
						<Button variant="outline">
							<Globe className="w-4 h-4 mr-2" /> Go to My Sites
						</Button>
					</Link>
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Key Prefix</TableHead>
							<TableHead>Site</TableHead>
							<TableHead>Rate Limit</TableHead>
							<TableHead>Last Used</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-10">Copy</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((key: any) => {
							const status = getStatus(key);
							return (
								<TableRow key={key.id}>
									<TableCell className="font-medium">{key.name}</TableCell>
									<TableCell>
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
									</TableCell>
									<TableCell>
										{key.siteId ? (
											<Link
												to={`/dashboard/sites/${key.siteId}` as string}
												className="text-sm hover:underline text-primary flex items-center gap-1"
											>
												<Globe className="h-3 w-3" />
												{key.siteName ?? key.siteId}
											</Link>
										) : (
											<span className="text-muted-foreground text-sm">—</span>
										)}
									</TableCell>
									<TableCell>{key.rateLimitRpm} req/min</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{key.lastUsedAt
											? new Date(key.lastUsedAt).toLocaleDateString()
											: "Never"}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												status === "active"
													? "default"
													: status === "revoked"
														? "destructive"
														: "secondary"
											}
										>
											{status}
										</Badge>
									</TableCell>
									<TableCell>
										{status === "active" && <AdminCopyKeyButton apiKeyId={key.id} />}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button variant="ghost" size="icon">
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												}
											/>
											<DropdownMenuContent align="end">
												{key.siteId && (
													<DropdownMenuItem
														render={<Link to={`/dashboard/sites/${key.siteId}` as string} />}
													>
														<ExternalLink className="w-4 h-4 mr-2" />
														Manage Site
													</DropdownMenuItem>
												)}
												{status === "active" && (
													<DropdownMenuItem
														className="text-destructive"
														onClick={() => revokeMutation.mutate(key.id)}
													>
														<ShieldOff className="w-4 h-4 mr-2" />
														Revoke
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
