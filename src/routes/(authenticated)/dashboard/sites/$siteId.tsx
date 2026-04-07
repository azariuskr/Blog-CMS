import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	Key, Copy, Check, RefreshCw, Trash2, Plus, Webhook,
	ArrowLeft, Shield, AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog, DialogContent, DialogDescription,
	DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel,
	AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
	AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import {
	$listApiKeys, $createApiKey, $rotateApiKey,
	$revokeApiKey, $copyApiKey, $upsertWebhook,
} from "@/lib/api-keys/functions";
import { $listSites } from "@/lib/blog/functions";

export const Route = createFileRoute("/(authenticated)/dashboard/sites/$siteId")({
	component: SiteDetailPage,
});

// ── Copy button (fetches raw key on demand, never stored in state) ────────────

function CopyKeyButton({ apiKeyId }: { apiKeyId: string }) {
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
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Clipboard access denied");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Button variant="ghost" size="icon" onClick={handleCopy} title="Copy API key" disabled={loading}>
			{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}

// ── API Keys tab ──────────────────────────────────────────────────────────────

function ApiKeysTab({ siteId }: { siteId: string }) {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [keyName, setKeyName] = useState("");
	const [newKeyRaw, setNewKeyRaw] = useState<{ raw: string } | null>(null);
	const [newKeyCopied, setNewKeyCopied] = useState(false);

	const { data: keys = [], isLoading } = useQuery({
		queryKey: ["site-api-keys", siteId],
		queryFn: () => $listApiKeys({ data: { page: 1, limit: 50 } }),
		select: (r) => (r?.ok ? r.data.items.filter((k) => k.siteId === siteId) : []),
	});

	const createMutation = useMutation({
		mutationFn: (name: string) =>
			$createApiKey({ data: { name, siteId, rateLimitRpm: 60 } }),
		onSuccess: (res) => {
			if (!res?.ok) { toast.error((res as any)?.error?.message); return; }
			setNewKeyRaw({ raw: res.data.rawKey });
			queryClient.invalidateQueries({ queryKey: ["site-api-keys", siteId] });
			setCreateOpen(false);
			setKeyName("");
		},
		onError: () => toast.error("Failed to create key"),
	});

	const rotateMutation = useMutation({
		mutationFn: (id: string) => $rotateApiKey({ data: { id } }),
		onSuccess: (res) => {
			if (!res?.ok) { toast.error((res as any)?.error?.message); return; }
			setNewKeyRaw({ raw: res.data.rawKey });
			queryClient.invalidateQueries({ queryKey: ["site-api-keys", siteId] });
		},
		onError: () => toast.error("Rotation failed"),
	});

	const revokeMutation = useMutation({
		mutationFn: (id: string) => $revokeApiKey({ data: { id } }),
		onSuccess: () => {
			toast.success("Key revoked");
			queryClient.invalidateQueries({ queryKey: ["site-api-keys", siteId] });
		},
		onError: () => toast.error("Revoke failed"),
	});

	async function copyNewKey() {
		if (!newKeyRaw) return;
		await navigator.clipboard.writeText(newKeyRaw.raw);
		setNewKeyCopied(true);
		setTimeout(() => setNewKeyCopied(false), 2000);
	}

	return (
		<div className="space-y-4">
			{/* New key reveal banner */}
			{newKeyRaw && (
				<Card className="border-green-500/30 bg-green-500/5">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
							<Shield className="h-4 w-4" /> New API key — copy it now
						</CardTitle>
						<CardDescription className="text-xs">
							This is the only time the full key is shown. After dismissing, use the copy button on any device.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2 font-mono text-sm bg-background rounded border px-3 py-2">
							<span className="flex-1 truncate">{newKeyRaw.raw}</span>
							<Button variant="ghost" size="icon" onClick={copyNewKey}>
								{newKeyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
							</Button>
						</div>
						<Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setNewKeyRaw(null)}>
							I've saved it, dismiss
						</Button>
					</CardContent>
				</Card>
			)}

			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">API keys authenticate requests from your external website.</p>
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1.5 h-3.5 w-3.5" /> New Key
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{[1, 2].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
				</div>
			) : keys.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground text-sm">
						<Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
						No API keys yet. Create one to start integrating.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{keys.map((k) => (
						<Card key={k.id} className={k.revokedAt ? "opacity-50" : ""}>
							<CardContent className="flex items-center gap-3 py-3">
								<Key className="h-4 w-4 text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{k.name}</p>
									<p className="text-xs text-muted-foreground font-mono">
										{k.keyPrefix}••••••••••••••••
									</p>
								</div>
								{k.revokedAt ? (
									<Badge variant="destructive" className="text-xs">Revoked</Badge>
								) : (
									<div className="flex items-center gap-1 shrink-0">
										<CopyKeyButton apiKeyId={k.id} />
										<AlertDialog>
											<AlertDialogTrigger
												render={<Button variant="ghost" size="icon" title="Rotate key" />}
											>
												<RefreshCw className="h-4 w-4" />
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Rotate API key?</AlertDialogTitle>
													<AlertDialogDescription>
														The current key will be invalidated immediately. Any services using it will stop working until updated.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction onClick={() => rotateMutation.mutate(k.id)}>
														Rotate
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
										<AlertDialog>
											<AlertDialogTrigger
												render={<Button variant="ghost" size="icon" title="Revoke key" className="text-destructive hover:text-destructive" />}
											>
												<Trash2 className="h-4 w-4" />
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Revoke API key?</AlertDialogTitle>
													<AlertDialogDescription>
														This key will stop working immediately. This cannot be undone.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
														onClick={() => revokeMutation.mutate(k.id)}
													>
														Revoke
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Create key dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create API key</DialogTitle>
						<DialogDescription>Give this key a name to identify where it's used.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="key-name">Key name</Label>
						<Input
							id="key-name"
							placeholder="e.g. Production, Vercel, Netlify"
							value={keyName}
							onChange={(e) => setKeyName(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button
							onClick={() => createMutation.mutate(keyName)}
							disabled={!keyName.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ── Webhooks tab ──────────────────────────────────────────────────────────────

function WebhooksTab({ siteId }: { siteId: string }) {
	const queryClient = useQueryClient();
	const [url, setUrl] = useState("");
	const [selectedKeyId, setSelectedKeyId] = useState("");

	const { data: activeKeys = [] } = useQuery({
		queryKey: ["site-api-keys", siteId],
		queryFn: () => $listApiKeys({ data: { page: 1, limit: 50 } }),
		select: (r) => (r?.ok ? r.data.items.filter((k) => k.siteId === siteId && !k.revokedAt) : []),
	});

	const upsertMutation = useMutation({
		mutationFn: () => $upsertWebhook({ data: { apiKeyId: selectedKeyId, url } }),
		onSuccess: (res) => {
			if (!res?.ok) { toast.error((res as any)?.error?.message); return; }
			toast.success("Webhook saved");
			setUrl("");
			setSelectedKeyId("");
			queryClient.invalidateQueries({ queryKey: ["site-api-keys", siteId] });
		},
		onError: () => toast.error("Failed to save webhook"),
	});

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Webhooks notify your site when content changes (post published, updated, deleted).
			</p>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Configure webhook</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>API key</Label>
						<select
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
							value={selectedKeyId}
							onChange={(e) => setSelectedKeyId(e.target.value)}
						>
							<option value="">Select an API key…</option>
							{activeKeys.map((k) => (
								<option key={k.id} value={k.id}>{k.name} ({k.keyPrefix}••••)</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="webhook-url">Endpoint URL</Label>
						<Input
							id="webhook-url"
							type="url"
							placeholder="https://yoursite.com/api/webhook"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
					</div>
					<Button
						onClick={() => upsertMutation.mutate()}
						disabled={!selectedKeyId || !url.trim() || upsertMutation.isPending}
					>
						{upsertMutation.isPending ? "Saving…" : "Save Webhook"}
					</Button>
				</CardContent>
			</Card>
			<Card className="border-dashed">
				<CardContent className="pt-4">
					<div className="flex gap-2 text-xs text-muted-foreground">
						<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
						<p>The webhook secret is set once at creation. To get a new secret, save a new webhook URL.</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SiteDetailPage() {
	const { siteId } = Route.useParams();

	const { data: site } = useQuery({
		queryKey: ["dashboard-sites"],
		queryFn: () => $listSites(),
		select: (r) => (r?.ok ? r.data.find((s) => s.id === siteId) : undefined),
	});

	return (
		<PageContainer>
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					<Link to={ROUTES.DASHBOARD_SITES as string}>
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-xl font-bold">{site?.name ?? "Site"}</h1>
						{site?.subdomain && (
							<p className="text-sm text-muted-foreground">{site.subdomain}.yourcms.com</p>
						)}
					</div>
					{site && (
						<Badge variant={site.status === "active" ? "default" : "secondary"} className="ml-auto">
							{site.status}
						</Badge>
					)}
				</div>

				<Tabs defaultValue="keys">
					<TabsList>
						<TabsTrigger value="keys" className="gap-1.5">
							<Key className="h-3.5 w-3.5" /> API Keys
						</TabsTrigger>
						<TabsTrigger value="webhooks" className="gap-1.5">
							<Webhook className="h-3.5 w-3.5" /> Webhooks
						</TabsTrigger>
					</TabsList>

					<TabsContent value="keys" className="mt-4">
						<ApiKeysTab siteId={siteId} />
					</TabsContent>

					<TabsContent value="webhooks" className="mt-4">
						<WebhooksTab siteId={siteId} />
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}
