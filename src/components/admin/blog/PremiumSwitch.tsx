import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useUpsertPost } from "@/lib/blog/queries";
import { toast } from "sonner";

interface PremiumSwitchProps {
	postId: string;
	authorId: string;
	title: string;
	slug: string;
	checked: boolean;
	status: string;
}

export function PremiumSwitch({ postId, authorId, title, slug, checked, status }: PremiumSwitchProps) {
	const [optimistic, setOptimistic] = useState(checked);
	const upsertPost = useUpsertPost();

	async function handleToggle() {
		const next = !optimistic;
		setOptimistic(next);
		try {
			const result = await upsertPost.mutateAsync({
				id: postId,
				authorId,
				title,
				slug,
				status: status as any,
				isPremium: next,
			} as any);
			if (!result?.ok) {
				setOptimistic(!next);
				toast.error("Failed to update premium status");
			}
		} catch {
			setOptimistic(!next);
			toast.error("Failed to update premium status");
		}
	}

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={upsertPost.isPending}
			title={optimistic ? "Premium post — click to disable" : "Free post — click to enable premium"}
			className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
				optimistic
					? "bg-[hsl(199,89%,49%)]/15 border-[hsl(199,89%,49%)]/40 text-[hsl(199,89%,49%)]"
					: "bg-transparent border-[hsl(216,33%,20%)] text-[hsl(217,17%,40%)] hover:border-[hsl(199,89%,49%)]/40 hover:text-[hsl(199,89%,49%)]"
			}`}
		>
			<Sparkles className="w-3 h-3" />
			{optimistic ? "Premium" : "Free"}
		</button>
	);
}
