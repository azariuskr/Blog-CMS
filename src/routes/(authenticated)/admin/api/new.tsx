import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ROUTES, QUERY_KEYS } from "@/constants";
import { $createApiKey } from "@/lib/api-keys/functions";
import { $listSites } from "@/lib/blog/functions";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/admin/api/new")({
	component: NewApiKeyPage,
});

function NewApiKeyPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [name, setName] = useState("");
	const [siteId, setSiteId] = useState("");
	const [rateLimitRpm, setRateLimitRpm] = useState(60);
	const [originsText, setOriginsText] = useState("");
	const [rawKey, setRawKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const sitesQuery = useQuery({
		queryKey: QUERY_KEYS.BLOG.SITES.BASE,
		queryFn: () => $listSites(),
	});

	const sites = (sitesQuery.data as any)?.ok ? (sitesQuery.data as any).data ?? [] : [];

	const createMutation = useMutation({
		mutationFn: (input: { name: string; siteId: string; rateLimitRpm: number; allowedOrigins?: string[] }) =>
			$createApiKey({ data: input }),
		onSuccess: (result: any) => {
			if (result?.ok) {
				const data = result.data as any;
				setRawKey(data.rawKey);
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOG.API_KEYS.LIST });
			} else {
				toast.error("Failed to create API key");
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !siteId) {
			toast.error("Name and site are required");
			return;
		}

		const allowedOrigins = originsText
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);

		createMutation.mutate({
			name: name.trim(),
			siteId,
			rateLimitRpm,
			allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
		});
	};

	const handleCopy = async () => {
		if (rawKey) {
			await navigator.clipboard.writeText(rawKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Create API Key</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Generate an API key for an external application to access your blog content.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="name">Application Name</Label>
					<Input
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. ShopX Production"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="site">Site</Label>
					<Select value={siteId} onValueChange={setSiteId}>
						<SelectTrigger>
							<SelectValue placeholder="Select a site..." />
						</SelectTrigger>
						<SelectContent>
							{sites.map((site: any) => (
								<SelectItem key={site.id} value={site.id}>
									{site.name} ({site.subdomain})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						The API key will only have access to posts scoped to this site.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="rateLimit">Rate Limit (requests/min)</Label>
					<Input
						id="rateLimit"
						type="number"
						value={rateLimitRpm}
						onChange={(e) => setRateLimitRpm(Number(e.target.value))}
						min={1}
						max={10000}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="origins">Allowed Origins (one per line, optional)</Label>
					<textarea
						id="origins"
						value={originsText}
						onChange={(e) => setOriginsText(e.target.value)}
						placeholder={"https://shop.example.com\nhttps://staging.shop.example.com"}
						rows={3}
						className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
					<p className="text-xs text-muted-foreground">
						Leave empty to allow any origin. Recommended for server-side usage.
					</p>
				</div>

				<Button type="submit" disabled={createMutation.isPending}>
					{createMutation.isPending ? "Creating..." : "Create API Key"}
				</Button>
			</form>

			{/* Key Reveal Dialog */}
			<Dialog open={!!rawKey} onOpenChange={() => {}}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>API Key Created</DialogTitle>
						<DialogDescription>
							Copy this key now. You won't be able to see it again.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
							<code className="flex-1 text-sm break-all select-all">{rawKey}</code>
							<Button variant="ghost" size="icon" onClick={handleCopy}>
								{copied ? (
									<Check className="w-4 h-4 text-green-500" />
								) : (
									<Copy className="w-4 h-4" />
								)}
							</Button>
						</div>

						<div className="flex items-start gap-2 text-amber-500 text-sm">
							<AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
							<p>
								Store this key securely. It will not be shown again. If lost, you can rotate
								the key from the key detail page.
							</p>
						</div>

						<Button
							className="w-full"
							onClick={() => navigate({ to: ROUTES.ADMIN.API.BASE as string })}
						>
							I've Saved This Key
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
