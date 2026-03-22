import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, MoreHorizontal, ShieldOff, ExternalLink } from "lucide-react";
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
import { ROUTES, QUERY_KEYS } from "@/constants";
import { $listApiKeys, $revokeApiKey } from "@/lib/api-keys/functions";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/admin/api/")({
	component: ApiKeysListPage,
});

function ApiKeysListPage() {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: QUERY_KEYS.BLOG.API_KEYS.LIST,
		queryFn: () => $listApiKeys({ data: { page: 1, limit: 50 } }),
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
						Manage API keys for external applications to consume your blog content.
					</p>
				</div>
				<Link to={ROUTES.ADMIN.API.NEW as string}>
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						New API Key
					</Button>
				</Link>
			</div>

			{isLoading ? (
				<div className="text-muted-foreground animate-pulse py-10 text-center">Loading...</div>
			) : items.length === 0 ? (
				<div className="text-center py-20 text-muted-foreground">
					<Key className="w-12 h-12 mx-auto mb-4 opacity-30" />
					<p>No API keys yet.</p>
					<p className="text-sm mt-1">Create one to let external apps access your blog content.</p>
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
									<TableCell>{key.siteName}</TableCell>
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
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button variant="ghost" size="icon">
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												}
											/>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													render={<Link to={ROUTES.ADMIN.API.DETAIL(key.id) as string} />}
												>
													<ExternalLink className="w-4 h-4 mr-2" />
													View Details
												</DropdownMenuItem>
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
