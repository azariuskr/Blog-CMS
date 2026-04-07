import { Lock, Sparkles } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/auth/auth-client";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { PLANS, formatPrice } from "@/lib/billing/plans";

const authorPlan = PLANS.find((p) => p.id === "author");
const authorPrice = authorPlan ? formatPrice(authorPlan.priceMonthly) : "$5";
const trialDays = authorPlan?.trialDays ?? 0;

export function PaywallCard() {
	const { data: session } = useSession();
	const routerState = useRouterState();
	const returnTo = routerState.location.pathname;

	return (
		<div className="relative mt-8 rounded-2xl overflow-hidden border border-[var(--bg-carolina-blue)]/30">
			{/* Gradient fade above the card that bleeds into the content */}
			<div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg-oxford-blue)] pointer-events-none" />

			<div className="relative bg-gradient-to-br from-[var(--bg-prussian-blue)]/60 to-[var(--bg-oxford-blue-2)] p-8 md:p-12 text-center">
				{/* Icon */}
				<div className="flex justify-center mb-4">
					<div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--bg-carolina-blue)]/20 to-[var(--bg-teal)]/20 border border-[var(--bg-carolina-blue)]/30 flex items-center justify-center">
						<Lock className="w-6 h-6 text-[var(--text-carolina-blue)]" />
					</div>
				</div>

				{/* Heading */}
				<div className="flex items-center justify-center gap-2 mb-2">
					<Sparkles className="w-4 h-4 text-[var(--text-carolina-blue)]" />
					<span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-carolina-blue)]">Premium Content</span>
					<Sparkles className="w-4 h-4 text-[var(--text-carolina-blue)]" />
				</div>
				<h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
					Continue reading with a subscription
				</h3>

				{/* Price + trial */}
				<div className="flex items-center justify-center gap-3 mb-4">
					<span className="text-[var(--text-wild-blue-yonder)] text-sm">
						<span className="text-white font-semibold">{authorPrice}/month</span> · Cancel anytime
					</span>
					{trialDays > 0 && (
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-carolina-blue)]/20 text-[var(--text-carolina-blue)] border border-[var(--bg-carolina-blue)]/30">
							{trialDays}-day free trial
						</span>
					)}
				</div>

				<p className="text-[var(--text-wild-blue-yonder)] mb-8 max-w-md mx-auto leading-relaxed">
					This article is for subscribers only. Unlock full access to all premium posts, exclusive content, and more.
				</p>

				{/* CTA */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
					<UpgradeButton
						planId="author"
						interval="month"
						returnTo={returnTo}
						className="px-8 py-2.5 rounded-xl text-sm font-semibold"
					>
						Unlock Full Access
					</UpgradeButton>
					{!session?.user && (
						<Link
							to={"/login" as string}
							className="px-6 py-2.5 rounded-xl text-sm font-medium border border-[var(--bg-prussian-blue-dark)] text-[var(--text-wild-blue-yonder)] hover:border-[var(--bg-carolina-blue)] hover:text-[var(--text-carolina-blue)] transition-colors"
						>
							Sign in
						</Link>
					)}
				</div>

				{/* Fine print */}
				<p className="mt-6 text-xs text-[var(--text-yonder-dim)]">
					Already subscribed?{" "}
					{session?.user ? (
						<span>Your subscription may not be active — check your <Link to={"/billing" as string} className="text-[var(--text-carolina-blue)] hover:underline">billing settings</Link>.</span>
					) : (
						<Link to={"/login" as string} className="text-[var(--text-carolina-blue)] hover:underline">Sign in</Link>
					)}
				</p>
			</div>
		</div>
	);
}
