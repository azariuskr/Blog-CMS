import {
	AlertCircle,
	CheckCircle2,
	CloudUpload,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import type { FileCategory, UploadResult } from "@/lib/storage/types";
import { uploadFile } from "@/lib/storage/upload";
import { formatFileSize } from "@/lib/storage/utils";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type QueueStatus = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
	file: File;
	progress: number;
	status: QueueStatus;
	error?: string;
}

interface MultiFileUploadProps {
	category?: FileCategory;
	accept?: string;
	selectLabel?: string;
	uploadLabel?: string;
	onUploadSuccess?: (files: UploadResult[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function MultiFileUpload({
	category = "attachment",
	accept,
	onUploadSuccess,
}: MultiFileUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [queue, setQueue] = useState<QueuedFile[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	// -------------------------------------------------------------------------
	// Queue helpers
	// -------------------------------------------------------------------------

	const stageFiles = useCallback((incoming: File[]) => {
		if (!incoming.length) return;
		setQueue((prev) => [
			...prev,
			...incoming.map((file) => ({
				file,
				progress: 0,
				status: "pending" as QueueStatus,
			})),
		]);
	}, []);

	const removeFromQueue = (index: number) => {
		setQueue((prev) => prev.filter((_, i) => i !== index));
	};

	const clearDone = () => {
		setQueue((prev) => prev.filter((q) => q.status === "pending"));
	};

	// -------------------------------------------------------------------------
	// Drag & drop
	// -------------------------------------------------------------------------

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDragging(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		stageFiles(Array.from(e.dataTransfer.files));
	};

	// -------------------------------------------------------------------------
	// File input
	// -------------------------------------------------------------------------

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		stageFiles(Array.from(e.target.files ?? []));
		e.target.value = "";
	};

	// -------------------------------------------------------------------------
	// Upload with per-file progress
	// -------------------------------------------------------------------------

	const handleUpload = async () => {
		const hasPending = queue.some((q) => q.status === "pending");
		if (!hasPending || isUploading) return;

		setIsUploading(true);
		const results: UploadResult[] = [];

		for (let i = 0; i < queue.length; i++) {
			if (queue[i].status !== "pending") continue;

			setQueue((prev) =>
				prev.map((item, idx) =>
					idx === i ? { ...item, status: "uploading" as QueueStatus } : item,
				),
			);

			try {
				const result = await uploadFile(queue[i].file, category, (progress) => {
					setQueue((prev) =>
						prev.map((item, idx) =>
							idx === i ? { ...item, progress: progress.percentage } : item,
						),
					);
				});

				results.push(result);

				setQueue((prev) =>
					prev.map((item, idx) =>
						idx === i
							? { ...item, status: "done" as QueueStatus, progress: 100 }
							: item,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Upload failed";
				setQueue((prev) =>
					prev.map((item, idx) =>
						idx === i
							? { ...item, status: "error" as QueueStatus, error: msg }
							: item,
					),
				);
			}
		}

		setIsUploading(false);
		if (results.length > 0) {
			onUploadSuccess?.(results);
		}
	};

	// -------------------------------------------------------------------------
	// Derived
	// -------------------------------------------------------------------------

	const pendingCount = queue.filter((q) => q.status === "pending").length;
	const doneCount = queue.filter((q) => q.status === "done").length;
	const errorCount = queue.filter((q) => q.status === "error").length;
	const hasQueue = queue.length > 0;

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	return (
		<div className="space-y-3">
			{/* Drop zone */}
			<button
				type="button"
				disabled={isUploading}
				className={cn(
					"w-full border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
					isDragging
						? "border-primary bg-primary/5"
						: "border-muted-foreground/25 hover:border-muted-foreground/50",
					isUploading && "pointer-events-none opacity-60",
				)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() => !isUploading && inputRef.current?.click()}
			>
				<div className="flex flex-col items-center gap-2 text-center pointer-events-none">
					<CloudUpload
						className={cn(
							"h-8 w-8 transition-colors",
							isDragging ? "text-primary" : "text-muted-foreground",
						)}
					/>
					<p className="text-sm font-medium">
						{isDragging
							? "Drop files here"
							: "Drag & drop files, or click to browse"}
					</p>
					<p className="text-xs text-muted-foreground">
						Select multiple files at once — all will be queued for upload
					</p>
				</div>
			</button>

			<input
				ref={inputRef}
				type="file"
				multiple
				accept={accept}
				onChange={handleFileInputChange}
				className="hidden"
			/>

			{/* Upload queue */}
			{hasQueue && (
				<div className="space-y-2">
					{/* File list */}
					<div className="divide-y rounded-md border">
						{queue.map((item, i) => (
							<div
								key={`${item.file.name}-${i}`}
								className="flex items-center gap-3 px-3 py-2"
							>
								{/* Status icon */}
								<div className="shrink-0">
									{item.status === "uploading" && (
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
									)}
									{item.status === "done" && (
										<CheckCircle2 className="h-4 w-4 text-green-500" />
									)}
									{item.status === "error" && (
										<AlertCircle className="h-4 w-4 text-destructive" />
									)}
									{item.status === "pending" && (
										<Upload className="h-4 w-4 text-muted-foreground" />
									)}
								</div>

								{/* File info + progress */}
								<div className="flex-1 min-w-0">
									<p
										className={cn(
											"text-sm truncate",
											item.status === "error" && "text-destructive",
										)}
									>
										{item.file.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatFileSize(item.file.size)}
										{item.status === "error" && item.error && (
											<span className="text-destructive ml-2">
												— {item.error}
											</span>
										)}
									</p>
									{item.status === "uploading" && (
										<ProgressBar value={item.progress} />
									)}
								</div>

								{/* Remove button (pending only) */}
								{item.status === "pending" && (
									<Button
										variant="ghost"
										size="icon"
										className="shrink-0 h-6 w-6"
										onClick={(e) => {
											e.stopPropagation();
											removeFromQueue(i);
										}}
									>
										<X className="h-3 w-3" />
									</Button>
								)}
							</div>
						))}
					</div>

					{/* Action row */}
					<div className="flex items-center gap-3">
						{pendingCount > 0 && (
							<Button onClick={handleUpload} disabled={isUploading}>
								{isUploading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Uploading…
									</>
								) : (
									<>
										<Upload className="mr-2 h-4 w-4" />
										Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
									</>
								)}
							</Button>
						)}

						{(doneCount > 0 || errorCount > 0) && (
							<>
								<span className="text-xs text-muted-foreground">
									{doneCount > 0 && `${doneCount} done`}
									{doneCount > 0 && errorCount > 0 && " · "}
									{errorCount > 0 && `${errorCount} failed`}
								</span>
								{pendingCount === 0 && (
									<Button
										variant="ghost"
										size="sm"
										onClick={clearDone}
										disabled={isUploading}
									>
										Clear
									</Button>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
