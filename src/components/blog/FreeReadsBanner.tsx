import { Link } from "@tanstack/react-router";
import { BookOpen, Sparkles } from "lucide-react";

const FREE_READS_PER_MONTH = 3;

interface FreeReadsBannerProps {
	readsRemaining: number;
}

export function FreeReadsBanner({ readsRemaining }: FreeReadsBannerProps) {
	const used = FREE_READS_PER_MONTH - readsRemaining;

	return (
		<div className="mb-8 flex items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(199,89%,49%)]/20 bg-[hsl(199,89%,49%)]/5 text-sm">
			<BookOpen className="w-4 h-4 text-[hsl(199,89%,49%)] shrink-0" />
			<span className="text-[hsl(216,33%,68%)]">
				You've used{" "}
				<strong className="text-white">
					{used} of {FREE_READS_PER_MONTH}
				</strong>{" "}
				free premium articles this month.
				{readsRemaining === 0 && " You've reached your limit."}
			</span>
			<Link
				to={"/pricing" as string}
				className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
			>
				<Sparkles className="w-3 h-3" />
				Upgrade
			</Link>
		</div>
	);
}
