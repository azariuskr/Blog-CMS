import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { memo, useMemo } from "react";
import { MarkdownBlock } from "./MarkdownBlock";
import type { Block } from "./blockTypes";

interface EditorCanvasProps {
	blocks: Block[];
	onBlockUpdate: (id: string, updates: Partial<Block>) => void;
	onBlockDelete: (id: string) => void;
}

export const EditorCanvas = memo(function EditorCanvas({ blocks, onBlockUpdate, onBlockDelete }: EditorCanvasProps) {
	const { setNodeRef, isOver } = useDroppable({ id: "editor-dropzone" });
	const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

	return (
		<div
			ref={setNodeRef}
			className={`w-full h-full rounded-lg transition-colors relative ${isOver ? "bg-[var(--bg-carolina-blue)]/5" : ""}`}
		>
			{blocks.length === 0 ? (
				<div className="absolute inset-4 flex items-center justify-center border-2 border-dashed rounded-lg border-[var(--bg-carolina-blue)]/30">
					<p className="text-center text-sm text-[var(--text-yonder-dim)] px-4">
						{isOver ? "Release to add block..." : "Drag blocks here or click + to add content"}
					</p>
				</div>
			) : (
				<div className="h-full overflow-y-auto">
					<div className="p-4">
						<SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
							<div className="space-y-3">
								{blocks.map((block) => (
									<MarkdownBlock
										key={block.id}
										block={block}
										onUpdate={onBlockUpdate}
										onDelete={onBlockDelete}
									/>
								))}
								<div className="h-24 w-full">
									{isOver && (
										<div className="h-12 border-2 border-dashed border-[var(--bg-carolina-blue)] rounded-lg bg-[var(--bg-carolina-blue)]/10 flex items-center justify-center">
											<p className="text-sm text-[var(--bg-carolina-blue)]">Drop here</p>
										</div>
									)}
								</div>
							</div>
						</SortableContext>
					</div>
				</div>
			)}
		</div>
	);
});
