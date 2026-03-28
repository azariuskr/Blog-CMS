import { useCallback, useRef, useEffect } from "react";
import type { Block } from "../blockTypes";

interface BlockquoteBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

export function BlockquoteBlock({ block, onUpdate }: BlockquoteBlockProps) {
	const ref = useRef<HTMLTextAreaElement>(null);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onUpdate({ content: e.target.value });
	}, [onUpdate]);

	useEffect(() => {
		if (ref.current) {
			ref.current.style.height = "auto";
			ref.current.style.height = ref.current.scrollHeight + "px";
		}
	}, [block.content]);

	return (
		<div className="border-l-4 border-[var(--bg-carolina-blue)] pl-4 py-2">
			<textarea
				ref={ref}
				value={block.content}
				onChange={handleChange}
				className="w-full bg-transparent border-none outline-none resize-none text-[var(--text-shadow-blue)] text-lg italic placeholder:text-[var(--text-slate-dim)]"
				placeholder="Enter a quote..."
				rows={1}
			/>
		</div>
	);
}
