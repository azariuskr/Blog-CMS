import { useState } from "react";
import { Image, Search, X, Loader2, Check } from "lucide-react";
import { useFilesPaginated } from "@/lib/storage/queries";
import { formatFileSize } from "@/lib/storage/utils";

interface MediaPickerModalProps {
	onSelect: (url: string) => void;
	onClose: () => void;
}

export function MediaPickerModal({ onSelect, onClose }: MediaPickerModalProps) {
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [selected, setSelected] = useState<string | null>(null);

	const filesQuery = useFilesPaginated({ page: 1, limit: 50 });

	const files = filesQuery.data?.ok
		? (filesQuery.data.data.items ?? []).filter(
				(f) => f.mimeType?.startsWith("image/") &&
					(!search || f.originalName?.toLowerCase().includes(search.toLowerCase())),
			)
		: [];

function handleConfirm() {
		if (selected) {
			onSelect(selected);
			onClose();
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
			<div className="w-full max-w-2xl mx-4 rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] shadow-2xl flex flex-col max-h-[80vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-prussian-blue)]">
					<div className="flex items-center gap-2">
						<Image className="h-4 w-4 text-[var(--bg-carolina-blue)]" />
						<span className="text-sm font-medium text-[var(--text-alice-blue)]">
							Media Library
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Search */}
				<div className="px-4 py-3 border-b border-[var(--bg-prussian-blue)]">
					<div className="flex items-center gap-2 rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] px-3 py-2">
						<Search className="h-4 w-4 text-[var(--text-slate-gray)] shrink-0" />
						<input
							type="text"
							placeholder="Search images…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") setSearch(searchInput);
							}}
							className="flex-1 text-sm bg-transparent text-[var(--text-alice-blue)] placeholder:text-[var(--text-slate-dim)] outline-none"
						/>
					</div>
				</div>

				{/* Grid */}
				<div className="flex-1 overflow-y-auto p-4">
					{filesQuery.isLoading ? (
						<div className="flex items-center justify-center py-12 text-[var(--text-slate-gray)]">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							Loading…
						</div>
					) : files.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-[var(--text-slate-gray)]">
							<Image className="h-10 w-10 mb-2 opacity-40" />
							<p className="text-sm">No images found in media library</p>
						</div>
					) : (
						<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
							{files.map((f) => {
								const url = f.storageUrl ?? null;
								if (!url) return null;
								const isSelected = selected === url;
								return (
									<button
										key={f.id}
										type="button"
										onClick={() => setSelected(isSelected ? null : url)}
										className={`relative rounded-lg overflow-hidden border-2 transition-all ${
											isSelected
												? "border-[var(--bg-carolina-blue)] ring-2 ring-[var(--bg-carolina-blue)]/30"
												: "border-[var(--bg-prussian-blue)] hover:border-[var(--text-prussian-mid)]"
										}`}
									>
										<div className="aspect-square bg-[var(--bg-oxford-blue-2)]">
											<img
												src={url}
												alt={f.originalName}
												className="w-full h-full object-cover"
											/>
										</div>
										{isSelected && (
											<div className="absolute inset-0 bg-[var(--bg-carolina-blue)]/20 flex items-center justify-center">
												<div className="w-6 h-6 rounded-full bg-[var(--bg-carolina-blue)] flex items-center justify-center">
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
				<div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--bg-prussian-blue)]">
					<p className="text-xs text-[var(--text-slate-gray)]">
						{selected ? "1 image selected" : `${files.length} image${files.length !== 1 ? "s" : ""}`}
					</p>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-1.5 rounded-md text-xs border border-[var(--bg-prussian-blue)] text-[var(--text-wild-blue-yonder)] hover:border-[var(--bg-carolina-blue)] hover:text-[var(--bg-carolina-blue)] transition-colors"
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
