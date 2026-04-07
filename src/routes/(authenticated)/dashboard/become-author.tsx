import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
	ArrowLeft, ArrowRight, CheckCircle, User, FileText, Shield,
	ImageIcon, CreditCard, Star, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/auth-client";
import { useApplyForAuthor, useMyAuthorApplication } from "@/lib/blog/queries";
import { useCreateCheckout } from "@/hooks/use-billing";
import { PLANS, formatPrice } from "@/lib/billing/plans";

export const Route = createFileRoute("/(authenticated)/dashboard/become-author")({
	validateSearch: z.object({ setup: z.coerce.number().optional() }),
	component: BecomeAuthorPage,
});

const AUTHOR_PLANS = PLANS.filter((p) => p.id === "author" || p.id === "author_premium");
const PROFILE_STEPS = ["Profile", "Bio", "Review"] as const;
// Role precedence — author and above counts as having the writing role
const AUTHOR_ROLES = new Set(["author", "moderator", "admin", "superAdmin"]);

function slugifyUsername(str: string) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function BecomeAuthorPage() {
	const navigate = useNavigate();
	const { setup } = Route.useSearch();
	const { data: session } = useSession();
	const applyMutation = useApplyForAuthor();
	const applicationQuery = useMyAuthorApplication();
	const checkoutMutation = useCreateCheckout();

	const application = applicationQuery.data?.ok ? applicationQuery.data.data : null;
	const userRole = (session?.user as any)?.role as string | undefined;
	const hasAuthorRole = AUTHOR_ROLES.has(userRole ?? "");

	// Plan selection state
	const [selectedPlan, setSelectedPlan] = useState<string>("author");
	const [interval, setInterval] = useState<"month" | "year">("month");

	// Profile wizard state
	const [profileStep, setProfileStep] = useState(0);
	const [username, setUsername] = useState(
		slugifyUsername((session?.user as any)?.name ?? session?.user?.email?.split("@")[0] ?? ""),
	);
	const [displayName, setDisplayName] = useState((session?.user as any)?.name ?? "");
	const [bio, setBio] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");
	const [acceptedPolicy, setAcceptedPolicy] = useState(false);

	// ─── State A: Already an approved author ───────────────────────────────────
	if (application?.applicationStatus === "approved") {
		return (
			<div className="min-h-screen bg-[var(--bg-oxford-blue-2)] flex items-center justify-center px-4">
				<div className="max-w-md w-full text-center space-y-4">
					<CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
					<h1 className="text-2xl font-bold text-[var(--text-alice-blue)]">You're an Author!</h1>
					<p className="text-[var(--text-slate-gray)]">Your author profile is live. Start writing!</p>
					<Link
						to={"/editor/new" as string}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors"
					>
						Write your first post
					</Link>
				</div>
			</div>
		);
	}

	// ─── State B: Has author role (paid) but profile not set up yet ────────────
	if (hasAuthorRole || setup) {
		async function handleProfileSubmit() {
			if (!acceptedPolicy) {
				toast.error("You must accept the platform policy.");
				return;
			}
			if (bio.trim().length < 20) {
				toast.error("Bio must be at least 20 characters.");
				return;
			}
			const result = await applyMutation.mutateAsync({
				username,
				displayName,
				bio,
				avatarUrl: avatarUrl.trim() || undefined,
				acceptedPolicy: true,
			});
			if (result?.ok) {
				navigate({ to: "/dashboard" as string });
			}
		}

		return (
			<div className="min-h-screen bg-[var(--bg-oxford-blue-2)] text-[var(--text-shadow-blue)]">
				<header className="border-b border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] px-6 py-4">
					<div className="max-w-2xl mx-auto flex items-center justify-between">
						<Link
							to={"/dashboard" as string}
							className="flex items-center gap-2 text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] transition-colors"
						>
							<ArrowLeft className="h-4 w-4" /> Dashboard
						</Link>
						<h1 className="text-base font-semibold text-[var(--text-alice-blue)]">Set Up Author Profile</h1>
						<div className="w-20" />
					</div>
				</header>

				<main className="max-w-2xl mx-auto px-6 py-10">
					{/* Subscription confirmed banner */}
					<div className="mb-6 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
						<CheckCircle className="h-4 w-4 shrink-0" />
						Subscription active — complete your author profile to start publishing.
					</div>

					{/* Step indicator */}
					<div className="flex items-center gap-2 mb-8">
						{PROFILE_STEPS.map((label, i) => (
							<div key={label} className="flex items-center gap-2 flex-1">
								<div className={`flex items-center gap-2 text-xs font-medium ${i <= profileStep ? "text-[var(--bg-carolina-blue)]" : "text-[var(--text-slate-dark)]"}`}>
									<div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] border ${i < profileStep ? "bg-[var(--bg-carolina-blue)] border-[var(--bg-carolina-blue)] text-white" : i === profileStep ? "border-[var(--bg-carolina-blue)] text-[var(--bg-carolina-blue)]" : "border-[var(--bg-prussian-blue)] text-[var(--text-slate-dark)]"}`}>
										{i < profileStep ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
									</div>
									<span className="hidden sm:inline">{label}</span>
								</div>
								{i < PROFILE_STEPS.length - 1 && (
									<div className={`flex-1 h-px ${i < profileStep ? "bg-[var(--bg-carolina-blue)]" : "bg-[var(--bg-prussian-blue)]"}`} />
								)}
							</div>
						))}
					</div>

					{/* Step 0 — Profile */}
					{profileStep === 0 && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-[var(--text-alice-blue)] flex items-center gap-2">
									<User className="h-5 w-5" /> Set up your author identity
								</h2>
								<p className="text-sm text-[var(--text-slate-gray)] mt-1">
									Choose a unique username and display name for your public author profile.
								</p>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-medium text-[var(--text-columbia-blue)] mb-1.5">
										Username <span className="text-destructive">*</span>
									</label>
									<div className="flex items-center rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] overflow-hidden focus-within:border-[var(--bg-carolina-blue)]">
										<span className="px-3 text-sm text-[var(--text-slate-gray)] border-r border-[var(--bg-prussian-blue)]">@</span>
										<input
											type="text"
											value={username}
											onChange={(e) => setUsername(slugifyUsername(e.target.value))}
											placeholder="your-username"
											className="flex-1 px-3 py-2.5 text-sm bg-transparent text-[var(--text-alice-blue)] outline-none placeholder:text-[var(--text-slate-darker)]"
										/>
									</div>
									<p className="text-[10px] text-[var(--text-slate-dark)] mt-1">
										Lowercase letters, numbers, hyphens and underscores only. 3–50 characters.
									</p>
								</div>
								<div>
									<label className="block text-xs font-medium text-[var(--text-columbia-blue)] mb-1.5">
										Display Name <span className="text-destructive">*</span>
									</label>
									<input
										type="text"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Your Name"
										className="w-full px-3 py-2.5 rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] text-sm text-[var(--text-alice-blue)] outline-none focus:border-[var(--bg-carolina-blue)] placeholder:text-[var(--text-slate-darker)]"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-[var(--text-columbia-blue)] mb-1.5 flex items-center gap-1.5">
										<ImageIcon className="h-3.5 w-3.5" /> Avatar URL <span className="text-[var(--text-slate-gray)] font-normal">(optional)</span>
									</label>
									<input
										type="url"
										value={avatarUrl}
										onChange={(e) => setAvatarUrl(e.target.value)}
										placeholder="https://example.com/photo.jpg"
										className="w-full px-3 py-2.5 rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] text-sm text-[var(--text-alice-blue)] outline-none focus:border-[var(--bg-carolina-blue)] placeholder:text-[var(--text-slate-darker)]"
									/>
								</div>
							</div>
							<button
								type="button"
								disabled={username.length < 3 || !displayName.trim()}
								onClick={() => setProfileStep(1)}
								className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Continue <ArrowRight className="h-4 w-4" />
							</button>
						</div>
					)}

					{/* Step 1 — Bio */}
					{profileStep === 1 && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-[var(--text-alice-blue)] flex items-center gap-2">
									<FileText className="h-5 w-5" /> Tell readers about yourself
								</h2>
								<p className="text-sm text-[var(--text-slate-gray)] mt-1">
									Your bio appears on your public author profile. Make it compelling!
								</p>
							</div>
							<div>
								<label className="block text-xs font-medium text-[var(--text-columbia-blue)] mb-1.5">
									Bio <span className="text-destructive">*</span>
								</label>
								<textarea
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									placeholder="Tell readers who you are, what you write about, and why they should follow you..."
									rows={6}
									className="w-full px-3 py-2.5 rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue-2)] text-sm text-[var(--text-alice-blue)] outline-none focus:border-[var(--bg-carolina-blue)] placeholder:text-[var(--text-slate-darker)] resize-none"
								/>
								<p className={`text-[10px] mt-1 ${bio.length < 20 ? "text-amber-400" : "text-[var(--text-slate-dark)]"}`}>
									{bio.length < 20 ? `${20 - bio.length} more characters needed` : `${bio.length}/2000`}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setProfileStep(0)}
									className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--bg-prussian-blue)] text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] transition-colors"
								>
									<ArrowLeft className="h-4 w-4" /> Back
								</button>
								<button
									type="button"
									disabled={bio.trim().length < 20}
									onClick={() => setProfileStep(2)}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Continue <ArrowRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}

					{/* Step 2 — Review */}
					{profileStep === 2 && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-[var(--text-alice-blue)] flex items-center gap-2">
									<Shield className="h-5 w-5" /> Review & Publish
								</h2>
								<p className="text-sm text-[var(--text-slate-gray)] mt-1">
									Your profile goes live as soon as you submit.
								</p>
							</div>

							{/* Preview card */}
							<div className="rounded-xl border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-5 space-y-3">
								<div className="flex items-center gap-3">
									{avatarUrl ? (
										<img
											src={avatarUrl}
											alt={displayName}
											className="h-10 w-10 rounded-full object-cover border border-[var(--bg-prussian-blue)]"
										/>
									) : (
										<div className="h-10 w-10 rounded-full bg-[var(--bg-carolina-blue)]/20 border border-[var(--bg-carolina-blue)]/30 flex items-center justify-center text-[var(--bg-carolina-blue)] font-bold text-sm">
											{displayName[0]?.toUpperCase()}
										</div>
									)}
									<div>
										<p className="text-sm font-semibold text-[var(--text-alice-blue)]">{displayName}</p>
										<p className="text-xs text-[var(--text-slate-gray)]">@{username}</p>
									</div>
								</div>
								<p className="text-sm text-[var(--text-shadow-blue)] leading-relaxed">{bio}</p>
							</div>

							<label className="flex items-start gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={acceptedPolicy}
									onChange={(e) => setAcceptedPolicy(e.target.checked)}
									className="mt-0.5 accent-[var(--bg-carolina-blue)]"
								/>
								<span className="text-sm text-[var(--text-slate-gray)]">
									I agree to the platform's{" "}
									<Link to={"/terms" as string} className="text-[var(--bg-carolina-blue)] hover:underline">
										content guidelines and terms of service
									</Link>
									.
								</span>
							</label>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setProfileStep(1)}
									className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--bg-prussian-blue)] text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] transition-colors"
								>
									<ArrowLeft className="h-4 w-4" /> Back
								</button>
								<button
									type="button"
									disabled={!acceptedPolicy || applyMutation.isPending}
									onClick={handleProfileSubmit}
									className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--bg-carolina-blue)] text-white text-sm font-medium hover:bg-[var(--bg-carolina-blue-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{applyMutation.isPending ? "Publishing…" : "Publish Profile"}
								</button>
							</div>
						</div>
					)}
				</main>
			</div>
		);
	}

	// ─── State C: No author role — plan selection ──────────────────────────────
	async function handleCheckout() {
		const result = await checkoutMutation.mutateAsync({
			planId: selectedPlan,
			interval,
			returnTo: "/dashboard/become-author?setup=1",
		});
		if (result?.ok && result.data.checkoutUrl) {
			window.location.href = result.data.checkoutUrl;
		}
	}

	const selectedPlanData = AUTHOR_PLANS.find((p) => p.id === selectedPlan);
	const selectedPrice = interval === "month" ? selectedPlanData?.priceMonthly : selectedPlanData?.priceYearly;

	return (
		<div className="min-h-screen bg-[var(--bg-oxford-blue-2)] text-[var(--text-shadow-blue)]">
			<header className="border-b border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] px-6 py-4">
				<div className="max-w-2xl mx-auto flex items-center justify-between">
					<Link
						to={"/dashboard" as string}
						className="flex items-center gap-2 text-sm text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)] transition-colors"
					>
						<ArrowLeft className="h-4 w-4" /> Dashboard
					</Link>
					<h1 className="text-base font-semibold text-[var(--text-alice-blue)]">Become an Author</h1>
					<div className="w-20" />
				</div>
			</header>

			<main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
				{/* Heading */}
				<div className="text-center space-y-2">
					<h2 className="text-2xl font-bold text-[var(--text-alice-blue)]">Choose your author plan</h2>
					<p className="text-sm text-[var(--text-slate-gray)]">
						Select a plan, pay securely, then set up your profile — you're live immediately.
					</p>
				</div>

				{/* Billing interval toggle */}
				<div className="flex justify-center">
					<div className="inline-flex rounded-lg border border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] p-1 gap-1">
						<button
							type="button"
							onClick={() => setInterval("month")}
							className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${interval === "month" ? "bg-[var(--bg-carolina-blue)] text-white" : "text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)]"}`}
						>
							Monthly
						</button>
						<button
							type="button"
							onClick={() => setInterval("year")}
							className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${interval === "year" ? "bg-[var(--bg-carolina-blue)] text-white" : "text-[var(--text-slate-gray)] hover:text-[var(--text-alice-blue)]"}`}
						>
							Yearly <span className={`text-[10px] rounded px-1 py-0.5 ${interval === "year" ? "bg-white/20" : "bg-emerald-500/20 text-emerald-400"}`}>-17%</span>
						</button>
					</div>
				</div>

				{/* Plan cards */}
				<div className="grid sm:grid-cols-2 gap-4">
					{AUTHOR_PLANS.map((plan) => {
						const price = interval === "month" ? plan.priceMonthly : plan.priceYearly;
						const isSelected = selectedPlan === plan.id;
						return (
							<button
								key={plan.id}
								type="button"
								onClick={() => setSelectedPlan(plan.id)}
								className={`relative text-left rounded-xl border p-5 space-y-4 transition-all ${isSelected ? "border-[var(--bg-carolina-blue)] bg-[var(--bg-carolina-blue)]/5" : "border-[var(--bg-prussian-blue)] bg-[var(--bg-oxford-blue)] hover:border-[var(--bg-carolina-blue)]/50"}`}
							>
								{plan.isPopular && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-carolina-blue)] text-white">
											<Star className="h-2.5 w-2.5" /> Most Popular
										</span>
									</div>
								)}

								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text-alice-blue)]">{plan.name}</p>
										<p className="text-xs text-[var(--text-slate-gray)] mt-0.5">{plan.description}</p>
									</div>
									<div className={`h-4 w-4 rounded-full border-2 mt-0.5 ${isSelected ? "border-[var(--bg-carolina-blue)] bg-[var(--bg-carolina-blue)]" : "border-[var(--bg-prussian-blue)]"}`} />
								</div>

								<div>
									<span className="text-2xl font-bold text-[var(--text-alice-blue)]">
										{formatPrice(price)}
									</span>
									<span className="text-xs text-[var(--text-slate-gray)] ml-1">
										/{interval === "month" ? "mo" : "yr"}
									</span>
									{interval === "year" && (
										<p className="text-[10px] text-emerald-400 mt-0.5">
											{formatPrice(plan.priceMonthly * 12 - price)} saved vs monthly
										</p>
									)}
								</div>

								<ul className="space-y-1.5">
									{plan.features.map((f) => (
										<li key={f} className="flex items-center gap-2 text-xs text-[var(--text-shadow-blue)]">
											<CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
											{f}
										</li>
									))}
								</ul>
							</button>
						);
					})}
				</div>

				{/* CTA */}
				<div className="space-y-3">
					<button
						type="button"
						disabled={checkoutMutation.isPending}
						onClick={handleCheckout}
						className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-carolina-blue)] text-white text-sm font-semibold hover:bg-[var(--bg-carolina-blue-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{checkoutMutation.isPending ? (
							<>Redirecting…</>
						) : (
							<>
								<CreditCard className="h-4 w-4" />
								Continue to Payment — {selectedPrice !== undefined ? formatPrice(selectedPrice) : ""}
								{interval === "month" ? "/mo" : "/yr"}
							</>
						)}
					</button>
					<p className="text-center text-[10px] text-[var(--text-slate-dark)]">
						<Zap className="h-3 w-3 inline mr-0.5" />
						Secured by Stripe. Cancel anytime. Profile goes live immediately after payment.
					</p>
				</div>
			</main>
		</div>
	);
}
