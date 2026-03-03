import {
	Download,
	File,
	FileIcon,
	FileText,
	Film,
	Image,
	Loader2,
	Trash2,
	Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useDeleteFile,
	useFileUpload,
	useGetDownloadUrl,
} from "@/hooks/use-file-upload";
import { unwrap } from "@/lib/result";
import { useFilesPaginated } from "@/lib/storage/queries";
import { formatFileSize } from "@/lib/storage/utils";
import { formatDate } from "@/lib/utils";

function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return FileText;
	return File;
}

function getFileTypeBadge(mimeType: string) {
	if (mimeType.startsWith("image/"))
		return { label: "Image", variant: "default" as const };
	if (mimeType.startsWith("video/"))
		return { label: "Video", variant: "secondary" as const };
	if (mimeType.includes("pdf"))
		return { label: "PDF", variant: "outline" as const };
	if (mimeType.startsWith("text/"))
		return { label: "Text", variant: "outline" as const };
	return { label: "File", variant: "outline" as const };
}

export function FileManager() {
	const inputRef = useRef<HTMLInputElement>(null);
	const { upload, isUploading, progress } = useFileUpload("attachment");
	const deleteFile = useDeleteFile();
	const downloadUrl = useGetDownloadUrl();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const filesQuery = useFilesPaginated({ page, limit });
	const paged = filesQuery.data?.ok ? filesQuery.data.data : null;
	const files = paged?.items ?? [];
	const rows = useMemo(
		() => files.map((f) => ({ ...f, createdAtLabel: formatDate(f.createdAt) })),
		[files],
	);
	const totalPages = paged?.totalPages ?? 1;

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		upload(file);
		e.target.value = "";
	};

	const handleDownload = async (fileId: string, fileName: string) => {
		try {
			const result = await downloadUrl.mutateAsync({ fileId });
			const { url } = unwrap(result);

			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error("Failed to get download URL:", error);
		}
	};

	const handleDelete = async (fileId: string) => {
		await deleteFile.mutateAsync({ fileId });
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Files</CardTitle>
						<CardDescription>Manage your uploaded files</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<input
							ref={inputRef}
							type="file"
							onChange={handleFileSelect}
							className="hidden"
						/>
						<Button
							onClick={() => inputRef.current?.click()}
							disabled={isUploading}
						>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload File
								</>
							)}
						</Button>
					</div>
				</div>

				{isUploading && (
					<div className="mt-4">
						<ProgressBar value={progress} />
					</div>
				)}
			</CardHeader>

			<CardContent>
				{filesQuery.isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading files...
					</div>
				) : filesQuery.isError ? (
					<div className="text-sm text-destructive">Failed to load files</div>
				) : files.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold">No files uploaded</h3>
						<p className="text-sm text-muted-foreground">
							Upload your first file to get started
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>File</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Size</TableHead>
									<TableHead>Date</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((file) => {
									const Icon = getFileIcon(file.mimeType);
									const badge = getFileTypeBadge(file.mimeType);
									const isImage = file.mimeType?.startsWith?.("image/");

									return (
										<TableRow key={file.id}>
											<TableCell>
												<div className="flex items-center gap-2">
													{isImage && file.storageUrl ? (
														<ThrottledImage
															src={file.storageUrl}
															alt={file.originalName}
															className="h-8 w-8 rounded border object-cover"
														/>
													) : (
														<Icon className="h-4 w-4 text-muted-foreground" />
													)}
													<span className="max-w-50 truncate font-medium">
														{file.originalName}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={badge.variant}>{badge.label}</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{formatFileSize(file.sizeBytes)}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{file.createdAtLabel}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															handleDownload(file.id, file.originalName)
														}
														disabled={downloadUrl.isPending}
													>
														<Download className="h-4 w-4" />
													</Button>

													<AlertDialog>
														<AlertDialogTrigger
															render={
																<Button
																	variant="ghost"
																	size="icon"
																	className="text-destructive hover:text-destructive"
																	disabled={deleteFile.isPending}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															}
														/>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Delete File</AlertDialogTitle>
																<AlertDialogDescription>
																	Are you sure you want to delete "
																	{file.originalName}"? This action cannot be
																	undone.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancel</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDelete(file.id)}
																	className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																>
																	Delete
																</AlertDialogAction>
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

						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Rows per page
								</span>
								<Select
									value={String(limit)}
									onValueChange={(value) => {
										const newLimit = Number(value);

										const offset = (page - 1) * limit;
										const nextPage = Math.floor(offset / newLimit) + 1;
										const total = paged?.total ?? 0;
										const nextTotalPages = Math.max(
											1,
											Math.ceil(total / newLimit),
										);

										setLimit(newLimit);
										setPage(Math.min(nextTotalPages, Math.max(1, nextPage)));
									}}
								>
									<SelectTrigger className="h-8 w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[10, 20, 50, 100].map((size) => (
											<SelectItem key={size} value={String(size)}>
												{size}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">
									Page {page} of {Math.max(1, totalPages)}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage(1)}
									disabled={page <= 1}
								>
									First
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page <= 1}
								>
									Prev
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page >= totalPages}
								>
									Next
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage(totalPages)}
									disabled={page >= totalPages}
								>
									Last
								</Button>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
