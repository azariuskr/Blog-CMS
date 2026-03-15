import { useCallback, useRef, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import type { Block } from "../blockTypes";

const VARIANTS = [
	{ id: "info", icon: Info, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
	{ id: "warning", icon: AlertTriangle, color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
	{ id: "error", icon: AlertCircle, color: "bg-red-500/10 border-red-500/30 text-red-400" },
	{ id: "success", icon: CheckCircle, color: "bg-green-500/10 border-green-500/30 text-green-400" },
];

interface AlertBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

export function AlertBlock({ block, onUpdate }: AlertBlockProps) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [variant, setVariant] = useState((block.props?.variant as string) ?? "info");

	const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onUpdate({ content: e.target.value });
	}, [onUpdate]);

	const handleVariant = useCallback((v: string) => {
		setVariant(v);
		onUpdate({ props: { ...block.props, variant: v } });
	}, [onUpdate, block.props]);

	useEffect(() => {
		if (ref.current) {
			ref.current.style.height = "auto";
			ref.current.style.height = ref.current.scrollHeight + "px";
		}
	}, [block.content]);

	const current = VARIANTS.find((v) => v.id === variant) ?? VARIANTS[0];
	const Icon = current.icon;

	return (
		<div className={`rounded-lg border p-4 ${current.color}`}>
			<div className="flex items-center gap-2 mb-3">
				{VARIANTS.map((v) => (
					<button
						key={v.id}
						type="button"
						onClick={() => handleVariant(v.id)}
						className={`p-1.5 rounded transition-colors ${variant === v.id ? "bg-white/20" : "hover:bg-white/10"}`}
					>
						<v.icon className="w-4 h-4" />
					</button>
				))}
			</div>
			<div className="flex gap-3">
				<Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
				<textarea
					ref={ref}
					value={block.content}
					onChange={handleChange}
					className="w-full bg-transparent border-none outline-none resize-none text-current placeholder:opacity-50"
					placeholder="Enter alert message..."
					rows={1}
				/>
			</div>
		</div>
	);
}
