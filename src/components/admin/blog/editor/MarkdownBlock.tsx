import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Block } from "./blockTypes";

import { HeadingBlock } from "./blocks/HeadingBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { BlockquoteBlock } from "./blocks/BlockquoteBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { ListBlock } from "./blocks/ListBlock";
import { SeparatorBlock } from "./blocks/SeparatorBlock";
import { AlertBlock } from "./blocks/AlertBlock";
import { GenericBlock } from "./blocks/GenericBlock";
import { DiagramBlock } from "./blocks/DiagramBlock";

interface MarkdownBlockProps {
	block: Block;
	onUpdate: (id: string, updates: Partial<Block>) => void;
	onDelete: (id: string) => void;
}

export const MarkdownBlock = memo(function MarkdownBlock({ block, onUpdate, onDelete }: MarkdownBlockProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

	const handleDelete = useCallback(() => onDelete(block.id), [onDelete, block.id]);
	const handleUpdate = useCallback((updates: Partial<Block>) => onUpdate(block.id, updates), [onUpdate, block.id]);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const renderBlock = () => {
		const headingTypes = ["h1", "h2", "h3", "h4", "h5", "h6"];
		const listTypes = ["ul", "ol", "task-list"];

		if (headingTypes.includes(block.type)) return <HeadingBlock block={block} onUpdate={handleUpdate} />;
		if (listTypes.includes(block.type)) return <ListBlock block={block} onUpdate={handleUpdate} />;

		switch (block.type) {
			case "paragraph": return <ParagraphBlock block={block} onUpdate={handleUpdate} />;
			case "blockquote": return <BlockquoteBlock block={block} onUpdate={handleUpdate} />;
			case "alert": return <AlertBlock block={block} onUpdate={handleUpdate} />;
			case "code": return <CodeBlock block={block} onUpdate={handleUpdate} />;
			case "separator": return <SeparatorBlock />;
			case "image": return <ImageBlock block={block} onUpdate={handleUpdate} />;
			case "diagram": return <DiagramBlock block={block} onUpdate={handleUpdate} />;
			default: return <GenericBlock block={block} onUpdate={handleUpdate} />;
		}
	};

	return (
		<div className="relative mx-8">
			<div
				ref={setNodeRef}
				style={style}
				className="group relative rounded-lg border border-transparent hover:border-[hsl(199,89%,49%)]/30 transition-all p-3"
			>
				{/* Drag handle */}
				<div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 cursor-grab active:cursor-grabbing text-[hsl(216,33%,50%)] hover:text-[hsl(199,89%,49%)] hover:bg-[hsl(199,89%,49%)]/10"
						{...attributes}
						{...listeners}
						style={{ touchAction: "none" }}
					>
						<GripVertical className="h-4 w-4" />
					</Button>
				</div>

				{/* Delete button */}
				<div className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-[hsl(216,33%,50%)] hover:text-destructive hover:bg-destructive/10"
						onClick={handleDelete}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>

				<div className="w-full">{renderBlock()}</div>
			</div>
		</div>
	);
});
