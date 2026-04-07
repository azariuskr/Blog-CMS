import { useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Copy,
	File,
	FileText,
	Film,
	FolderOpen,
	Grid2X2,
	HardDrive,
	Image,
	LayoutList,
	Loader2,
	Search,
	Trash2,
	UploadCloud,
	User,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MultiFileUpload } from "@/components/File";
import { ThrottledImage } from "@/components/shared/ThrottledImage";
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
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import {
	useAdminFiles,
	useFilesPaginated,
	useMyQuota,
	useUsersWithQuota,
} from "@/lib/storage/queries";
import { $adminDeleteFile, $deleteFile } from "@/lib/storage/server";
import type { FileCategory } from "@/lib/storage/types";
import { formatFileSize } from "@/lib/storage/utils";
import { formatDate, getPageNumbers } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ============================================================================
// Types
// ============================================================================

export interface MediaLibraryViewProps {
	mode: "admin" | "user";
}

type ViewMode = "grid" | "table";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_TABS = [
	{ value: "all", label: "All", icon: FolderOpen },
	{ value: "media", label: "Media", icon: Image },
	{ value: "avatar", label: "Avatars", icon: User },
	{ value: "document", label: "Docs", icon: FileText },
	{ value: "attachment", label: "Attachments", icon: HardDrive },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
	media:      { bg: "bg-[var(--bg-carolina-blue)]/20", text: "text-[var(--bg-carolina-blue)]",  label: "Media" },
	avatar:     { bg: "bg-purple-500/20",                text: "text-purple-400",                  label: "Avatar" },
	document:   { bg: "bg-amber-500/20",                 text: "text-amber-400",                   label: "Doc" },
	attachment: { bg: "bg-teal-500/20",                  text: "text-teal-400",                    label: "File" },
};

function getCategoryStyle(cat: string | null) {
	return CATEGORY_COLORS[cat ?? ""] ?? { bg: "bg-slate-500/20", text: "text-slate-400", label: "Other" };
}

function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return FileText;
	return File;
}

function getUploadCategoryForTab(tab: string): FileCategory {
	if (tab === "media" || tab === "document" || tab === "attachment") return tab as FileCategory;
	return "media";
}

// ============================================================================
// Quota bar (user mode)
// ============================================================================

function QuotaBar({
	usedBytes,
	limitBytes,
	percentUsed,
	planLabel,
	fileCount,
}: {
	usedBytes: number;
	limitBytes: number | null;
	percentUsed: number;
	planLabel: string;
	fileCount: number;
}) {
	const usedLabel = formatFileSize(usedBytes);
	const limitLabel = limitBytes ? formatFileSize(limitBytes) : "Unlimited";
	const barColor =
		percentUsed >= 90 ? "bg-red-500" :
		percentUsed >= 70 ? "bg-amber-500" :
		"bg-[var(--bg-carolina-blue)]";

	return (
		<div className="rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-4">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<HardDrive className="w-4 h-4 text-[var(--text-wild-blue-yonder)]" />
					<span className="text-sm font-medium text-[var(--text-alice-blue)]">Storage</span>
					<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-prussian-blue)] text-[var(--text-wild-blue-yonder)]">
						{planLabel}
					</span>
				</div>
				<span className="text-xs text-[var(--text-slate-gray)]">
					{fileCount} file{fileCount !== 1 ? "s" : ""}
				</span>
			</div>
			{limitBytes !== null ? (
				<>
					<div className="w-full h-1.5 rounded-full bg-[var(--bg-prussian-blue)] overflow-hidden">
						<div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percentUsed}%` }} />
					</div>
					<div className="flex items-center justify-between mt-1.5">
						<span className="text-xs text-[var(--text-slate-gray)]">{usedLabel} used</span>
						<span className="text-xs text-[var(--text-slate-gray)]">{limitLabel} total</span>
					</div>
					{percentUsed >= 90 && (
						<p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
							<AlertCircle className="w-3 h-3 shrink-0" />
							{percentUsed >= 100
								? "Storage full — delete files or upgrade your plan."
								: "Storage almost full — delete files or upgrade your plan."}
						</p>
					)}
				</>
			) : (
				<p className="text-xs text-[var(--text-slate-gray)] mt-1">{usedLabel} used · {limitLabel}</p>
			)}
		</div>
	);
}

// ============================================================================
// User picker with quota indicators (admin mode)
// ============================================================================

function QuotaDot({ percent }: { percent: number }) {
	const color = percent >= 100 ? "bg-red-500" : percent >= 70 ? "bg-amber-400" : "bg-emerald-400";
	return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} title={`${percent}% used`} />;
}

function UserPicker({
	selectedUserId,
	onChange,
}: {
	selectedUserId: string | null;
	onChange: (id: string | null) => void;
}) {
	const { data, isLoading } = useUsersWithQuota();
	const users = data?.ok ? data.data : [];

	return (
		<Select
			value={selectedUserId ?? "__all__"}
			onValueChange={(v) => onChange(v === "__all__" ? null : v)}
		>
			<SelectTrigger className="w-56 h-8 text-xs bg-[var(--bg-oxford-blue-2)] border-[var(--bg-prussian-blue)] text-[var(--text-alice-blue)]">
				<SelectValue placeholder={isLoading ? "Loading…" : "All users"} />
			</SelectTrigger>
			<SelectContent className="bg-[var(--bg-oxford-blue)] border-[var(--bg-prussian-blue)] max-h-72">
				<SelectItem value="__all__" className="text-xs text-[var(--text-alice-blue)]">
					All users
				</SelectItem>
				{users.map((u) => (
					<SelectItem key={u.id} value={u.id} className="text-xs text-[var(--text-alice-blue)]">
						<div className="flex items-center gap-2 min-w-0">
							<QuotaDot percent={u.percentUsed} />
							<span className="truncate max-w-32">{u.name ?? u.email}</span>
							<span className="ml-auto text-[var(--text-slate-gray)] shrink-0">{u.percentUsed}%</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

// ============================================================================
// Grid card
// ============================================================================

function MediaCard({
	file: f,
	onCopy,
	onDelete,
	isDeleting,
}: {
	file: {
		id: string;
		originalName: string;
		mimeType: string;
		sizeBytes: number;
		storageUrl?: string | null;
		metadata?: { category?: string } | null;
	};
	onCopy: (url: string) => void;
	onDelete: (id: string) => void;
	isDeleting: boolean;
}) {
	const cat = getCategoryStyle(f.metadata?.category ?? null);
	const isImage = f.mimeType?.startsWith("image/");
	const Icon = getFileIcon(f.mimeType);

	return (
		<div className="group relative rounded-lg overflow-hidden border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] aspect-square">
			{/* Thumbnail */}
			{isImage && f.storageUrl ? (
				<ThrottledImage src={f.storageUrl} alt={f.originalName} className="w-full h-full object-cover" />
			) : (
				<div className="w-full h-full flex items-center justify-center">
					<Icon className="w-7 h-7 text-[var(--text-slate-gray)]" />
				</div>
			)}

			{/* Category badge — always visible */}
			<span className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>
				{cat.label}
			</span>

			{/* Hover overlay */}
			<div className="absolute inset-0 bg-[var(--bg-oxford-blue-2)]/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
				<p className="text-[9px] text-[var(--text-wild-blue-yonder)] text-center line-clamp-2 leading-tight px-1">
					{f.originalName}
				</p>
				<p className="text-[9px] text-[var(--text-slate-gray)]">{formatFileSize(f.sizeBytes)}</p>
				<div className="flex items-center gap-1.5 mt-0.5">
					{f.storageUrl && (
						<button
							type="button"
							onClick={() => onCopy(f.storageUrl!)}
							className="p-1.5 rounded bg-[var(--bg-prussian-blue)] hover:bg-[var(--bg-carolina-blue)] transition-colors"
							title="Copy URL"
						>
							<Copy className="w-3 h-3 text-white" />
						</button>
					)}
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<button
								type="button"
								className="p-1.5 rounded bg-[var(--bg-prussian-blue)] hover:bg-red-500/80 transition-colors"
								title="Delete"
								disabled={isDeleting}
							>
								<Trash2 className="w-3 h-3 text-white" />
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete file?</AlertDialogTitle>
								<AlertDialogDescription>
									This permanently deletes <strong>{f.originalName}</strong>. If it's used in any published post, it will break.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => onDelete(f.id)} className="bg-red-600 hover:bg-red-700">
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Main component
// ============================================================================

export function MediaLibraryView({ mode }: MediaLibraryViewProps) {
	const queryClient = useQueryClient();

	const [category, setCategory] = useState<string>("all");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);
	const [limit] = useState(24);
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [showUpload, setShowUpload] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // admin only

	const uploadCategory = getUploadCategoryForTab(category);

	// ── Quota (user mode only) ──
	const quotaQuery = useMyQuota();
	const quota = mode === "user" && quotaQuery.data?.ok ? quotaQuery.data.data : null;
	const isAtQuota = quota ? quota.percentUsed >= 100 : false;

	// ── Files query ──
	const adminFilesQuery = useAdminFiles(
		mode === "admin"
			? { page, limit, category: category === "all" ? undefined : category, search: search || undefined, userId: selectedUserId ?? undefined }
			: { page: 1, limit: 1 }, // dummy — not used
	);
	const userFilesQuery = useFilesPaginated(
		mode === "user" ? { page, limit } : { page: 1, limit: 1 },
	);

	const filesQuery = mode === "admin" ? adminFilesQuery : userFilesQuery;
	const paged = filesQuery.data?.ok ? filesQuery.data.data : null;
	const allFiles = paged?.items ?? [];

	// client-side category + search filter for user mode (server does it for admin mode)
	const files = useMemo(() => {
		if (mode === "admin") return allFiles;
		return allFiles.filter((f) => {
			const cat = (f as { metadata?: { category?: string } }).metadata?.category ?? null;
			if (category !== "all" && cat !== category) return false;
			if (search) {
				const q = search.toLowerCase();
				if (!(f.originalName?.toLowerCase().includes(q) || f.filename?.toLowerCase().includes(q))) return false;
			}
			return true;
		});
	}, [allFiles, category, search, mode]);

	const totalPages = paged?.totalPages ?? 1;
	const totalFiles = paged?.total ?? 0;
	const pageNumbers = getPageNumbers(page, Math.max(1, totalPages));

	// ── Actions ──
	const adminDeleteAction = useAction(
		async (vars: { fileId: string }) => $adminDeleteFile({ data: vars }),
		{ invalidate: [["admin", "files"]], showToast: true },
	);
	const userDeleteAction = useAction(
		async (vars: { fileId: string }) => $deleteFile({ data: vars }),
	);

	async function handleDelete(fileId: string) {
		if (mode === "admin") {
			adminDeleteAction.mutate({ fileId });
		} else {
			const result = await userDeleteAction.mutateAsync({ fileId });
			if (result?.ok) {
				toast.success("File deleted");
				queryClient.invalidateQueries({ queryKey: ["files"] });
				queryClient.invalidateQueries({ queryKey: ["storage", "my-quota"] });
			} else {
				toast.error("Failed to delete file");
			}
		}
	}

	function handleUploadSuccess() {
		setShowUpload(false);
		if (mode === "admin") {
			queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
		} else {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["storage", "my-quota"] });
		}
	}

	async function handleCopyUrl(url: string) {
		const finalUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
		try {
			await navigator.clipboard.writeText(finalUrl);
			toast.success("URL copied");
		} catch {
			toast.error("Clipboard access failed");
		}
	}

	function handleCategoryChange(value: string) {
		setCategory(value);
		setPage(1);
	}

	function handleSearch() {
		setSearch(searchInput);
		setPage(1);
	}

	const isDeleting = adminDeleteAction.isPending || userDeleteAction.isPending;

	// ── Render ──
	return (
		<div className="space-y-4">
			{/* Quota bar — user mode */}
			{quota && (
				<QuotaBar
					usedBytes={quota.usedBytes}
					limitBytes={quota.limitBytes}
					percentUsed={quota.percentUsed}
					planLabel={quota.planLabel}
					fileCount={quota.fileCount}
				/>
			)}

			{/* Category tabs */}
			<Tabs value={category} onValueChange={handleCategoryChange}>
				<div className="flex items-center gap-3 flex-wrap">
					<TabsList className="bg-[var(--bg-oxford-blue)] border border-[var(--bg-prussian-blue)] h-8">
						{CATEGORY_TABS.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="text-xs h-7 px-2.5 data-[state=active]:bg-[var(--bg-prussian-blue)] data-[state=active]:text-[var(--text-alice-blue)]"
							>
								<tab.icon className="mr-1.5 h-3 w-3" />
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					{/* Admin user picker */}
					{mode === "admin" && (
						<UserPicker selectedUserId={selectedUserId} onChange={(id) => { setSelectedUserId(id); setPage(1); }} />
					)}

					{/* Search */}
					<div className="flex items-center gap-1.5 ml-auto">
						<div className="flex items-center gap-1 rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] px-2.5 py-1">
							<Search className="h-3 w-3 text-[var(--text-slate-gray)] shrink-0" />
							<input
								type="text"
								placeholder="Search…"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								className="text-xs bg-transparent text-[var(--text-alice-blue)] placeholder:text-[var(--text-slate-dim)] outline-none w-36"
							/>
							{searchInput && (
								<button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
									<X className="h-3 w-3 text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)]" />
								</button>
							)}
						</div>

						{/* View toggle */}
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`p-1.5 rounded border transition-colors ${viewMode === "grid" ? "border-[var(--bg-carolina-blue)] text-[var(--bg-carolina-blue)]" : "border-[var(--bg-prussian-blue)] text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)]"}`}
							title="Grid view"
						>
							<Grid2X2 className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`p-1.5 rounded border transition-colors ${viewMode === "table" ? "border-[var(--bg-carolina-blue)] text-[var(--bg-carolina-blue)]" : "border-[var(--bg-prussian-blue)] text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)]"}`}
							title="List view"
						>
							<LayoutList className="w-3.5 h-3.5" />
						</button>

						{/* Upload toggle */}
						<button
							type="button"
							onClick={() => setShowUpload((v) => !v)}
							disabled={isAtQuota}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-xs font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{showUpload ? <X className="w-3 h-3" /> : <UploadCloud className="w-3 h-3" />}
							{showUpload ? "Cancel" : "Upload"}
						</button>
					</div>
				</div>

				{/* Upload zone */}
				{showUpload && !isAtQuota && (
					<div className="rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-4 mt-3">
						<p className="text-xs text-[var(--text-slate-gray)] mb-3">
							Uploading to <span className="font-medium text-[var(--text-wild-blue-yonder)]">{uploadCategory}</span> bucket
						</p>
						<MultiFileUpload
							category={uploadCategory}
							accept="image/*,video/*,application/pdf,text/plain"
							onUploadSuccess={handleUploadSuccess}
						/>
					</div>
				)}

				{/* Quota-reached gate */}
				{isAtQuota && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mt-3 flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
						<div>
							<p className="text-sm font-medium text-red-400">Storage limit reached</p>
							<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">Delete files or upgrade your plan to upload more.</p>
						</div>
					</div>
				)}

				{/* Content for every tab (shared grid/table) */}
				{CATEGORY_TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="mt-4">
						{filesQuery.isLoading ? (
							<div className="flex items-center justify-center py-16">
								<Loader2 className="w-5 h-5 animate-spin text-[var(--text-wild-blue-yonder)]" />
							</div>
						) : files.length === 0 ? (
							<div className="rounded-xl border border-dashed border-[var(--bg-prussian-blue)] py-14 flex flex-col items-center gap-2 text-center">
								<Image className="w-9 h-9 text-[var(--bg-prussian-blue-dark)]" />
								<p className="text-sm font-medium text-[var(--text-alice-blue)]">No files</p>
								<p className="text-xs text-[var(--text-slate-gray)]">
									{search ? "Try a different search term" : "Upload files to get started"}
								</p>
							</div>
						) : viewMode === "grid" ? (
							<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
								{files.map((f) => (
									<MediaCard
										key={f.id}
										file={{
											...f,
											metadata: (f as { metadata?: { category?: string } | null }).metadata ?? null,
										}}
										onCopy={handleCopyUrl}
										onDelete={handleDelete}
										isDeleting={isDeleting}
									/>
								))}
							</div>
						) : (
							<div className="rounded-xl border border-[var(--bg-prussian-blue)] overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow className="border-[var(--bg-prussian-blue)] hover:bg-transparent">
											<TableHead className="text-[var(--text-wild-blue-yonder)] text-xs">File</TableHead>
											<TableHead className="text-[var(--text-wild-blue-yonder)] text-xs">Category</TableHead>
											<TableHead className="text-[var(--text-wild-blue-yonder)] text-xs">Size</TableHead>
											<TableHead className="text-[var(--text-wild-blue-yonder)] text-xs">Date</TableHead>
											<TableHead className="text-right text-[var(--text-wild-blue-yonder)] text-xs">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{files.map((f) => {
											const cat = getCategoryStyle((f as { metadata?: { category?: string } }).metadata?.category ?? null);
											const isImg = f.mimeType?.startsWith("image/");
											const Icon = getFileIcon(f.mimeType);
											return (
												<TableRow key={f.id} className="border-[var(--bg-prussian-blue)] hover:bg-[var(--bg-prussian-blue)]/30">
													<TableCell>
														<div className="flex items-center gap-2">
															{isImg && f.storageUrl ? (
																<ThrottledImage src={f.storageUrl} alt={f.originalName} className="h-7 w-7 rounded border border-[var(--bg-prussian-blue)] object-cover shrink-0" />
															) : (
																<Icon className="h-4 w-4 text-[var(--text-slate-gray)] shrink-0" />
															)}
															<span className="text-xs text-[var(--text-alice-blue)] max-w-40 truncate">{f.originalName}</span>
														</div>
													</TableCell>
													<TableCell>
														<span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>
															{cat.label}
														</span>
													</TableCell>
													<TableCell className="text-xs text-[var(--text-slate-gray)]">{formatFileSize(f.sizeBytes)}</TableCell>
													<TableCell className="text-xs text-[var(--text-slate-gray)]">{formatDate(f.createdAt)}</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-1">
															{f.storageUrl && (
																<button type="button" onClick={() => handleCopyUrl(f.storageUrl!)} className="p-1.5 rounded hover:bg-[var(--bg-prussian-blue)] transition-colors" title="Copy URL">
																	<Copy className="w-3.5 h-3.5 text-[var(--text-slate-gray)]" />
																</button>
															)}
															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<button type="button" className="p-1.5 rounded hover:bg-red-500/20 transition-colors" title="Delete" disabled={isDeleting}>
																		<Trash2 className="w-3.5 h-3.5 text-[var(--text-slate-gray)] hover:text-red-400" />
																	</button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>Delete file?</AlertDialogTitle>
																		<AlertDialogDescription>
																			This permanently deletes <strong>{f.originalName}</strong>.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>Cancel</AlertDialogCancel>
																		<AlertDialogAction onClick={() => handleDelete(f.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-4 px-1">
								<span className="text-xs text-[var(--text-slate-gray)]">
									{totalFiles} file{totalFiles !== 1 ? "s" : ""} · page {page} of {Math.max(1, totalPages)}
								</span>
								<div className="flex items-center gap-1">
									<Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(1)} disabled={page <= 1}>
										<ChevronsLeft className="h-3.5 w-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
										<ChevronLeft className="h-3.5 w-3.5" />
									</Button>
									{pageNumbers.map((n, i) =>
										n === "..." ? (
											<span key={`e-${i}`} className="text-xs text-[var(--text-slate-gray)] px-1">…</span>
										) : typeof n === "number" ? (
											<Button
												key={n}
												variant={page === n ? "default" : "outline"}
												className="h-7 min-w-7 px-2 text-xs"
												onClick={() => setPage(n)}
											>
												{n}
											</Button>
										) : null,
									)}
									<Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
										<ChevronRight className="h-3.5 w-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="h-7 w-7 hidden lg:flex" onClick={() => setPage(Math.max(1, totalPages))} disabled={page >= totalPages}>
										<ChevronsRight className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						)}
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
