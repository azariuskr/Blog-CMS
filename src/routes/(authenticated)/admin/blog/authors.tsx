import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Search,
	Plus,
	MoreHorizontal,
	ExternalLink,
	Edit2,
	UserX,
	FileText,
	Eye,
	Save,
	X,
	CheckCircle,
	XCircle,
	UserPlus,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuthors, useUpsertAuthorProfile, useAuthorApplications, useReviewAuthorApplication } from "@/lib/blog/queries";
import { ROUTES } from "@/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/admin/blog/authors")({
	component: AdminAuthorsPage,
});

function fmt(n: number) {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString();
}

type AuthorProfile = {
	id: string;
	userId: string;
	username: string;
	displayName: string | null;
	bio: string | null;
	avatarUrl: string | null;
	coverUrl: string | null;
	website: string | null;
	twitterHandle: string | null;
	githubHandle: string | null;
	linkedinHandle: string | null;
	location: string | null;
	followersCount: number;
	postCount: number;
	createdAt: Date;
};

function EditAuthorDialog({
	author,
	onClose,
}: {
	author: AuthorProfile;
	onClose: () => void;
}) {
	const upsert = useUpsertAuthorProfile();
	const [form, setForm] = useState({
		username: author.username ?? "",
		displayName: author.displayName ?? "",
		bio: author.bio ?? "",
		avatarUrl: author.avatarUrl ?? "",
		coverUrl: author.coverUrl ?? "",
		website: author.website ?? "",
		twitterHandle: author.twitterHandle ?? "",
		githubHandle: author.githubHandle ?? "",
		linkedinHandle: author.linkedinHandle ?? "",
		location: author.location ?? "",
	});

	const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setForm((p) => ({ ...p, [k]: e.target.value }));

	const handleSave = async () => {
		if (!form.username.trim()) {
			toast.error("Username is required");
			return;
		}
		const result = await upsert.mutateAsync({
			userId: author.userId,
			username: form.username,
			displayName: form.displayName || undefined,
			bio: form.bio || undefined,
			avatarUrl: form.avatarUrl || undefined,
			coverUrl: form.coverUrl || undefined,
			website: form.website || undefined,
			twitterHandle: form.twitterHandle || undefined,
			githubHandle: form.githubHandle || undefined,
			linkedinHandle: form.linkedinHandle || undefined,
			location: form.location || undefined,
		});
		if (result?.ok) {
			toast.success("Author profile saved.");
			onClose();
		} else {
			toast.error("Failed to save profile.");
		}
	};

	return (
		<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Edit Author Profile</DialogTitle>
			</DialogHeader>
			<div className="space-y-4 pt-2">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label htmlFor="ap-username">Username *</Label>
						<Input id="ap-username" value={form.username} onChange={set("username")} placeholder="jane_doe" className="font-mono" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-displayName">Display Name</Label>
						<Input id="ap-displayName" value={form.displayName} onChange={set("displayName")} placeholder="Jane Doe" />
					</div>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="ap-bio">Bio</Label>
					<Textarea id="ap-bio" value={form.bio} onChange={set("bio")} placeholder="Short author bio…" rows={3} />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="ap-avatar">Avatar URL</Label>
					<Input id="ap-avatar" value={form.avatarUrl} onChange={set("avatarUrl")} placeholder="https://…" type="url" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="ap-location">Location</Label>
					<Input id="ap-location" value={form.location} onChange={set("location")} placeholder="San Francisco, CA" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="ap-website">Website</Label>
					<Input id="ap-website" value={form.website} onChange={set("website")} placeholder="https://…" type="url" />
				</div>
				<div className="grid grid-cols-3 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="ap-twitter">Twitter</Label>
						<Input id="ap-twitter" value={form.twitterHandle} onChange={set("twitterHandle")} placeholder="handle" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-github">GitHub</Label>
						<Input id="ap-github" value={form.githubHandle} onChange={set("githubHandle")} placeholder="handle" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-linkedin">LinkedIn</Label>
						<Input id="ap-linkedin" value={form.linkedinHandle} onChange={set("linkedinHandle")} placeholder="handle" />
					</div>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="outline" onClick={onClose} className="gap-2">
						<X className="w-4 h-4" /> Cancel
					</Button>
					<Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
						<Save className="w-4 h-4" /> {upsert.isPending ? "Saving…" : "Save Profile"}
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}

function AdminAuthorsPage() {
	const [search, setSearch] = useState("");
	const [editingAuthor, setEditingAuthor] = useState<AuthorProfile | null>(null);
	const [tab, setTab] = useState<"authors" | "applications">("authors");
	const authorsQuery = useAuthors();
	const applicationsQuery = useAuthorApplications("pending");
	const reviewMutation = useReviewAuthorApplication();

	const pendingApplications = applicationsQuery.data?.ok ? (applicationsQuery.data.data as any).items ?? [] : [];
	const pendingCount = pendingApplications.length;

	const authors = useMemo(() => {
		const raw = authorsQuery.data;
		const items: AuthorProfile[] = (raw?.ok ? raw.data.items : []) as AuthorProfile[];
		const term = search.trim().toLowerCase();
		if (!term) return items;

		return items.filter((author) => {
			const displayName = author.displayName ?? "";
			const username = author.username ?? "";
			const bio = author.bio ?? "";
			return (
				displayName.toLowerCase().includes(term) ||
				username.toLowerCase().includes(term) ||
				bio.toLowerCase().includes(term)
			);
		});
	}, [authorsQuery.data, search]);

	return (
		<PageContainer
			title="Authors"
			description="Manage author profiles and permissions."
		>
			{/* Edit dialog */}
			<Dialog open={!!editingAuthor} onOpenChange={(open) => { if (!open) setEditingAuthor(null); }}>
				{editingAuthor && <EditAuthorDialog author={editingAuthor} onClose={() => setEditingAuthor(null)} />}
			</Dialog>

			{/* Tab bar */}
			<div className="flex gap-1 border-b border-border mb-6">
				<button
					type="button"
					onClick={() => setTab("authors")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "authors" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
				>
					Authors
				</button>
				<button
					type="button"
					onClick={() => setTab("applications")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "applications" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
				>
					<UserPlus className="h-3.5 w-3.5" />
					Applications
					{pendingCount > 0 && (
						<span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
							{pendingCount}
						</span>
					)}
				</button>
			</div>

			{/* Applications panel */}
			{tab === "applications" && (
				<div className="space-y-3">
					{applicationsQuery.isLoading && (
						<p className="text-sm text-muted-foreground py-8 text-center">Loading applications…</p>
					)}
					{!applicationsQuery.isLoading && pendingCount === 0 && (
						<p className="text-sm text-muted-foreground py-8 text-center">No pending author applications.</p>
					)}
					{pendingApplications.map((app: any) => (
						<div key={app.id} className="flex items-start gap-4 rounded-lg border border-border p-4 bg-card">
							<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
								{(app.displayName ?? app.username)?.[0]?.toUpperCase()}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<p className="text-sm font-medium text-foreground">{app.displayName ?? "—"}</p>
									<span className="text-xs text-muted-foreground">@{app.username}</span>
									{app.user?.email && (
										<span className="text-xs text-muted-foreground">{app.user.email}</span>
									)}
								</div>
								{app.bio && (
									<p className="text-xs text-muted-foreground mt-1 line-clamp-3">{app.bio}</p>
								)}
								<p className="text-[10px] text-muted-foreground mt-1">
									Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}
								</p>
							</div>
							<div className="flex items-center gap-2 flex-shrink-0">
								<button
									type="button"
									disabled={reviewMutation.isPending}
									onClick={() => reviewMutation.mutate({ userId: app.userId, action: "approve" })}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
								>
									<CheckCircle className="h-3.5 w-3.5" /> Approve
								</button>
								<button
									type="button"
									disabled={reviewMutation.isPending}
									onClick={() => reviewMutation.mutate({ userId: app.userId, action: "reject" })}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors disabled:opacity-50"
								>
									<XCircle className="h-3.5 w-3.5" /> Reject
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Authors list */}
			{tab === "authors" && (
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Author</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Posts</TableHead>
								<TableHead className="text-right">Views</TableHead>
								<TableHead className="text-right">Followers</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{authorsQuery.isLoading ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-32 text-center text-muted-foreground"
									>
										Loading authors…
									</TableCell>
								</TableRow>
							) : authorsQuery.isError ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-32 text-center text-destructive"
									>
										Failed to load authors.
									</TableCell>
								</TableRow>
							) : authors.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-32 text-center text-muted-foreground"
									>
										No authors found.
									</TableCell>
								</TableRow>
							) : (
								authors.map((author: AuthorProfile) => (
									<TableRow key={author.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="w-8 h-8">
													<AvatarImage
														src={author.avatarUrl ?? undefined}
														alt={author.displayName ?? author.username}
													/>
													<AvatarFallback className="text-xs">
														{(author.displayName ?? author.username)
															.slice(0, 2)
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-medium text-sm">
														{author.displayName ?? author.username}
													</p>
													<p className="text-xs text-muted-foreground">
														@{author.username}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="default" className="capitalize text-xs">
												active
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
												<FileText className="w-3.5 h-3.5" />
												{author.postCount ?? 0}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
												<Eye className="w-3.5 h-3.5" />
												{fmt(0)}
											</div>
										</TableCell>
										<TableCell className="text-right text-sm text-muted-foreground">
											{fmt(author.followersCount ?? 0)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(author.createdAt)}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon" className="h-8 w-8">
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem asChild className="gap-2">
														<Link to={`/@${author.username}` as string}>
															<ExternalLink className="w-4 h-4" /> View Profile
														</Link>
													</DropdownMenuItem>
												<DropdownMenuItem asChild className="gap-2">
													<Link to={ROUTES.ADMIN.USERS as string}>
														<ExternalLink className="w-4 h-4" /> View User Account
													</Link>
												</DropdownMenuItem>
													<DropdownMenuItem
														className="gap-2"
														onClick={() => setEditingAuthor(author as AuthorProfile)}
													>
														<Edit2 className="w-4 h-4" /> Edit Profile
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="gap-2 text-destructive focus:text-destructive"
														disabled
													>
														<UserX className="w-4 h-4" /> Suspend
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}
		</PageContainer>
	);
}
