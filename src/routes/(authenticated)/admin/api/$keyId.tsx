import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Check, RotateCcw, ShieldOff, Globe, Clock, Zap, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QUERY_KEYS } from "@/constants";
import { $getApiKey, $revokeApiKey, $rotateApiKey, $upsertWebhook } from "@/lib/api-keys/functions";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/admin/api/$keyId")({
	component: ApiKeyDetailPage,
});

function ApiKeyDetailPage() {
	const { keyId } = Route.useParams();
	const queryClient = useQueryClient();

	const [rotatedKey, setRotatedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [webhookUrl, setWebhookUrl] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: QUERY_KEYS.BLOG.API_KEYS.DETAIL(keyId),
		queryFn: () => $getApiKey({ data: { id: keyId } }),
	});

	const key = data?.ok ? (data.data as any) : null;
	const isActive = key && !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date());

	const revokeMutation = useMutation({
		mutationFn: () => $revokeApiKey({ data: { id: keyId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.DETAIL(keyId) });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.LIST });
			toast.success("API key revoked");
		},
	});

	const rotateMutation = useMutation({
		mutationFn: () => $rotateApiKey({ data: { id: keyId } }),
		onSuccess: (result: any) => {
			if (result?.ok) {
				setRotatedKey((result.data as any).rawKey);
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.DETAIL(keyId) });
			}
		},
	});

	const webhookMutation = useMutation({
		mutationFn: (url: string) => $upsertWebhook({ data: { apiKeyId: keyId, url } }),
		onSuccess: (result: any) => {
			if (result?.ok) {
				toast.success("Webhook added");
				setWebhookUrl("");
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.DETAIL(keyId) });
			}
		},
	});

	const handleCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (isLoading) {
		return <div className="p-6 text-muted-foreground animate-pulse">Loading...</div>;
	}

	if (!key) {
		return (
			<div className="p-6 text-center text-muted-foreground">
				API key not found.
			</div>
		);
	}

	const status = key.revokedAt
		? "revoked"
		: key.expiresAt && new Date(key.expiresAt) < new Date()
			? "expired"
			: "active";

	const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

	return (
		<div className="p-6 max-w-4xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{key.name}</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Site: {key.siteName} &middot; Prefix: <code className="bg-muted px-1 rounded">{key.keyPrefix}...</code>
					</p>
				</div>
				<Badge variant={status === "active" ? "default" : status === "revoked" ? "destructive" : "secondary"}>
					{status}
				</Badge>
			</div>

			{/* Key Details */}
			<div className="grid sm:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-1.5">
							<Zap className="w-3.5 h-3.5" /> Rate Limit
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-lg font-semibold">{key.rateLimitRpm} req/min</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-1.5">
							<Clock className="w-3.5 h-3.5" /> Last Used
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-lg font-semibold">
							{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-1.5">
							<Globe className="w-3.5 h-3.5" /> Origins
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-lg font-semibold">
							{key.allowedOrigins?.length > 0 ? key.allowedOrigins.join(", ") : "Any"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick API Reference */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">API Endpoints</CardTitle>
					<CardDescription>Use these endpoints with your API key as a Bearer token.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm font-mono">
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">GET</Badge>
							<code>{baseUrl}/blog/api/v1/posts</code>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">GET</Badge>
							<code>{baseUrl}/blog/api/v1/posts/:slug</code>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">GET</Badge>
							<code>{baseUrl}/blog/api/v1/categories</code>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">GET</Badge>
							<code>{baseUrl}/blog/api/v1/tags</code>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">GET</Badge>
							<code>{baseUrl}/blog/api/v1/authors</code>
						</div>
					</div>
					<div className="mt-4 p-3 bg-muted rounded text-sm">
						<p className="font-medium mb-1">Usage:</p>
						<code className="text-xs break-all">
							curl -H "Authorization: Bearer bk_live_..." {baseUrl}/blog/api/v1/posts
						</code>
					</div>
				</CardContent>
			</Card>

			{/* Webhooks */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Webhook className="w-4 h-4" /> Webhooks
					</CardTitle>
					<CardDescription>
						Receive notifications when posts are published, updated, or deleted.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{key.webhooks?.length > 0 && (
						<div className="space-y-2">
							{key.webhooks.map((wh: any) => (
								<div key={wh.id} className="flex items-center justify-between p-3 border rounded">
									<div>
										<code className="text-sm">{wh.url}</code>
										<div className="flex gap-1 mt-1">
											{wh.events?.map((e: string) => (
												<Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
											))}
										</div>
									</div>
									<div className="text-xs text-muted-foreground">
										{wh.lastStatusCode ? `Last: ${wh.lastStatusCode}` : "Not fired yet"}
									</div>
								</div>
							))}
						</div>
					)}

					{isActive && (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (webhookUrl.trim()) webhookMutation.mutate(webhookUrl.trim());
							}}
							className="flex gap-2"
						>
							<Input
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								placeholder="https://your-app.com/api/webhook"
								type="url"
								className="flex-1"
							/>
							<Button type="submit" disabled={webhookMutation.isPending} variant="secondary">
								Add Webhook
							</Button>
						</form>
					)}
				</CardContent>
			</Card>

			{/* Actions */}
			{isActive && (
				<div className="flex gap-3">
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button variant="outline">
									<RotateCcw className="w-4 h-4 mr-2" /> Rotate Key
								</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
								<AlertDialogDescription>
									This will generate a new key and immediately invalidate the old one.
									External apps using the current key will stop working.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => rotateMutation.mutate()}>
									Rotate
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button variant="destructive">
									<ShieldOff className="w-4 h-4 mr-2" /> Revoke Key
								</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. External apps using this key will
									immediately lose access.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-destructive-foreground"
									onClick={() => revokeMutation.mutate()}
								>
									Revoke
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)}

			{/* Rotated Key Reveal */}
			{rotatedKey && (
				<Card className="border-amber-500">
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 mb-2 text-amber-500 text-sm font-medium">
							New API Key (copy now — won't be shown again)
						</div>
						<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
							<code className="flex-1 text-sm break-all select-all">{rotatedKey}</code>
							<Button variant="ghost" size="icon" onClick={() => handleCopy(rotatedKey)}>
								{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
