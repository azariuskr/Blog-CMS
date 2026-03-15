import { useCallback, useState } from "react";
import { ImageIcon, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPickerModal } from "../MediaPickerModal";
import type { Block } from "../blockTypes";

interface ImageBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

export function ImageBlock({ block, onUpdate }: ImageBlockProps) {
	const [editing, setEditing] = useState(!(block.props?.src as string));
	const [pickerOpen, setPickerOpen] = useState(false);
	const src = (block.props?.src as string) ?? "";
	const alt = (block.props?.alt as string) ?? "";
	const caption = (block.props?.caption as string) ?? "";

	const update = useCallback((field: string, value: string) => {
		onUpdate({ props: { ...block.props, [field]: value } });
	}, [onUpdate, block.props]);

	if (editing || !src) {
		return (
			<>
				<div className="rounded-lg border-2 border-dashed border-[hsl(216,33%,25%)] p-6 bg-[hsl(222,44%,13%)]">
					<div className="flex flex-col items-center gap-4">
						<div className="w-14 h-14 rounded-full bg-[hsl(199,89%,49%)]/20 flex items-center justify-center">
							<ImageIcon className="w-7 h-7 text-[hsl(199,89%,49%)]" />
						</div>
						<div className="w-full max-w-md space-y-2">
							<Input type="url" value={src} onChange={(e) => update("src", e.target.value)} placeholder="Image URL..." className="bg-[hsl(222,47%,11%)] border-[hsl(216,33%,20%)] text-white" />
							<Input type="text" value={alt} onChange={(e) => update("alt", e.target.value)} placeholder="Alt text..." className="bg-[hsl(222,47%,11%)] border-[hsl(216,33%,20%)] text-white" />
							<Input type="text" value={caption} onChange={(e) => update("caption", e.target.value)} placeholder="Caption (optional)..." className="bg-[hsl(222,47%,11%)] border-[hsl(216,33%,20%)] text-white" />
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPickerOpen(true)}
								className="border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)]"
							>
								<FolderOpen className="h-3.5 w-3.5 mr-1.5" />
								Browse Media
							</Button>
							{src && (
								<Button variant="outline" size="sm" onClick={() => setEditing(false)} className="border-[hsl(199,89%,49%)] text-[hsl(199,89%,49%)] hover:bg-[hsl(199,89%,49%)]/10">
									Preview
								</Button>
							)}
						</div>
					</div>
				</div>
				{pickerOpen && (
					<MediaPickerModal
						onSelect={(url) => {
							update("src", url);
							setPickerOpen(false);
							setEditing(false);
						}}
						onClose={() => setPickerOpen(false)}
					/>
				)}
			</>
		);
	}

	return (
		<div className="relative group cursor-pointer" onClick={() => setEditing(true)}>
			<figure>
				<img src={src} alt={alt} className="w-full rounded-lg" />
				{caption && <figcaption className="text-center text-sm text-[hsl(216,33%,50%)] mt-2 italic">{caption}</figcaption>}
			</figure>
			<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
				<span className="text-white text-sm">Click to edit</span>
			</div>
		</div>
	);
}
