import { useState, useCallback, useEffect, useRef } from "react";
import {
	DndContext,
	DragOverlay,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Eye, Code2, Columns2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorCanvas } from "./EditorCanvas";
import { BlockSidebar } from "./BlockSidebar";
import { type Block, type BlockType, createBlock, BLOCK_DEFINITIONS } from "./blockTypes";

export type { Block, BlockType };

interface BlockEditorProps {
	initialBlocks?: Block[];
	onSave?: (blocks: Block[]) => Promise<void>;
	autoSaveInterval?: number;
	readOnly?: boolean;
}

export function BlockEditor({
	initialBlocks = [],
	onSave,
	autoSaveInterval = 10_000,
	readOnly = false,
}: BlockEditorProps) {
	const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [view, setView] = useState<"edit" | "preview" | "split">("edit");
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const [dirty, setDirty] = useState(false);
	const blocksRef = useRef(blocks);
	blocksRef.current = blocks;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	// Auto-save
	useEffect(() => {
		if (!dirty || !onSave) return;
		const timer = setTimeout(async () => {
			setSaving(true);
			try {
				await onSave(blocksRef.current);
				setSavedAt(new Date());
				setDirty(false);
			} catch {
				// will retry on next change
			} finally {
				setSaving(false);
			}
		}, autoSaveInterval);
		return () => clearTimeout(timer);
	}, [blocks, dirty, onSave, autoSaveInterval]);

	const handleDragStart = useCallback((e: DragStartEvent) => {
		setActiveId(e.active.id as string);
	}, []);

	const handleDragEnd = useCallback((e: DragEndEvent) => {
		const { active, over } = e;
		setActiveId(null);
		if (!over) return;

		const activeData = active.data.current;
		if (activeData?.fromSidebar) {
			const newBlock = createBlock(activeData.type as BlockType);
			setBlocks((prev) => {
				if (over.id === "editor-dropzone") return [...prev, newBlock];
				const idx = prev.findIndex((b) => b.id === over.id);
				if (idx === -1) return [...prev, newBlock];
				return [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)];
			});
			setDirty(true);
			return;
		}

		if (active.id !== over.id) {
			setBlocks((prev) => {
				const oldIdx = prev.findIndex((b) => b.id === active.id);
				const newIdx = prev.findIndex((b) => b.id === over.id);
				if (oldIdx === -1 || newIdx === -1) return prev;
				return arrayMove(prev, oldIdx, newIdx);
			});
			setDirty(true);
		}
	}, []);

	const handleBlockUpdate = useCallback((id: string, updates: Partial<Block>) => {
		setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
		setDirty(true);
	}, []);

	const handleBlockDelete = useCallback((id: string) => {
		setBlocks((prev) => prev.filter((b) => b.id !== id));
		setDirty(true);
	}, []);

	const handleManualSave = useCallback(async () => {
		if (!onSave) return;
		setSaving(true);
		try {
			await onSave(blocks);
			setSavedAt(new Date());
			setDirty(false);
		} finally {
			setSaving(false);
		}
	}, [blocks, onSave]);

	const activeBlock = activeId?.startsWith("sidebar-")
		? BLOCK_DEFINITIONS.find((b) => `sidebar-${b.type}` === activeId)
		: blocks.find((b) => b.id === activeId);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex flex-col h-full">
				{/* Toolbar */}
				<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)]">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setView("edit")}
							className={`h-7 px-2.5 text-xs gap-1.5 ${view === "edit" ? "bg-[var(--bg-carolina-blue)]/20 text-[var(--bg-carolina-blue)]" : "text-[var(--text-yonder-dim)] hover:text-[var(--bg-carolina-blue)]"}`}
						>
							<Code2 className="w-3.5 h-3.5" /> Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setView("split")}
							className={`h-7 px-2.5 text-xs gap-1.5 ${view === "split" ? "bg-[var(--bg-carolina-blue)]/20 text-[var(--bg-carolina-blue)]" : "text-[var(--text-yonder-dim)] hover:text-[var(--bg-carolina-blue)]"}`}
						>
							<Columns2 className="w-3.5 h-3.5" /> Split
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setView("preview")}
							className={`h-7 px-2.5 text-xs gap-1.5 ${view === "preview" ? "bg-[var(--bg-carolina-blue)]/20 text-[var(--bg-carolina-blue)]" : "text-[var(--text-yonder-dim)] hover:text-[var(--bg-carolina-blue)]"}`}
						>
							<Eye className="w-3.5 h-3.5" /> Preview
						</Button>
					</div>

					<div className="flex items-center gap-3">
						<div className="text-xs text-[var(--text-prussian-mid)] flex items-center gap-1.5">
							{saving ? (
								<><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
							) : savedAt ? (
								<><CheckCircle className="w-3 h-3 text-green-500" /> Saved {savedAt.toLocaleTimeString()}</>
							) : dirty ? (
								<span className="text-yellow-500">Unsaved changes</span>
							) : null}
						</div>
						{onSave && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleManualSave}
								disabled={saving || !dirty}
								className="h-7 px-3 text-xs border-[var(--bg-carolina-blue)]/40 text-[var(--bg-carolina-blue)] hover:bg-[var(--bg-carolina-blue)]/10 disabled:opacity-40"
							>
								Save
							</Button>
						)}
					</div>
				</div>

				{/* Main area */}
				<div className="flex-1 flex overflow-hidden">
					{/* Block palette sidebar */}
					{!readOnly && (view === "edit" || view === "split") && (
						<div className="w-52 border-r border-[var(--bg-prussian-blue)] flex-shrink-0">
							<BlockSidebar />
						</div>
					)}

					{/* Editor canvas */}
					{(view === "edit" || view === "split") && (
						<div className={`flex-1 overflow-hidden ${view === "split" ? "border-r border-[var(--bg-prussian-blue)]" : ""}`}>
							<EditorCanvas
								blocks={blocks}
								onBlockUpdate={handleBlockUpdate}
								onBlockDelete={handleBlockDelete}
							/>
						</div>
					)}

					{/* Preview panel */}
					{(view === "preview" || view === "split") && (
						<div className="flex-1 overflow-y-auto p-6">
							<BlockPreview blocks={blocks} />
						</div>
					)}
				</div>
			</div>

			<DragOverlay>
				{activeBlock && (
					<div className="bg-[var(--bg-carolina-blue)]/20 border border-[var(--bg-carolina-blue)] rounded-lg p-3 shadow-xl">
						<span className="text-[var(--bg-carolina-blue)] text-sm">
							{"label" in activeBlock ? activeBlock.label : activeBlock.type}
						</span>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}

/** Inline preview renderer — mirrors the public PostBlocksRenderer but in the editor context. */
function BlockPreview({ blocks }: { blocks: Block[] }) {
	if (blocks.length === 0) {
		return <p className="text-[var(--text-prussian-mid)] text-sm text-center py-12">Nothing to preview yet.</p>;
	}

	return (
		<div className="prose prose-invert max-w-none">
			{blocks.map((block) => {
				switch (block.type) {
					case "h1": return <h1 key={block.id} className="text-3xl font-bold text-white mt-8 mb-4">{block.content}</h1>;
					case "h2": return <h2 key={block.id} className="text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-[var(--bg-prussian-blue)]">{block.content}</h2>;
					case "h3": return <h3 key={block.id} className="text-xl font-semibold text-white mt-5 mb-2">{block.content}</h3>;
					case "h4": return <h4 key={block.id} className="text-lg font-semibold text-white mt-4 mb-2">{block.content}</h4>;
					case "paragraph": return <p key={block.id} className="text-[var(--text-shadow-blue)] leading-relaxed mb-4">{block.content}</p>;
					case "blockquote": return (
						<blockquote key={block.id} className="border-l-4 border-[var(--bg-carolina-blue)] pl-4 py-2 my-4 bg-[var(--bg-prussian-blue)]/30 rounded-r-lg">
							<p className="text-[var(--text-columbia-blue)] italic">{block.content}</p>
						</blockquote>
					);
					case "code": {
						const lang = (block.props?.language as string) ?? "plaintext";
						return (
							<pre key={block.id} className="bg-[var(--bg-oxford-blue-dark)] rounded-xl p-4 my-4 overflow-x-auto border border-[var(--bg-prussian-blue)]">
								<div className="text-xs text-[var(--text-yonder-dim)] mb-2">{lang}</div>
								<code className="text-green-400 font-mono text-sm">{block.content}</code>
							</pre>
						);
					}
					case "image": {
						const src = (block.props?.src as string) ?? "";
						const alt = (block.props?.alt as string) ?? "";
						const caption = (block.props?.caption as string) ?? "";
						if (!src) return null;
						return (
							<figure key={block.id} className="my-6">
								<img src={src} alt={alt} className="w-full rounded-xl" />
								{caption && <figcaption className="text-center text-sm text-[var(--text-yonder-dim)] mt-2 italic">{caption}</figcaption>}
							</figure>
						);
					}
					case "separator": return (
						<div key={block.id} className="my-8 flex items-center justify-center">
							<div className="w-1/4 h-px bg-gradient-to-r from-transparent via-[var(--bg-carolina-blue)] to-transparent" />
							<div className="mx-3 w-1.5 h-1.5 rounded-full bg-[var(--bg-carolina-blue)]" />
							<div className="w-1/4 h-px bg-gradient-to-r from-transparent via-[var(--bg-teal)] to-transparent" />
						</div>
					);
					case "alert": {
						const v = (block.props?.variant as string) ?? "info";
						const colors: Record<string, string> = {
							info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
							warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
							error: "bg-red-500/10 border-red-500/30 text-red-300",
							success: "bg-green-500/10 border-green-500/30 text-green-300",
						};
						return <div key={block.id} className={`rounded-lg border p-4 my-4 ${colors[v] ?? colors.info}`}>{block.content}</div>;
					}
					case "ul": {
						const items = block.content.split("\n").map((i) => i.replace(/^-\s*/, "").trim()).filter(Boolean);
						return <ul key={block.id} className="my-4 ml-5 space-y-1 list-disc text-[var(--text-shadow-blue)]">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
					}
					case "ol": {
						const items = block.content.split("\n").map((i) => i.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
						return <ol key={block.id} className="my-4 ml-5 space-y-1 list-decimal text-[var(--text-shadow-blue)]">{items.map((it, i) => <li key={i}>{it}</li>)}</ol>;
					}
					default: return <p key={block.id} className="text-[var(--text-shadow-blue)] mb-4 font-mono text-sm">{block.content}</p>;
				}
			})}
		</div>
	);
}

export default BlockEditor;
