import { useState } from "react";
import { Image, Search, X, Loader2, Check } from "lucide-react";
import { useAdminFiles } from "@/lib/storage/queries";
import { STORAGE_API } from "@/constants";
import { env } from "@/env/client";
import { withBasePath } from "@/lib/url/with-base-path";
import { formatFileSize } from "@/lib/storage/utils";

interface MediaPickerModalProps {
	onSelect: (url: string) => void;
	onClose: () => void;
}

export function MediaPickerModal({ onSelect, onClose }: MediaPickerModalProps) {
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [selected, setSelected] = useState<string | null>(null);

	const filesQuery = useAdminFiles({
		page: 1,
		limit: 50,
		category: "media",
		search: search || undefined,
	});

	const files = filesQuery.data?.ok
		? (filesQuery.data.data.items ?? []).filter((f) =>
				f.mimeType?.startsWith("image/"),
			)
		: [];

	function getFileUrl(f: { storageUrl?: string | null; storagePath?: string }) {
		if (f.storageUrl) return f.storageUrl;
		if (f.storagePath) {
			const path = withBasePath(
				env.VITE_BASE_URL,
				`${STORAGE_API.FILES}/${f.storagePath}`,
			);
			return path.startsWith("http")
				? path
				: `${window.location.origin}${path}`;
		}
		return null;
	}

	function handleConfirm() {
		if (selected) {
			onSelect(selected);
			onClose();
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
			<div className="w-full max-w-2xl mx-4 rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] shadow-2xl flex flex-col max-h-[80vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(216,33%,20%)]">
					<div className="flex items-center gap-2">
						<Image className="h-4 w-4 text-[hsl(199,89%,49%)]" />
						<span className="text-sm font-medium text-[hsl(216,100%,95%)]">
							Media Library
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-[hsl(217,17%,48%)] hover:text-[hsl(216,100%,95%)] transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Search */}
				<div className="px-4 py-3 border-b border-[hsl(216,33%,20%)]">
					<div className="flex items-center gap-2 rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] px-3 py-2">
						<Search className="h-4 w-4 text-[hsl(217,17%,48%)] shrink-0" />
						<input
							type="text"
							placeholder="Search images…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") setSearch(searchInput);
							}}
							className="flex-1 text-sm bg-transparent text-[hsl(216,100%,95%)] placeholder:text-[hsl(217,17%,30%)] outline-none"
						/>
					</div>
				</div>

				{/* Grid */}
				<div className="flex-1 overflow-y-auto p-4">
					{filesQuery.isLoading ? (
						<div className="flex items-center justify-center py-12 text-[hsl(217,17%,48%)]">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							Loading…
						</div>
					) : files.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-[hsl(217,17%,48%)]">
							<Image className="h-10 w-10 mb-2 opacity-40" />
							<p className="text-sm">No images found in media library</p>
						</div>
					) : (
						<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
							{files.map((f) => {
								const url = getFileUrl(f);
								if (!url) return null;
								const isSelected = selected === url;
								return (
									<button
										key={f.id}
										type="button"
										onClick={() => setSelected(isSelected ? null : url)}
										className={`relative rounded-lg overflow-hidden border-2 transition-all ${
											isSelected
												? "border-[hsl(199,89%,49%)] ring-2 ring-[hsl(199,89%,49%)]/30"
												: "border-[hsl(216,33%,20%)] hover:border-[hsl(216,33%,40%)]"
										}`}
									>
										<div className="aspect-square bg-[hsl(222,47%,11%)]">
											<img
												src={url}
												alt={f.originalName}
												className="w-full h-full object-cover"
											/>
										</div>
										{isSelected && (
											<div className="absolute inset-0 bg-[hsl(199,89%,49%)]/20 flex items-center justify-center">
												<div className="w-6 h-6 rounded-full bg-[hsl(199,89%,49%)] flex items-center justify-center">
													<Check className="h-3.5 w-3.5 text-white" />
												</div>
											</div>
										)}
										<div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
											<p className="text-[9px] text-white truncate">{f.originalName}</p>
											<p className="text-[8px] text-white/60">{formatFileSize(f.sizeBytes)}</p>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[hsl(216,33%,20%)]">
					<p className="text-xs text-[hsl(217,17%,48%)]">
						{selected ? "1 image selected" : `${files.length} image${files.length !== 1 ? "s" : ""}`}
					</p>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-1.5 rounded-md text-xs border border-[hsl(216,33%,20%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							disabled={!selected}
							onClick={handleConfirm}
							className="px-3 py-1.5 rounded-md text-xs navy-blue-blog-btn disabled:opacity-50"
						>
							Insert Image
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
