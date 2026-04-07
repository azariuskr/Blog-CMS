import { Sparkles, BookOpen } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/auth/auth-client";
import { useBilling } from "@/hooks/use-billing";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { PLANS, formatPrice } from "@/lib/billing/plans";
import { ROUTES } from "@/constants";

const authorPlan = PLANS.find((p) => p.id === "author");
const authorPrice = authorPlan ? formatPrice(authorPlan.priceMonthly) : "$5";
const trialDays = authorPlan?.trialDays ?? 0;

export function MemberCTA() {
	const { data: session } = useSession();
	const { isBillingEnabled, hasSubscription, currentPlan } = useBilling();
	const routerState = useRouterState();
	const returnTo = routerState.location.pathname;

	// Subscribers see nothing — they're already members
	if (hasSubscription && currentPlan?.id !== "free") return null;

	// Billing not enabled — nothing to upsell
	if (!isBillingEnabled) return null;

	return (
		<div className="mt-16 rounded-2xl border border-[hsl(199,89%,49%)]/20 bg-gradient-to-br from-[hsl(216,33%,18%)] to-[hsl(222,47%,11%)] p-8 md:p-10">
			<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
				{/* Icon */}
				<div className="shrink-0 w-14 h-14 rounded-2xl bg-[hsl(199,89%,49%)]/15 border border-[hsl(199,89%,49%)]/20 flex items-center justify-center">
					<BookOpen className="w-6 h-6 text-[hsl(199,89%,49%)]" />
				</div>

				{/* Copy */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<Sparkles className="w-3.5 h-3.5 text-[hsl(199,89%,49%)]" />
						<span className="text-xs font-semibold uppercase tracking-widest text-[hsl(199,89%,49%)]">
							Become a Member
						</span>
					</div>
					{session?.user ? (
						<>
							<h3 className="text-lg font-bold text-white mb-1">
								Enjoying the content? Go Pro.
							</h3>
							<p className="text-sm text-[hsl(216,33%,68%)] leading-relaxed">
								Get unlimited access to all premium articles, courses, and more for just{" "}
								<strong className="text-white">{authorPrice}/month</strong>.
								{trialDays > 0 && ` Start with a ${trialDays}-day free trial.`}
							</p>
						</>
					) : (
						<>
							<h3 className="text-lg font-bold text-white mb-1">
								Join thousands of curious readers
							</h3>
							<p className="text-sm text-[hsl(216,33%,68%)] leading-relaxed">
								Sign up free and get 3 premium articles per month. Upgrade to Pro for{" "}
								<strong className="text-white">{authorPrice}/month</strong> and unlock everything.
							</p>
						</>
					)}
				</div>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
					{session?.user ? (
						<UpgradeButton
							planId="author"
							interval="month"
							returnTo={returnTo}
							className="px-6 py-2.5 rounded-xl text-sm font-semibold"
						>
							{trialDays > 0 ? "Start Free Trial" : "Upgrade to Pro"}
						</UpgradeButton>
					) : (
						<>
							<Link
								to={`${ROUTES.SIGNUP}?redirect=${encodeURIComponent(returnTo)}` as string}
								className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white hover:opacity-90 transition-opacity text-center"
							>
								Sign up free
							</Link>
							<Link
								to={"/pricing" as string}
								className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-white transition-colors text-center"
							>
								View plans
							</Link>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
