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
		<div className="rounded-lg bg-[var(--bg-oxford-blue)] border border-[var(--bg-prussian-blue)] overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-oxford-blue-2)] border-b border-[var(--bg-prussian-blue)]">
				<span className="text-xs text-[var(--text-yonder-dim)]">Mermaid Diagram</span>
				<button
					type="button"
					onClick={() => setPreview((v) => !v)}
					className="text-xs text-[var(--bg-carolina-blue)] hover:underline"
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
					className="w-full bg-transparent border-none outline-none resize-none text-[var(--text-shadow-blue)] font-mono text-sm p-4 placeholder:text-[var(--bg-prussian-blue-dark)]"
					placeholder="graph TD&#10;  A[Start] --> B[End]"
					rows={4}
					spellCheck={false}
				/>
			)}
		</div>
	);
}
