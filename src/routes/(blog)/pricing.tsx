import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Zap, Shield } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { useBilling, useUpgrade } from "@/hooks/use-billing";
import { PLANS, formatPrice, type Plan } from "@/lib/billing/plans";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(blog)/pricing")({
	component: PricingPage,
});

const PLAN_ICONS: Record<string, React.ElementType> = {
	free: Zap,
	pro: Sparkles,
	enterprise: Shield,
};

const COMPARISON_FEATURES = [
	{ label: "Premium articles", free: "3/month", pro: "Unlimited", enterprise: "Unlimited" },
	{ label: "AI assistant messages", free: "150/month", pro: "Unlimited", enterprise: "Unlimited" },
	{ label: "Storage", free: "100 MB", pro: "10 GB", enterprise: "Unlimited" },
	{ label: "Team members", free: "1", pro: "5", enterprise: "Unlimited" },
	{ label: "API access", free: false, pro: true, enterprise: true },
	{ label: "Priority support", free: false, pro: true, enterprise: true },
	{ label: "Custom branding", free: false, pro: false, enterprise: true },
	{ label: "SSO & advanced security", free: false, pro: false, enterprise: true },
	{ label: "Dedicated support", free: false, pro: false, enterprise: true },
	{ label: "Course access (Pro)", free: false, pro: true, enterprise: true },
	{ label: "Affiliate dashboard", free: false, pro: true, enterprise: true },
];

function PlanCard({ plan, interval }: { plan: Plan; interval: "month" | "year" }) {
	const { data: session } = useSession();
	const routerState = useRouterState();
	const returnTo = routerState.location.pathname;
	const price = interval === "month" ? plan.priceMonthly : plan.priceYearly;
	const monthlyEquivalent = interval === "year" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
	const Icon = PLAN_ICONS[plan.id] ?? Zap;
	const isFree = plan.priceMonthly === 0;
	const savings = interval === "year" && !isFree
		? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)
		: 0;

	const { hasSubscription, currentPlan } = useBilling();
	const { upgrade, isUpgrading } = useUpgrade();

	const isCurrentPlan = !!session?.user && hasSubscription && currentPlan?.id === plan.id;

	return (
		<div className={`relative rounded-2xl border p-8 flex flex-col ${
			plan.isPopular
				? "border-[hsl(199,89%,49%)] bg-gradient-to-b from-[hsl(216,33%,18%)] to-[hsl(222,47%,11%)] shadow-[0_0_40px_hsl(199,89%,49%,0.15)]"
				: "border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)]"
		}`}>
			{plan.isPopular && (
				<div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
					<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white text-xs font-bold">
						<Sparkles className="w-3 h-3" /> Most Popular
					</span>
				</div>
			)}

			<div className="mb-6">
				<div className={`inline-flex p-2.5 rounded-xl mb-3 ${
					plan.isPopular ? "bg-[hsl(199,89%,49%)]/20" : "bg-[hsl(216,33%,20%)]"
				}`}>
					<Icon className={`w-5 h-5 ${plan.isPopular ? "text-[hsl(199,89%,49%)]" : "text-[hsl(216,33%,68%)]"}`} />
				</div>
				<h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
				<p className="text-sm text-[hsl(216,33%,68%)]">{plan.description}</p>
			</div>

			<div className="mb-6">
				{isFree ? (
					<div className="text-4xl font-bold text-white">Free</div>
				) : (
					<>
						<div className="flex items-end gap-1">
							<span className="text-4xl font-bold text-white">
								{formatPrice(monthlyEquivalent)}
							</span>
							<span className="text-[hsl(216,33%,68%)] mb-1">/month</span>
						</div>
						{interval === "year" && (
							<p className="text-xs text-[hsl(180,70%,45%)] mt-1">
								{formatPrice(price)}/year · <span className="font-semibold">Save {savings}%</span>
							</p>
						)}
						{plan.trialDays > 0 && (
							<p className="text-xs text-[hsl(199,89%,49%)] mt-1">
								{plan.trialDays}-day free trial included
							</p>
						)}
					</>
				)}
			</div>

			<ul className="space-y-3 mb-8 flex-1">
				{plan.features.map((feature) => (
					<li key={feature} className="flex items-start gap-2.5 text-sm text-[hsl(216,33%,80%)]">
						<Check className="w-4 h-4 text-[hsl(180,70%,45%)] shrink-0 mt-0.5" />
						{feature}
					</li>
				))}
			</ul>

			{isFree ? (
				session?.user ? (
					<div className="text-center text-sm text-[hsl(216,33%,68%)] py-2.5 rounded-xl border border-[hsl(216,33%,20%)]">
						Your current plan
					</div>
				) : (
					<Link
						to={ROUTES.SIGNUP as string}
						className="block text-center px-6 py-2.5 rounded-xl border border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-white transition-colors text-sm font-medium"
					>
						Get started free
					</Link>
				)
			) : (
				session?.user ? (
					isCurrentPlan ? (
						<div className="text-center text-sm text-[hsl(180,70%,45%)] py-2.5 rounded-xl border border-[hsl(180,70%,45%)]/40">
							Current plan
						</div>
					) : (
						<button
							type="button"
							onClick={() => upgrade(plan.id, interval, returnTo)}
							disabled={isUpgrading}
							className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
								plan.isPopular
									? "bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white"
									: "border border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-white"
							}`}
						>
							{isUpgrading ? "Loading..." : (plan.isPopular ? "Start Free Trial" : `Upgrade to ${plan.name}`)}
						</button>
					)
				) : (
					<Link
						to={`${ROUTES.SIGNUP}?redirect=/pricing` as string}
						className={`block text-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
							plan.isPopular
								? "bg-gradient-to-r from-[hsl(199,89%,49%)] to-[hsl(180,70%,45%)] text-white"
								: "border border-[hsl(216,33%,30%)] text-[hsl(216,33%,68%)] hover:border-[hsl(199,89%,49%)] hover:text-white"
						}`}
					>
						{plan.isPopular ? "Start Free Trial" : `Get ${plan.name}`}
					</Link>
				)
			)}
		</div>
	);
}

function PricingPage() {
	const [interval, setInterval] = useState<"month" | "year">("month");
	const plans = PLANS.slice().sort((a, b) => a.sortOrder - b.sortOrder);

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<section className="pt-32 pb-16 text-center px-4">
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(199,89%,49%)]/10 border border-[hsl(199,89%,49%)]/20 text-[hsl(199,89%,49%)] text-xs font-semibold mb-6">
					<Sparkles className="w-3 h-3" /> Simple, transparent pricing
				</div>
				<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
					Invest in your reading
				</h1>
				<p className="text-lg text-[hsl(216,33%,68%)] max-w-xl mx-auto mb-10">
					Unlock unlimited access to premium articles, courses, and an ever-growing library of knowledge.
				</p>

				{/* Interval toggle */}
				<div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(216,33%,20%)]">
					<button
						type="button"
						onClick={() => setInterval("month")}
						className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
							interval === "month"
								? "bg-[hsl(216,33%,20%)] text-white"
								: "text-[hsl(216,33%,68%)] hover:text-white"
						}`}
					>
						Monthly
					</button>
					<button
						type="button"
						onClick={() => setInterval("year")}
						className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
							interval === "year"
								? "bg-[hsl(216,33%,20%)] text-white"
								: "text-[hsl(216,33%,68%)] hover:text-white"
						}`}
					>
						Yearly
						<span className="text-[10px] font-bold text-[hsl(180,70%,45%)] bg-[hsl(180,70%,45%)]/10 px-1.5 py-0.5 rounded-full">
							SAVE 17%
						</span>
					</button>
				</div>
			</section>

			{/* Plan cards */}
			<section className="pb-24 px-4">
				<div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
					{plans.map((plan) => (
						<PlanCard key={plan.id} plan={plan} interval={interval} />
					))}
				</div>
			</section>

			{/* Comparison table */}
			<section className="pb-24 px-4">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-2xl font-bold text-white text-center mb-10">Compare plans</h2>
					<div className="rounded-2xl border border-[hsl(216,33%,20%)] overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)]">
									<th className="text-left px-6 py-4 text-[hsl(216,33%,68%)] font-medium w-1/2">Feature</th>
									{plans.map((p) => (
										<th key={p.id} className={`text-center px-4 py-4 font-semibold ${p.isPopular ? "text-[hsl(199,89%,49%)]" : "text-white"}`}>
											{p.name}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{COMPARISON_FEATURES.map((row, i) => (
									<tr key={row.label} className={`border-b border-[hsl(216,33%,20%)]/50 ${i % 2 === 0 ? "bg-[hsl(222,47%,10%)]" : "bg-[hsl(222,47%,12%)]"}`}>
										<td className="px-6 py-3.5 text-[hsl(216,33%,80%)]">{row.label}</td>
										{(["free", "pro", "enterprise"] as const).map((planId) => {
											const val = row[planId];
											return (
												<td key={planId} className="text-center px-4 py-3.5">
													{typeof val === "boolean" ? (
														val
															? <Check className="w-4 h-4 text-[hsl(180,70%,45%)] mx-auto" />
															: <span className="text-[hsl(216,33%,35%)] text-lg">—</span>
													) : (
														<span className="text-[hsl(216,33%,80%)] text-xs">{val}</span>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* FAQ */}
			<section className="pb-32 px-4">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-2xl font-bold text-white text-center mb-10">Common questions</h2>
					<div className="space-y-6">
						{[
							{
								q: "Can I cancel anytime?",
								a: "Yes. Cancel at any time from your billing dashboard — you keep access until the end of your billing period.",
							},
							{
								q: "What happens after the free trial?",
								a: "You'll be charged at the start of your first billing cycle. We'll send a reminder 3 days before the trial ends.",
							},
							{
								q: "Do authors pay for a subscription?",
								a: "Authors get free access to all premium content as part of their contributor benefits. Enterprise features still require a plan.",
							},
							{
								q: "Are digital products and courses included?",
								a: "Pro subscribers get access to Pro-tier courses. Individual digital products can be purchased separately by any user.",
							},
							{
								q: "Is there an affiliate program?",
								a: "Yes — once your account is established, you can apply for an affiliate code from your dashboard and earn a commission on referrals.",
							},
						].map(({ q, a }) => (
							<div key={q} className="rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] p-6">
								<h3 className="font-semibold text-white mb-2">{q}</h3>
								<p className="text-sm text-[hsl(216,33%,68%)] leading-relaxed">{a}</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
