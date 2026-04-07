/**
 * Admin Site Manager — lists sites, opens per-site page list,
 * and launches the Puck visual editor for individual pages.
 */
"use client";

import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useCallback } from "react";
import {
	Plus, Globe, Trash2, CheckCircle2, AlertCircle,
	ArrowLeft, FileText, Eye, Pencil, ExternalLink, Loader2, UserCog,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Data } from "@measured/puck";
import "@measured/puck/puck.css";

import {
	useSites, useUpsertSite, useDeleteSite,
	usePages, useUpsertPage, useDeletePage,
} from "@/lib/blog/queries";
import { puckConfig } from "@/lib/puck/config";
import { $adminGiftSite, $adminAssignSiteOwner } from "@/lib/blog/functions";
import { $listUsers } from "@/lib/auth/functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Lazy-load the Puck editor (heavy bundle, client-only)
const PuckEditor = lazy(async () => {
	const { Puck } = await import("@measured/puck");
	return { default: Puck };
});

export const Route = createFileRoute("/(authenticated)/admin/blog/sites")({
	component: AdminSitesPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type View = "sites" | "pages" | "editor";

interface SelectedSite {
	id: string;
	name: string;
	slug: string;
}

interface SelectedPage {
	id: string;
	title: string;
	slug: string;
	puckData: Data | null;
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

function AdminSitesPage() {
	const [view, setView] = useState<View>("sites");
	const [site, setSite] = useState<SelectedSite | null>(null);
	const [page, setPage] = useState<SelectedPage | null>(null);

	if (view === "editor" && site && page) {
		return (
			<PuckEditorView
				site={site}
				page={page}
				onBack={() => { setView("pages"); setPage(null); }}
			/>
		);
	}

	if (view === "pages" && site) {
		return (
			<PagesView
				site={site}
				onBack={() => { setView("sites"); setSite(null); }}
				onEditPage={(p) => { setPage(p); setView("editor"); }}
			/>
		);
	}

	return (
		<SitesView
			onOpenSite={(s) => { setSite(s); setView("pages"); }}
		/>
	);
}

// ---------------------------------------------------------------------------
// Sites list view
// ---------------------------------------------------------------------------

function SitesView({ onOpenSite }: { onOpenSite: (s: SelectedSite) => void }) {
	const sitesQuery = useSites();
	const upsertSite = useUpsertSite();
	const deleteSite = useDeleteSite();
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [giftOpen, setGiftOpen] = useState(false);
	const [assignOpen, setAssignOpen] = useState(false);
	const [assignSite, setAssignSite] = useState<{ id: string; name: string } | null>(null);
	const [assignUserId, setAssignUserId] = useState("");
	const [form, setForm] = useState({ name: "", slug: "", description: "" });
	const [giftForm, setGiftForm] = useState({ userId: "", name: "", subdomain: "", description: "", grantedUntil: "" });
	const [saving, setSaving] = useState(false);

	const usersQuery = useQuery({
		queryKey: ["admin-users-list"],
		queryFn: () => $listUsers(),
		select: (r) => (r?.ok ? ((r.data as any)?.users ?? []) : []),
		enabled: giftOpen || assignOpen,
	});
	const users = usersQuery.data ?? [];

	const giftMutation = useMutation({
		mutationFn: () => $adminGiftSite({
			data: {
				userId: giftForm.userId,
				name: giftForm.name,
				subdomain: giftForm.subdomain || undefined,
				description: giftForm.description || undefined,
				grantedUntil: giftForm.grantedUntil || undefined,
			},
		}),
		onSuccess: (res) => {
			if (!res?.ok) { toast.error((res as any)?.error?.message ?? "Failed to gift site"); return; }
			toast.success(`Site gifted to user`);
			queryClient.invalidateQueries({ queryKey: ["sites"] });
			setGiftOpen(false);
			setGiftForm({ userId: "", name: "", subdomain: "", description: "", grantedUntil: "" });
		},
		onError: () => toast.error("Failed to gift site"),
	});

	const assignMutation = useMutation({
		mutationFn: () => $adminAssignSiteOwner({
			data: { siteId: assignSite!.id, userId: assignUserId },
		}),
		onSuccess: (res) => {
			if (!res?.ok) { toast.error((res as any)?.error?.message ?? "Failed to assign owner"); return; }
			toast.success(`Site "${assignSite?.name}" reassigned`);
			queryClient.invalidateQueries({ queryKey: ["sites"] });
			setAssignOpen(false);
			setAssignSite(null);
			setAssignUserId("");
		},
		onError: () => toast.error("Failed to assign owner"),
	});

	const sites = sitesQuery.data?.ok ? sitesQuery.data.data : [];

	const slugify = (s: string) =>
		s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

	const handleCreate = async () => {
		if (!form.name.trim()) { toast.error("Name is required"); return; }
		setSaving(true);
		try {
			const res = await upsertSite.mutateAsync({
				name: form.name,
				slug: form.slug || slugify(form.name),
				description: form.description || undefined,
			});
			if (res?.ok) {
				toast.success("Site created");
				setCreateOpen(false);
				setForm({ name: "", slug: "", description: "" });
			} else {
				toast.error("Failed to create site");
			}
		} catch {
			toast.error("Failed to create site");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string, name: string) => {
		if (!confirm(`Delete "${name}"? This will also delete all its pages.`)) return;
		const res = await deleteSite.mutateAsync(id);
		if (res?.ok) toast.success("Site deleted");
		else toast.error("Failed to delete site");
	};

	return (
		<PageContainer
			title="Sites"
			description="Manage your sites and their pages"
			actions={
				<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={() => setGiftOpen(true)}>
						<Globe className="h-4 w-4 mr-2" /> Gift Site
					</Button>
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4 mr-2" /> New Site
					</Button>
				</div>
			}
		>
			{sitesQuery.isLoading ? (
				<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
			) : sites.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Globe className="h-12 w-12 text-muted-foreground mb-4" />
					<p className="text-muted-foreground">No sites yet. Create your first site to get started.</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{sites.map((s) => (
						<div
							key={s.id}
							className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-foreground truncate">{s.name}</h3>
									<p className="text-xs text-muted-foreground font-mono mt-0.5">/{s.slug}</p>
								</div>
								<Badge variant={s.status === "active" ? "default" : "destructive"} className="shrink-0">
									{s.status === "active"
										? <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
										: <><AlertCircle className="h-3 w-3 mr-1" />Suspended</>
									}
								</Badge>
							</div>
							{s.description && (
								<p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
							)}
							<div className="flex gap-2 mt-auto pt-2 border-t border-border">
								<Button size="sm" variant="outline" className="flex-1" onClick={() => onOpenSite({ id: s.id, name: s.name, slug: s.slug })}>
									<FileText className="h-3.5 w-3.5 mr-1.5" /> Pages
								</Button>
								<Button
									size="sm"
									variant="ghost"
									title="Assign owner"
									onClick={() => { setAssignSite({ id: s.id, name: s.name }); setAssignOpen(true); }}
								>
									<UserCog className="h-3.5 w-3.5" />
								</Button>
								{s.subdomain && (
									<Button size="sm" variant="ghost" {...{asChild: true} as any}>
										<a href={`/${s.slug}`} target="_blank" rel="noopener noreferrer">
											<ExternalLink className="h-3.5 w-3.5" />
										</a>
									</Button>
								)}
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
									onClick={() => handleDelete(s.id, s.name)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Gift Site Dialog */}
			<Dialog open={giftOpen} onOpenChange={setGiftOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Gift Site to User</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label>Assign to user *</Label>
							<select
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
								value={giftForm.userId}
								onChange={(e) => setGiftForm((p) => ({ ...p, userId: e.target.value }))}
							>
								<option value="">Select a user…</option>
								{users.map((u: any) => (
									<option key={u.id} value={u.id}>{u.name} ({u.email})</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label>Site name *</Label>
							<Input
								placeholder="My Partner Site"
								value={giftForm.name}
								onChange={(e) => setGiftForm((p) => ({ ...p, name: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Subdomain (optional)</Label>
							<Input
								placeholder="partner-blog"
								value={giftForm.subdomain}
								onChange={(e) => setGiftForm((p) => ({ ...p, subdomain: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Expires (optional)</Label>
							<Input
								type="date"
								value={giftForm.grantedUntil ? giftForm.grantedUntil.slice(0, 10) : ""}
								onChange={(e) => setGiftForm((p) => ({ ...p, grantedUntil: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
							/>
							<p className="text-xs text-muted-foreground">Leave empty for permanent access.</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setGiftOpen(false)}>Cancel</Button>
						<Button
							onClick={() => giftMutation.mutate()}
							disabled={!giftForm.userId || !giftForm.name.trim() || giftMutation.isPending}
						>
							{giftMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gifting…</> : "Gift Site"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Assign Owner Dialog */}
			<Dialog open={assignOpen} onOpenChange={(v) => { setAssignOpen(v); if (!v) { setAssignSite(null); setAssignUserId(""); } }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign Site Owner</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<p className="text-sm text-muted-foreground">
							Reassign <strong>{assignSite?.name}</strong> to a different user. The new owner will see it in their Sites dashboard.
						</p>
						<div className="space-y-1.5">
							<Label>New owner *</Label>
							<select
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
								value={assignUserId}
								onChange={(e) => setAssignUserId(e.target.value)}
							>
								<option value="">Select a user…</option>
								{users.map((u: any) => (
									<option key={u.id} value={u.id}>{u.name} ({u.email})</option>
								))}
							</select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
						<Button
							onClick={() => assignMutation.mutate()}
							disabled={!assignUserId || assignMutation.isPending}
						>
							{assignMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning…</> : "Assign Owner"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create Site Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Site</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label>Site Name</Label>
							<Input
								placeholder="My Awesome Blog"
								value={form.name}
								onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>URL Slug</Label>
							<Input
								placeholder="my-awesome-blog"
								value={form.slug}
								onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
								className="font-mono text-sm"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Description (optional)</Label>
							<Input
								placeholder="A short description of this site"
								value={form.description}
								onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={saving}>
							{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create Site"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}

// ---------------------------------------------------------------------------
// Pages list view (within a site)
// ---------------------------------------------------------------------------

function PagesView({
	site,
	onBack,
	onEditPage,
}: {
	site: SelectedSite;
	onBack: () => void;
	onEditPage: (page: SelectedPage) => void;
}) {
	const pagesQuery = usePages(site.id);
	const upsertPage = useUpsertPage();
	const deletePage = useDeletePage();
	const [createOpen, setCreateOpen] = useState(false);
	const [form, setForm] = useState({ title: "", slug: "" });
	const [saving, setSaving] = useState(false);

	const slugify = (s: string) =>
		s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

	const pages = (pagesQuery.data as any)?.ok ? (pagesQuery.data as any).data : [];

	const handleCreate = async () => {
		if (!form.title.trim()) { toast.error("Title is required"); return; }
		setSaving(true);
		try {
			const res = await upsertPage.mutateAsync({
				siteId: site.id,
				title: form.title,
				slug: form.slug || slugify(form.title),
			}) as any;
			if (res?.ok) {
				toast.success("Page created");
				setCreateOpen(false);
				setForm({ title: "", slug: "" });
				// Open editor immediately after creation
				if (res.data) {
					onEditPage({ id: res.data.id, title: res.data.title, slug: res.data.slug, puckData: null });
				}
			} else {
				toast.error("Failed to create page");
			}
		} catch {
			toast.error("Failed to create page");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string, title: string) => {
		if (!confirm(`Delete page "${title}"?`)) return;
		const res = await deletePage.mutateAsync({ id, siteId: site.id });
		if (res?.ok) toast.success("Page deleted");
		else toast.error("Failed to delete page");
	};

	return (
		<PageContainer
			title={`${site.name} — Pages`}
			description={`Manage pages for /${site.slug}`}
			actions={
				<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={onBack}>
						<ArrowLeft className="h-4 w-4 mr-2" /> All Sites
					</Button>
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4 mr-2" /> New Page
					</Button>
				</div>
			}
		>
			{pagesQuery.isLoading ? (
				<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
			) : pages.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<FileText className="h-12 w-12 text-muted-foreground mb-4" />
					<p className="text-muted-foreground">No pages yet. Create a page to start building with the visual editor.</p>
				</div>
			) : (
				<div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
					{pages.map((p: any) => (
						<div key={p.id} className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-accent/5 transition-colors">
							<div className="flex-1 min-w-0">
								<p className="font-medium text-foreground truncate">{p.title}</p>
								<p className="text-xs text-muted-foreground font-mono">/{p.slug}</p>
							</div>
							<Badge variant={p.status === "published" ? "default" : "secondary"}>
								{p.status}
							</Badge>
							<div className="flex gap-1.5 shrink-0">
								<Button
									size="sm"
									variant="outline"
									onClick={() => onEditPage({
										id: p.id,
										title: p.title,
										slug: p.slug,
										puckData: (p.blocks as unknown as Data) ?? null,
									})}
								>
									<Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
								</Button>
								<Button size="sm" variant="ghost" {...{asChild: true} as any}>
									<a href={`/${site.slug}/${p.slug}`} target="_blank" rel="noopener noreferrer">
										<Eye className="h-3.5 w-3.5" />
									</a>
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
									onClick={() => handleDelete(p.id, p.title)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Page</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label>Page Title</Label>
							<Input
								placeholder="Home"
								value={form.title}
								onChange={(e) => setForm((p) => ({ ...p, title: e.target.value, slug: slugify(e.target.value) }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>URL Slug</Label>
							<Input
								placeholder="home"
								value={form.slug}
								onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
								className="font-mono text-sm"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={saving}>
							{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create & Edit"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}

// ---------------------------------------------------------------------------
// Puck editor view (full-screen, takes over the route)
// ---------------------------------------------------------------------------

const EMPTY_PUCK_DATA: Data = { content: [], root: { props: { title: "" } }, zones: {} };

function PuckEditorView({
	site,
	page,
	onBack,
}: {
	site: SelectedSite;
	page: SelectedPage;
	onBack: () => void;
}) {
	const upsertPage = useUpsertPage();
	const [saving, setSaving] = useState(false);

	const initialData: Data = page.puckData ?? EMPTY_PUCK_DATA;

	const handlePublish = useCallback(
		async (data: Data) => {
			setSaving(true);
			try {
				const res = await upsertPage.mutateAsync({
					id: page.id,
					siteId: site.id,
					title: page.title,
					slug: page.slug,
					status: "published",
					puckData: data as Record<string, unknown>,
				}) as any;
				if (res?.ok) toast.success("Page published!");
				else toast.error("Failed to publish page");
			} catch {
				toast.error("Failed to publish page");
			} finally {
				setSaving(false);
			}
		},
		[page, site, upsertPage],
	);

	return (
		<div className="h-screen flex flex-col">
			{/* Puck editor toolbar override */}
			<div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-card border-b border-border z-50">
				<Button size="sm" variant="outline" onClick={onBack}>
					<ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Pages
				</Button>
				<span className="text-sm font-medium text-foreground">{site.name} / {page.title}</span>
				<span className="text-xs text-muted-foreground font-mono">/{site.slug}/{page.slug}</span>
				{saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
			</div>

			{/* Puck editor (fills remaining height) */}
			<div className="flex-1 overflow-hidden">
				<Suspense
					fallback={
						<div className="flex items-center justify-center h-full">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					}
				>
					<PuckEditor
						config={puckConfig}
						data={initialData}
						onPublish={handlePublish}
					/>
				</Suspense>
			</div>
		</div>
	);
}
