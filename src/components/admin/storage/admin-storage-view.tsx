import {
	File,
	FileIcon,
	FileText,
	Film,
	FolderOpen,
	HardDrive,
	Image,
	Loader2,
	Search,
	Trash2,
	Upload,
	User,
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
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { useFileUpload } from "@/hooks/use-file-upload";
import { $adminDeleteFile } from "@/lib/storage/server";
import { useAdminFiles } from "@/lib/storage/queries";
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

function getCategoryBadge(category: string | null) {
	switch (category) {
		case "avatar":
			return { label: "Avatar", variant: "secondary" as const, icon: User };
		case "media":
			return { label: "Media", variant: "default" as const, icon: Image };
		case "document":
			return { label: "Document", variant: "outline" as const, icon: FileText };
		case "attachment":
			return { label: "Attachment", variant: "outline" as const, icon: File };
		default:
			return { label: "Other", variant: "outline" as const, icon: File };
	}
}

const CATEGORY_TABS = [
	{ value: "all", label: "All Files", icon: FolderOpen },
	{ value: "media", label: "Media", icon: Image },
	{ value: "avatar", label: "Avatars", icon: User },
	{ value: "document", label: "Documents", icon: FileText },
	{ value: "attachment", label: "Attachments", icon: HardDrive },
] as const;

export function AdminStorageView() {
	const inputRef = useRef<HTMLInputElement>(null);
	const { upload, isUploading, progress } = useFileUpload("media");

	const [category, setCategory] = useState<string>("all");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const filesQuery = useAdminFiles({
		page,
		limit,
		category: category === "all" ? undefined : category,
		search: search || undefined,
	});

	const deleteFileMutation = useAction(
		async (vars: { fileId: string }) =>
			$adminDeleteFile({ data: vars }),
		{
			invalidate: [["admin", "files"]],
			showToast: true,
		},
	);

	const paged = filesQuery.data?.ok ? filesQuery.data.data : null;
	const files = paged?.items ?? [];
	const totalPages = paged?.totalPages ?? 1;
	const totalFiles = paged?.total ?? 0;

	const rows = useMemo(
		() =>
			files.map((f) => ({
				...f,
				createdAtLabel: formatDate(f.createdAt),
				categoryLabel: f.metadata?.category ?? null,
			})),
		[files],
	);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		upload(file);
		e.target.value = "";
	};

	const handleSearch = () => {
		setSearch(searchInput);
		setPage(1);
	};

	const handleCategoryChange = (value: string) => {
		setCategory(value);
		setPage(1);
	};

	return (
		<div className="space-y-6">
			<Tabs value={category} onValueChange={handleCategoryChange}>
				<div className="flex items-center justify-between gap-4">
					<TabsList>
						{CATEGORY_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								<tab.icon className="mr-2 h-4 w-4" />
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

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

				{/* All categories share the same content, filtered server-side */}
				{CATEGORY_TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value}>
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>{tab.label}</CardTitle>
										<CardDescription>
											{totalFiles} file{totalFiles !== 1 ? "s" : ""} total
										</CardDescription>
									</div>
									<div className="flex items-center gap-2">
										<Input
											placeholder="Search files..."
											value={searchInput}
											onChange={(e) => setSearchInput(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleSearch()}
											className="w-64"
										/>
										<Button
											variant="outline"
											size="icon"
											onClick={handleSearch}
										>
											<Search className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{filesQuery.isLoading ? (
									<div className="flex items-center gap-2 text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading files...
									</div>
								) : files.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-12 text-center">
										<FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
										<h3 className="text-lg font-semibold">No files found</h3>
										<p className="text-sm text-muted-foreground">
											{search
												? "Try a different search term"
												: "Upload files to get started"}
										</p>
									</div>
								) : (
									<div className="space-y-4">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>File</TableHead>
													<TableHead>Category</TableHead>
													<TableHead>Type</TableHead>
													<TableHead>Size</TableHead>
													<TableHead>Date</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{rows.map((f) => {
													const Icon = getFileIcon(f.mimeType);
													const badge = getFileTypeBadge(f.mimeType);
													const catBadge = getCategoryBadge(f.categoryLabel);
													const isImage = f.mimeType?.startsWith?.("image/");

													return (
														<TableRow key={f.id}>
															<TableCell>
																<div className="flex items-center gap-2">
																	{isImage && f.storageUrl ? (
																		<ThrottledImage
																			src={f.storageUrl}
																			alt={f.originalName}
																			className="h-8 w-8 rounded border object-cover"
																		/>
																	) : (
																		<Icon className="h-4 w-4 text-muted-foreground" />
																	)}
																	<span className="max-w-50 truncate font-medium">
																		{f.originalName}
																	</span>
																</div>
															</TableCell>
															<TableCell>
																<Badge variant={catBadge.variant}>
																	{catBadge.label}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge variant={badge.variant}>
																	{badge.label}
																</Badge>
															</TableCell>
															<TableCell className="text-muted-foreground">
																{formatFileSize(f.sizeBytes)}
															</TableCell>
															<TableCell className="text-muted-foreground">
																{f.createdAtLabel}
															</TableCell>
															<TableCell className="text-right">
																<AlertDialog>
																	<AlertDialogTrigger
																		render={
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-destructive hover:text-destructive"
																				disabled={deleteFileMutation.isPending}
																			>
																				<Trash2 className="h-4 w-4" />
																			</Button>
																		}
																	/>
																	<AlertDialogContent>
																		<AlertDialogHeader>
																			<AlertDialogTitle>
																				Delete File
																			</AlertDialogTitle>
																			<AlertDialogDescription>
																				Are you sure you want to delete "
																				{f.originalName}"? This will remove it
																				from storage permanently.
																			</AlertDialogDescription>
																		</AlertDialogHeader>
																		<AlertDialogFooter>
																			<AlertDialogCancel>
																				Cancel
																			</AlertDialogCancel>
																			<AlertDialogAction
																				onClick={() =>
																					deleteFileMutation.mutate({
																						fileId: f.id,
																					})
																				}
																				className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																			>
																				Delete
																			</AlertDialogAction>
																		</AlertDialogFooter>
																	</AlertDialogContent>
																</AlertDialog>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>

										{/* Pagination */}
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
														const nextPage =
															Math.floor(offset / newLimit) + 1;
														const nextTotalPages = Math.max(
															1,
															Math.ceil(totalFiles / newLimit),
														);
														setLimit(newLimit);
														setPage(
															Math.min(
																nextTotalPages,
																Math.max(1, nextPage),
															),
														);
													}}
												>
													<SelectTrigger className="h-8 w-20">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{[10, 20, 50, 100].map((size) => (
															<SelectItem
																key={size}
																value={String(size)}
															>
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
													onClick={() =>
														setPage((p) => Math.max(1, p - 1))
													}
													disabled={page <= 1}
												>
													Prev
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setPage((p) =>
															Math.min(totalPages, p + 1),
														)
													}
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
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
