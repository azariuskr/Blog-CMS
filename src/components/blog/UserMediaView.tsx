import { useState } from "react";
import { Copy, HardDrive, Image, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
import { useAction } from "@/hooks/use-action";
import { useFilesPaginated, useMyQuota } from "@/lib/storage/queries";
import { $deleteFile } from "@/lib/storage/server";
import { formatFileSize } from "@/lib/storage/utils";

// ────────────────────────────────────────────────────────────────────────────
// Quota bar
// ────────────────────────────────────────────────────────────────────────────

function QuotaBar({ usedBytes, limitBytes, percentUsed, planLabel, fileCount }: {
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
		<div className="rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-5">
			<div className="flex items-center justify-between mb-3">
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
					<div className="w-full h-2 rounded-full bg-[var(--bg-prussian-blue)] overflow-hidden">
						<div
							className={`h-full rounded-full transition-all ${barColor}`}
							style={{ width: `${percentUsed}%` }}
						/>
					</div>
					<div className="flex items-center justify-between mt-2">
						<span className="text-xs text-[var(--text-slate-gray)]">{usedLabel} used</span>
						<span className="text-xs text-[var(--text-slate-gray)]">{limitLabel} total</span>
					</div>
					{percentUsed >= 90 && (
						<p className="text-xs text-red-400 mt-2">
							Storage almost full — delete files or upgrade your plan.
						</p>
					)}
				</>
			) : (
				<p className="text-xs text-[var(--text-slate-gray)] mt-1">{usedLabel} used · {limitLabel}</p>
			)}
		</div>
	);
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function UserMediaView() {
	const [page, setPage] = useState(1);
	const [showUpload, setShowUpload] = useState(false);

	const queryClient = useQueryClient();
	const quotaQuery = useMyQuota();
	const filesQuery = useFilesPaginated({ page, limit: 20 });
	const deleteAction = useAction($deleteFile);

	const quota = quotaQuery.data?.ok ? quotaQuery.data.data : null;
	const filesData = filesQuery.data?.ok ? filesQuery.data.data : null;
	const files: any[] = filesData?.items ?? [];
	const totalPages = filesData?.totalPages ?? 1;

	function handleUploadComplete() {
		setShowUpload(false);
		queryClient.invalidateQueries({ queryKey: ["files"] });
		queryClient.invalidateQueries({ queryKey: ["storage", "my-quota"] });
	}

	async function handleDelete(fileId: string) {
		const result = await deleteAction.execute({ fileId });
		if (result?.ok) {
			toast.success("File deleted");
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["storage", "my-quota"] });
		} else {
			toast.error("Failed to delete file");
		}
	}

	function copyUrl(url: string) {
		navigator.clipboard.writeText(url).then(() => toast.success("URL copied"));
	}

	return (
		<div className="space-y-6">
			{/* Quota bar */}
			{quota && (
				<QuotaBar
					usedBytes={quota.usedBytes}
					limitBytes={quota.limitBytes}
					percentUsed={quota.percentUsed}
					planLabel={quota.planLabel}
					fileCount={quota.fileCount}
				/>
			)}

			{/* Upload toggle */}
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-[var(--text-alice-blue)]">My Images</h2>
				<button
					type="button"
					onClick={() => setShowUpload((v) => !v)}
					className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors"
				>
					<UploadCloud className="w-4 h-4" />
					{showUpload ? "Cancel" : "Upload Image"}
				</button>
			</div>

			{/* Upload area */}
			{showUpload && (
				<div className="rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-5">
					<MultiFileUpload
						category="media"
						onUploadComplete={handleUploadComplete}
					/>
				</div>
			)}

			{/* File grid */}
			{filesQuery.isLoading ? (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="w-6 h-6 animate-spin text-[var(--text-wild-blue-yonder)]" />
				</div>
			) : files.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--bg-prussian-blue)] py-16 flex flex-col items-center gap-3 text-center">
					<Image className="w-10 h-10 text-[var(--bg-prussian-blue-dark)]" />
					<p className="text-sm font-medium text-[var(--text-alice-blue)]">No images yet</p>
					<p className="text-xs text-[var(--text-slate-gray)]">Upload your first image to use in your posts.</p>
					<button
						type="button"
						onClick={() => setShowUpload(true)}
						className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors"
					>
						<UploadCloud className="w-4 h-4" /> Upload Image
					</button>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
					{files.map((f: any) => (
						<div
							key={f.id}
							className="group relative rounded-xl overflow-hidden border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] aspect-square"
						>
							{f.mimeType?.startsWith("image/") ? (
								<ThrottledImage
									src={f.storageUrl}
									alt={f.originalName}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<Image className="w-8 h-8 text-[var(--text-slate-gray)]" />
								</div>
							)}

							{/* Hover overlay */}
							<div className="absolute inset-0 bg-[var(--bg-oxford-blue-2)]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
								<p className="text-[10px] text-[var(--text-wild-blue-yonder)] text-center line-clamp-2 leading-tight">
									{f.originalName}
								</p>
								<p className="text-[10px] text-[var(--text-slate-gray)]">
									{formatFileSize(f.sizeBytes)}
								</p>
								<div className="flex items-center gap-2 mt-1">
									<button
										type="button"
										onClick={() => copyUrl(f.storageUrl)}
										className="p-1.5 rounded-lg bg-[var(--bg-prussian-blue)] hover:bg-[var(--bg-carolina-blue)] transition-colors"
										title="Copy URL"
									>
										<Copy className="w-3.5 h-3.5 text-white" />
									</button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<button
												type="button"
												className="p-1.5 rounded-lg bg-[var(--bg-prussian-blue)] hover:bg-red-500/80 transition-colors"
												title="Delete"
											>
												<Trash2 className="w-3.5 h-3.5 text-white" />
											</button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete image?</AlertDialogTitle>
												<AlertDialogDescription>
													This will permanently delete <strong>{f.originalName}</strong>.
													If this image is used in any published post, it will break.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => handleDelete(f.id)}
													className="bg-red-600 hover:bg-red-700"
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
						className="px-3 py-1.5 rounded-lg border border-[var(--bg-prussian-blue)] text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						← Prev
					</button>
					<span className="text-sm text-[var(--text-slate-gray)]">
						{page} / {totalPages}
					</span>
					<button
						type="button"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
						className="px-3 py-1.5 rounded-lg border border-[var(--bg-prussian-blue)] text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						Next →
					</button>
				</div>
			)}
		</div>
	);
}
