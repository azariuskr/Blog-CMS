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
		<div className="rounded-lg bg-[hsl(222,44%,13%)] border border-[hsl(216,33%,20%)] overflow-hidden">
			<div className="px-4 py-2 bg-[hsl(222,47%,11%)] border-b border-[hsl(216,33%,20%)]">
				<span className="text-xs text-[hsl(216,33%,50%)]">{LABELS[block.type] ?? block.type}</span>
			</div>
			<textarea
				ref={ref}
				value={block.content}
				onChange={handleChange}
				className="w-full bg-transparent border-none outline-none resize-none text-[hsl(217,24%,59%)] font-mono text-sm p-4 placeholder:text-[hsl(216,33%,30%)]"
				placeholder={`Enter ${block.type} content...`}
				rows={3}
			/>
		</div>
	);
}
