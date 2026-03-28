import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/storage/upload";
import { toast } from "sonner";

interface FeaturedImageUploaderProps {
	value: string;
	onChange: (url: string) => void;
}

export function FeaturedImageUploader({ value, onChange }: FeaturedImageUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);

	async function handleFile(file: File) {
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file.");
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			toast.error("Image must be smaller than 10 MB.");
			return;
		}
		setUploading(true);
		setProgress(0);
		try {
			const result = await uploadFile(file, "media", (p) => setProgress(p.percentage));
			onChange(result.url);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed.");
		} finally {
			setUploading(false);
			setProgress(0);
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	}

	return (
		<div className="space-y-1.5">
			<label className="text-xs font-medium text-[var(--text-columbia-blue)]">Featured Image</label>
			{value ? (
				<div className="relative rounded-lg overflow-hidden border border-[var(--bg-prussian-blue)] group">
					<img
						src={value}
						alt="Featured"
						className="w-full h-28 object-cover"
						onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
					/>
					<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="text-xs text-white bg-[var(--bg-carolina-blue)] px-3 py-1.5 rounded-md font-medium"
						>
							Replace
						</button>
						<button
							type="button"
							onClick={() => onChange("")}
							className="p-1.5 rounded-md bg-white/20 text-white hover:bg-red-500/80 transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					onDragOver={(e) => e.preventDefault()}
					onDrop={handleDrop}
					disabled={uploading}
					className="w-full h-20 rounded-lg border-2 border-dashed border-[var(--bg-prussian-blue-soft)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-slate-gray)] hover:border-[var(--bg-carolina-blue)] hover:text-[var(--bg-carolina-blue)] transition-colors disabled:opacity-60"
				>
					{uploading ? (
						<>
							<Loader2 className="w-5 h-5 animate-spin" />
							<span className="text-[10px]">{progress}%</span>
						</>
					) : (
						<>
							<ImagePlus className="w-5 h-5" />
							<span className="text-[10px]">Upload or drag image</span>
						</>
					)}
				</button>
			)}
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="sr-only"
				onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
			/>
			{/* URL input as fallback */}
			<input
				type="url"
				placeholder="…or paste image URL"
				value={uploading ? "" : value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full text-[10px] bg-[var(--bg-oxford-blue-2)] border border-[var(--bg-prussian-blue)] rounded-lg px-3 py-1.5 text-[var(--text-alice-blue)] placeholder:text-[var(--text-slate-dim)] outline-none focus:border-[var(--bg-carolina-blue)] transition-colors"
			/>
		</div>
	);
}
