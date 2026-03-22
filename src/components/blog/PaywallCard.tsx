import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth/auth-client";
import { UpgradeButton } from "@/components/billing/upgrade-button";

export function PaywallCard() {
	const { data: session } = useSession();

	return (
		<div className="relative mt-8 rounded-2xl overflow-hidden border border-[hsl(199,89%,49%)]/30">
			{/* Gradient fade above the card that bleeds into the content */}
			<div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[hsl(222,44%,13%)] pointer-events-none" />

			<div className="relative bg-gradient-to-br from-[hsl(216,33%,20%)]/60 to-[hsl(222,47%,11%)] p-8 md:p-12 text-center">
				{/* Icon */}
				<div className="flex justify-center mb-4">
					<div className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(199,89%,49%)]/20 to-[hsl(180,70%,45%)]/20 border border-[hsl(199,89%,49%)]/30 flex items-center justify-center">
						<Lock className="w-6 h-6 text-[hsl(199,89%,49%)]" />
					</div>
				</div>

				{/* Heading */}
				<div className="flex items-center justify-center gap-2 mb-2">
					<Sparkles className="w-4 h-4 text-[hsl(199,89%,49%)]" />
					<span className="text-xs font-semibold uppercase tracking-widest text-[hsl(199,89%,49%)]">Premium Content</span>
					<Sparkles className="w-4 h-4 text-[hsl(199,89%,49%)]" />
				</div>
				<h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
					Continue reading with a subscription
				</h3>
				<p className="text-[hsl(216,33%,68%)] mb-8 max-w-md mx-auto leading-relaxed">
					This article is for subscribers only. Unlock full access to all premium posts, exclusive content, and more.
				</p>

				{/* CTA */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
					<UpgradeButton
						planId="pro"
						interval="month"
						className="px-8 py-2.5 rounded-xl text-sm font-semibold"
					>
						Unlock Full Access
					</UpgradeButton>
					{!session?.user && (
						<Link
							to={"/sign-in" as string}
							className="px-6 py-2.5 rounded-xl text-sm font-medium border border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-[hsl(199,89%,49%)] transition-colors"
						>
							Sign in
						</Link>
					)}
				</div>

				{/* Fine print */}
				<p className="mt-6 text-xs text-[hsl(216,33%,48%)]">
					Already subscribed?{" "}
					{session?.user ? (
						<span>Your subscription may not be active — check your billing settings.</span>
					) : (
						<Link to={"/sign-in" as string} className="text-[hsl(199,89%,49%)] hover:underline">Sign in</Link>
					)}
				</p>
			</div>
		</div>
	);
}
