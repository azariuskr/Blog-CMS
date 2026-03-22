import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
	PenLine,
	CheckCircle2,
	Clock,
	XCircle,
	User,
	AtSign,
	FileText,
	ImageIcon,
	ShieldCheck,
	ChevronRight,
	ArrowLeft,
} from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { useApplyForAuthor, useMyAuthorApplication } from "@/lib/blog/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(blog)/author-onboarding")({
	beforeLoad: ({ context }) => {
		if (!context.user?.user) {
			throw redirect({ to: ROUTES.LOGIN });
		}
	},
	loader: async ({ context }) => {
		// Prefetch existing application so status banner renders on first paint
		await context.queryClient.prefetchQuery({
			queryKey: ["blog", "author-application", "mine"],
			queryFn: () => import("@/lib/blog/functions").then((m) => m.$getMyAuthorApplication({ data: {} })),
		});
	},
	component: AuthorOnboardingPage,
});

// ---------------------------------------------------------------------------
// Status banner shown when the user already has an application
// ---------------------------------------------------------------------------

function ApplicationStatus({ status }: { status: string }) {
	const configs = {
		pending: {
			icon: Clock,
			title: "Application Under Review",
			message:
				"Your author application has been submitted and is awaiting admin review. We'll notify you once a decision has been made.",
			border: "border-wild-blue-yonder/40",
			iconColor: "text-wild-blue-yonder",
			badge: "bg-prussian-blue text-columbia-blue",
			badgeLabel: "Pending",
		},
		approved: {
			icon: CheckCircle2,
			title: "Application Approved!",
			message:
				"Congratulations! Your author application has been approved. You can now write and publish posts.",
			border: "border-blog-teal/40",
			iconColor: "text-blog-teal",
			badge: "bg-blog-teal/20 text-blog-teal",
			badgeLabel: "Approved",
		},
		rejected: {
			icon: XCircle,
			title: "Application Not Approved",
			message:
				"Unfortunately your application was not approved at this time. You're welcome to update your profile and re-apply.",
			border: "border-red-500/40",
			iconColor: "text-red-400",
			badge: "bg-red-500/20 text-red-400",
			badgeLabel: "Rejected",
		},
	} as const;

	const cfg = configs[status as keyof typeof configs] ?? configs.pending;
	const Icon = cfg.icon;

	return (
		<div className={cn("navy-blue-blog-card rounded-2xl p-8 border", cfg.border)}>
			<div className="flex items-start gap-5">
				<div className="shrink-0">
					<Icon className={cn("w-10 h-10", cfg.iconColor)} />
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h2 className="text-xl font-bold text-alice-blue">{cfg.title}</h2>
						<span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cfg.badge)}>
							{cfg.badgeLabel}
						</span>
					</div>
					<p className="text-wild-blue-yonder leading-relaxed">{cfg.message}</p>
					{status === "approved" && (
						<Link
							to={ROUTES.EDITOR.NEW as string}
							className="navy-blue-blog-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl mt-5 text-sm"
						>
							<PenLine className="w-4 h-4" />
							Start Writing
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Input field wrapper
// ---------------------------------------------------------------------------

function Field({
	label,
	hint,
	error,
	icon: Icon,
	children,
}: {
	label: string;
	hint?: string;
	error?: string;
	icon?: React.ElementType;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="flex items-center gap-2 text-sm font-medium text-columbia-blue">
				{Icon && <Icon className="w-4 h-4 text-carolina-blue" />}
				{label}
			</label>
			{children}
			{hint && !error && <p className="text-xs text-slate-gray">{hint}</p>}
			{error && <p className="text-xs text-red-400">{error}</p>}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function AuthorOnboardingPage() {
	const { data: session } = useSession();
	const user = session?.user;

	const applicationQuery = useMyAuthorApplication();
	const applyMutation = useApplyForAuthor();

	const [form, setForm] = useState({
		username: "",
		displayName: user?.name ?? "",
		bio: "",
		avatarUrl: "",
		acceptedPolicy: false,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const existingApplication = (applicationQuery.data as any)?.data as
		| { status: string; username: string; displayName: string }
		| null
		| undefined;

	// ------------------------------------------------------------------
	// Validation
	// ------------------------------------------------------------------

	function validate() {
		const errs: Record<string, string> = {};
		if (!form.username.trim()) {
			errs.username = "Username is required.";
		} else if (!/^[a-z0-9_-]+$/.test(form.username)) {
			errs.username = "Only lowercase letters, numbers, hyphens and underscores.";
		} else if (form.username.length < 3) {
			errs.username = "At least 3 characters.";
		}
		if (!form.displayName.trim()) {
			errs.displayName = "Display name is required.";
		}
		if (form.bio.trim().length < 20) {
			errs.bio = `At least 20 characters (${form.bio.trim().length}/20).`;
		}
		if (form.avatarUrl && !/^https?:\/\//.test(form.avatarUrl)) {
			errs.avatarUrl = "Must be a valid URL starting with http:// or https://";
		}
		if (!form.acceptedPolicy) {
			errs.acceptedPolicy = "You must accept the platform policy to continue.";
		}
		return errs;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const errs = validate();
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setErrors({});

		const result = await applyMutation.mutateAsync({
			username: form.username.trim(),
			displayName: form.displayName.trim(),
			bio: form.bio.trim(),
			avatarUrl: form.avatarUrl.trim() || undefined,
			acceptedPolicy: true,
		});

		if (result?.ok) {
			toast.success("Application submitted! We'll review it shortly.");
		} else {
			const msg =
				(result as any)?.error?.message ?? "Failed to submit application. Please try again.";
			toast.error(msg);
		}
	}

	const inputClass =
		"w-full h-12 px-4 rounded-xl bg-oxford-blue border border-prussian-blue text-alice-blue placeholder:text-yonder-dim focus:outline-none focus:border-carolina-blue transition-colors text-sm";

	return (
		<div>
			{/* Hero */}
			<section className="pt-[180px] pb-[60px] relative">
				<div className="container mx-auto px-4 max-w-[720px]">
					<Link
						to={"/authors" as string}
						className="inline-flex items-center gap-1.5 text-sm text-wild-blue-yonder hover:text-carolina-blue transition-colors mb-8"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to Authors
					</Link>
					<p className="text-sm font-bold text-wild-blue-yonder mb-4">Become an Author</p>
					<h1 className="headline headline-1 mb-4">
						Share your <span className="navy-blue-blog-gradient-text">voice</span>
					</h1>
					<p className="text-lg text-wild-blue-yonder max-w-xl">
						Apply to join our author community. Write articles, grow your audience, and make an
						impact.
					</p>
				</div>
				<div className="hidden sm:block absolute top-20 right-0 w-[400px] h-[500px] bg-gradient-to-l from-[#0ea5ea10] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Content */}
			<section className="navy-blue-blog-section pt-0 pb-24">
				<div className="container mx-auto px-4 max-w-[720px]">

					{/* Loading state */}
					{applicationQuery.isLoading && (
						<div className="animate-pulse py-10 text-center text-wild-blue-yonder text-sm">
							Checking your application status…
						</div>
					)}

					{/* Existing application */}
					{!applicationQuery.isLoading && existingApplication && (
						<ApplicationStatus status={existingApplication.status} />
					)}

					{/* Application form */}
					{!applicationQuery.isLoading && !existingApplication && (
						<div className="navy-blue-blog-card rounded-2xl p-8">
							<h2 className="text-xl font-bold text-alice-blue mb-6 flex items-center gap-2">
								<PenLine className="w-5 h-5 text-carolina-blue" />
								Author Application
							</h2>

							<form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
								{/* Username */}
								<Field
									label="Username"
									hint="Public handle — e.g. jane-doe. Only lowercase letters, numbers, hyphens, underscores."
									error={errors.username}
									icon={AtSign}
								>
									<input
										type="text"
										value={form.username}
										onChange={(e) =>
											setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))
										}
										placeholder="your-username"
										className={cn(inputClass, errors.username && "border-red-500")}
										autoComplete="username"
									/>
								</Field>

								{/* Display name */}
								<Field
									label="Display Name"
									hint="Your full name or pen name shown on posts."
									error={errors.displayName}
									icon={User}
								>
									<input
										type="text"
										value={form.displayName}
										onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
										placeholder="Jane Doe"
										className={cn(inputClass, errors.displayName && "border-red-500")}
									/>
								</Field>

								{/* Bio */}
								<Field
									label="Bio"
									hint={`Tell readers a bit about yourself. Min 20 characters (${form.bio.trim().length} entered).`}
									error={errors.bio}
									icon={FileText}
								>
									<textarea
										value={form.bio}
										onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
										rows={4}
										placeholder="I'm a developer and writer passionate about…"
										className={cn(
											"w-full px-4 py-3 rounded-xl bg-oxford-blue border border-prussian-blue text-alice-blue placeholder:text-yonder-dim focus:outline-none focus:border-carolina-blue transition-colors text-sm resize-none leading-relaxed",
											errors.bio && "border-red-500",
										)}
									/>
								</Field>

								{/* Avatar URL */}
								<Field
									label="Avatar URL (optional)"
									hint="A publicly accessible image URL for your profile picture."
									error={errors.avatarUrl}
									icon={ImageIcon}
								>
									<input
										type="url"
										value={form.avatarUrl}
										onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
										placeholder="https://example.com/photo.jpg"
										className={cn(inputClass, errors.avatarUrl && "border-red-500")}
									/>
								</Field>

								{/* Policy acceptance */}
								<div className="flex flex-col gap-1.5">
									<label className="flex items-start gap-3 cursor-pointer group">
										<input
											type="checkbox"
											checked={form.acceptedPolicy}
											onChange={(e) =>
												setForm((f) => ({ ...f, acceptedPolicy: e.target.checked }))
											}
											className="mt-0.5 w-4 h-4 accent-carolina-blue shrink-0"
										/>
										<span className="text-sm text-wild-blue-yonder leading-relaxed group-hover:text-alice-blue transition-colors">
											<ShieldCheck className="inline w-4 h-4 text-carolina-blue mr-1 mb-0.5" />
											I agree to the{" "}
											<a href="#" className="text-carolina-blue hover:underline">
												platform policy
											</a>{" "}
											and confirm all content I publish will be original and respectful of
											community guidelines.
										</span>
									</label>
									{errors.acceptedPolicy && (
										<p className="text-xs text-red-400 ml-7">{errors.acceptedPolicy}</p>
									)}
								</div>

								{/* Submit */}
								<div className="pt-2">
									<button
										type="submit"
										disabled={applyMutation.isPending}
										className="navy-blue-blog-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{applyMutation.isPending ? (
											<span className="flex items-center gap-2">
												<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
												Submitting…
											</span>
										) : (
											<>
												Submit Application
												<ChevronRight className="w-4 h-4" />
											</>
										)}
									</button>
								</div>
							</form>
						</div>
					)}

					{/* Benefits strip */}
					{!applicationQuery.isLoading && !existingApplication && (
						<div className="grid sm:grid-cols-3 gap-4 mt-8">
							{[
								{
									icon: PenLine,
									title: "Write & Publish",
									body: "Create rich posts with our block editor and publish to a global audience.",
								},
								{
									icon: User,
									title: "Author Profile",
									body: "Get a dedicated profile page showcasing your posts and followers.",
								},
								{
									icon: CheckCircle2,
									title: "Grow Your Reach",
									body: "Readers can follow you, bookmark your articles, and share your work.",
								},
							].map(({ icon: Icon, title, body }) => (
								<div key={title} className="navy-blue-blog-card p-5 rounded-xl">
									<Icon className="w-6 h-6 text-carolina-blue mb-3" />
									<h3 className="text-sm font-semibold text-columbia-blue mb-1">{title}</h3>
									<p className="text-xs text-wild-blue-yonder leading-relaxed">{body}</p>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
