import { useCallback, useRef, useEffect } from "react";
import type { Block } from "../blockTypes";

/** Fallback editor for video, link, table, math, diagram blocks. */
interface GenericBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

const LABELS: Record<string, string> = {
	video: "Video URL",
	link: "Link Card",
	table: "Table (Markdown)",
	math: "Math Equation",
	diagram: "Mermaid Diagram",
};

export function GenericBlock({ block, onUpdate }: GenericBlockProps) {
	const ref = useRef<HTMLTextAreaElement>(null);

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
			<div className="px-4 py-2 bg-[var(--bg-oxford-blue-2)] border-b border-[var(--bg-prussian-blue)]">
				<span className="text-xs text-[var(--text-yonder-dim)]">{LABELS[block.type] ?? block.type}</span>
			</div>
			<textarea
				ref={ref}
				value={block.content}
				onChange={handleChange}
				className="w-full bg-transparent border-none outline-none resize-none text-[var(--text-shadow-blue)] font-mono text-sm p-4 placeholder:text-[var(--bg-prussian-blue-dark)]"
				placeholder={`Enter ${block.type} content...`}
				rows={3}
			/>
		</div>
	);
}
