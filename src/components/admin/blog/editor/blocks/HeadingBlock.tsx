import { useCallback, useRef, useEffect } from "react";
import type { Block } from "../blockTypes";

interface HeadingBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

const HEADING_STYLES: Record<string, string> = {
	h1: "text-4xl font-bold",
	h2: "text-3xl font-bold",
	h3: "text-2xl font-semibold",
	h4: "text-xl font-semibold",
	h5: "text-lg font-medium",
	h6: "text-base font-medium",
};

export function HeadingBlock({ block, onUpdate }: HeadingBlockProps) {
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
		<textarea
			ref={ref}
			value={block.content}
			onChange={handleChange}
			className={`w-full bg-transparent border-none outline-none resize-none text-[hsl(216,100%,95%)] placeholder:text-[hsl(217,17%,30%)] ${HEADING_STYLES[block.type] ?? "text-2xl font-bold"}`}
			placeholder={`${block.type.toUpperCase()} Heading...`}
			rows={1}
		/>
	);
}
