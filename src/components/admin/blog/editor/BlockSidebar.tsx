import { useDraggable } from "@dnd-kit/core";
import {
	Heading1, Heading2, Heading3, Heading4, AlignLeft, Quote, AlertCircle,
	List, ListOrdered, ListTodo, Image, Video, Link2, Minus, Table,
	Code, Sigma, GitBranch, Type, LayoutGrid, Sparkles,
} from "lucide-react";
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES, type BlockType } from "./blockTypes";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
	Heading1, Heading2, Heading3, Heading4, AlignLeft, Quote, AlertCircle,
	List, ListOrdered, ListTodo, Image, Video, Link2, Minus, Table,
	Code, Sigma, GitBranch, Type, LayoutGrid, Sparkles,
};

function DraggableBlock({ type, label, icon }: { type: BlockType; label: string; icon: string }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `sidebar-${type}`,
		data: { type, fromSidebar: true },
	});

	const Icon = ICON_MAP[icon] ?? AlignLeft;

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
				isDragging
					? "bg-[var(--bg-carolina-blue)]/20 scale-105 shadow-lg"
					: "bg-[var(--bg-oxford-blue)] hover:bg-[var(--bg-prussian-blue)] border border-[var(--bg-prussian-blue)] hover:border-[var(--bg-carolina-blue)]/40"
			}`}
			style={{ touchAction: "none" }}
		>
			<div className="w-7 h-7 rounded-md bg-[var(--bg-carolina-blue)]/15 flex items-center justify-center flex-shrink-0">
				<Icon className="w-3.5 h-3.5 text-[var(--bg-carolina-blue)]" />
			</div>
			<span className="text-xs text-[var(--text-shadow-blue)]">{label}</span>
		</div>
	);
}

export function BlockSidebar({ className = "" }: { className?: string }) {
	return (
		<div className={`h-full overflow-y-auto ${className}`}>
			<div className="p-3 space-y-5">
				<div>
					<p className="text-xs font-semibold text-[var(--text-yonder-dim)] uppercase tracking-wider mb-1">
						Blocks
					</p>
					<p className="text-xs text-[var(--text-prussian-mid)]">Drag to editor or click +</p>
				</div>

				{BLOCK_CATEGORIES.map((cat) => {
					const catBlocks = BLOCK_DEFINITIONS.filter((b) => b.category === cat.id);
					if (catBlocks.length === 0) return null;
					const CatIcon = ICON_MAP[cat.icon] ?? Type;

					return (
						<div key={cat.id}>
							<div className="flex items-center gap-1.5 mb-2">
								<CatIcon className="w-3.5 h-3.5 text-[var(--text-yonder-dim)]" />
								<span className="text-xs font-medium text-[var(--text-yonder-dim)] uppercase tracking-wider">
									{cat.label}
								</span>
							</div>
							<div className="space-y-1.5">
								{catBlocks.map((b) => (
									<DraggableBlock key={b.type} type={b.type} label={b.label} icon={b.icon} />
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
