import { useCallback, useRef, useEffect } from "react";
import type { Block } from "../blockTypes";

interface ListBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

const LABELS: Record<string, string> = {
	ul: "Bullet List",
	ol: "Numbered List",
	"task-list": "Task List",
};

const PLACEHOLDERS: Record<string, string> = {
	ul: "- Item 1\n- Item 2\n- Item 3",
	ol: "1. Item 1\n2. Item 2\n3. Item 3",
	"task-list": "- [ ] Task 1\n- [ ] Task 2\n- [x] Completed",
};

export function ListBlock({ block, onUpdate }: ListBlockProps) {
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
		<div className="rounded-lg bg-[var(--bg-oxford-blue)] border border-[var(--bg-prussian-blue)] overflow-hidden">
			<div className="px-4 py-2 bg-[var(--bg-oxford-blue-2)] border-b border-[var(--bg-prussian-blue)]">
				<span className="text-xs text-[var(--text-yonder-dim)]">{LABELS[block.type] ?? "List"}</span>
			</div>
			<textarea
				ref={ref}
				value={block.content}
				onChange={handleChange}
				className="w-full bg-transparent border-none outline-none resize-none text-[var(--text-shadow-blue)] font-mono text-sm p-4 placeholder:text-[var(--bg-prussian-blue-dark)]"
				placeholder={PLACEHOLDERS[block.type] ?? "- Item 1"}
				rows={3}
			/>
		</div>
	);
}
