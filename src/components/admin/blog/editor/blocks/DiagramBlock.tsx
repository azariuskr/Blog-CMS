import { useCallback, useRef, useEffect, useState } from "react";
import type { Block } from "../blockTypes";
import { MermaidBlock } from "@/components/blog/MermaidBlock";

interface DiagramBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

export function DiagramBlock({ block, onUpdate }: DiagramBlockProps) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [preview, setPreview] = useState(false);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onUpdate({ content: e.target.value });
	}, [onUpdate]);

	useEffect(() => {
		if (ref.current) {
			ref.current.style.height = "auto";
			ref.current.style.height = Math.max(80, ref.current.scrollHeight) + "px";
		}
	}, [block.content]);

	return (
		<div className="rounded-lg bg-[hsl(222,44%,13%)] border border-[hsl(216,33%,20%)] overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 bg-[hsl(222,47%,11%)] border-b border-[hsl(216,33%,20%)]">
				<span className="text-xs text-[hsl(216,33%,50%)]">Mermaid Diagram</span>
				<button
					type="button"
					onClick={() => setPreview((v) => !v)}
					className="text-xs text-[hsl(199,89%,49%)] hover:underline"
				>
					{preview ? "Edit" : "Preview"}
				</button>
			</div>
			{preview ? (
				<div className="p-2">
					<MermaidBlock id={block.id} code={block.content} />
				</div>
			) : (
				<textarea
					ref={ref}
					value={block.content}
					onChange={handleChange}
					className="w-full bg-transparent border-none outline-none resize-none text-[hsl(217,24%,59%)] font-mono text-sm p-4 placeholder:text-[hsl(216,33%,30%)]"
					placeholder="graph TD&#10;  A[Start] --> B[End]"
					rows={4}
					spellCheck={false}
				/>
			)}
		</div>
	);
}
