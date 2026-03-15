import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, User, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/auth-client";
import { useApplyForAuthor, useMyAuthorApplication } from "@/lib/blog/queries";

export const Route = createFileRoute("/(authenticated)/dashboard/become-author")({
	component: BecomeAuthorPage,
});

const STEPS = ["Profile", "Bio", "Review & Submit"] as const;

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
	const { data: session } = useSession();
	const applyMutation = useApplyForAuthor();
	const applicationQuery = useMyAuthorApplication();
	const application = applicationQuery.data?.ok ? applicationQuery.data.data : null;

	const [step, setStep] = useState(0);
	const [username, setUsername] = useState(
		slugifyUsername((session?.user as any)?.name ?? session?.user?.email?.split("@")[0] ?? ""),
	);
	const [displayName, setDisplayName] = useState((session?.user as any)?.name ?? "");
	const [bio, setBio] = useState("");
	const [acceptedPolicy, setAcceptedPolicy] = useState(false);

	// Already applied or approved
	if (application?.applicationStatus === "approved") {
		return (
			<div className="min-h-screen bg-[hsl(222,47%,11%)] flex items-center justify-center px-4">
				<div className="max-w-md w-full text-center space-y-4">
					<CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
					<h1 className="text-2xl font-bold text-[hsl(216,100%,95%)]">You're an Author!</h1>
					<p className="text-[hsl(217,17%,48%)]">Your author application has been approved. Start writing!</p>
					<Link
						to="/editor/new"
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(199,89%,49%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,42%)] transition-colors"
					>
						Write your first post
					</Link>
				</div>
			</div>
		);
	}

	if (application?.applicationStatus === "pending") {
		return (
			<div className="min-h-screen bg-[hsl(222,47%,11%)] flex items-center justify-center px-4">
				<div className="max-w-md w-full text-center space-y-4">
					<div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
						<FileText className="h-6 w-6 text-amber-400" />
					</div>
					<h1 className="text-xl font-bold text-[hsl(216,100%,95%)]">Application Under Review</h1>
					<p className="text-[hsl(217,17%,48%)] text-sm">
						Your application as <strong className="text-[hsl(216,33%,68%)]">@{application.username}</strong> is pending admin review.
						You'll be notified once a decision is made.
					</p>
					<Link
						to="/dashboard"
						className="inline-flex items-center gap-2 text-sm text-[hsl(199,89%,49%)] hover:underline"
					>
						<ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
					</Link>
				</div>
			</div>
		);
	}

	async function handleSubmit() {
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
			acceptedPolicy: true,
		});
		if (result?.ok) {
			navigate({ to: "/dashboard" as string });
		}
	}

	return (
		<div className="min-h-screen bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)]">
			{/* Header */}
			<header className="border-b border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] px-6 py-4">
				<div className="max-w-2xl mx-auto flex items-center justify-between">
					<Link
						to="/dashboard"
						className="flex items-center gap-2 text-sm text-[hsl(217,17%,48%)] hover:text-[hsl(216,100%,95%)] transition-colors"
					>
						<ArrowLeft className="h-4 w-4" /> Dashboard
					</Link>
					<h1 className="text-base font-semibold text-[hsl(216,100%,95%)]">Become an Author</h1>
					<div className="w-20" />
				</div>
			</header>

			<main className="max-w-2xl mx-auto px-6 py-10">
				{/* Step indicator */}
				<div className="flex items-center gap-2 mb-8">
					{STEPS.map((label, i) => (
						<div key={label} className="flex items-center gap-2 flex-1">
							<div className={`flex items-center gap-2 text-xs font-medium ${i <= step ? "text-[hsl(199,89%,49%)]" : "text-[hsl(217,17%,40%)]"}`}>
								<div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] border ${i < step ? "bg-[hsl(199,89%,49%)] border-[hsl(199,89%,49%)] text-white" : i === step ? "border-[hsl(199,89%,49%)] text-[hsl(199,89%,49%)]" : "border-[hsl(216,33%,20%)] text-[hsl(217,17%,40%)]"}`}>
									{i < step ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
								</div>
								<span className="hidden sm:inline">{label}</span>
							</div>
							{i < STEPS.length - 1 && (
								<div className={`flex-1 h-px ${i < step ? "bg-[hsl(199,89%,49%)]" : "bg-[hsl(216,33%,20%)]"}`} />
							)}
						</div>
					))}
				</div>

				{/* Step 0 — Profile */}
				{step === 0 && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold text-[hsl(216,100%,95%)] flex items-center gap-2">
								<User className="h-5 w-5" /> Set up your author identity
							</h2>
							<p className="text-sm text-[hsl(217,17%,48%)] mt-1">
								Choose a unique username and display name for your public author profile.
							</p>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-[hsl(199,69%,84%)] mb-1.5">
									Username <span className="text-destructive">*</span>
								</label>
								<div className="flex items-center rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] overflow-hidden focus-within:border-[hsl(199,89%,49%)]">
									<span className="px-3 text-sm text-[hsl(217,17%,48%)] border-r border-[hsl(216,33%,20%)]">@</span>
									<input
										type="text"
										value={username}
										onChange={(e) => setUsername(slugifyUsername(e.target.value))}
										placeholder="your-username"
										className="flex-1 px-3 py-2.5 text-sm bg-transparent text-[hsl(216,100%,95%)] outline-none placeholder:text-[hsl(217,17%,35%)]"
									/>
								</div>
								<p className="text-[10px] text-[hsl(217,17%,40%)] mt-1">
									Lowercase letters, numbers, hyphens and underscores only. 3–50 characters.
								</p>
							</div>
							<div>
								<label className="block text-xs font-medium text-[hsl(199,69%,84%)] mb-1.5">
									Display Name <span className="text-destructive">*</span>
								</label>
								<input
									type="text"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder="Your Name"
									className="w-full px-3 py-2.5 rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] text-sm text-[hsl(216,100%,95%)] outline-none focus:border-[hsl(199,89%,49%)] placeholder:text-[hsl(217,17%,35%)]"
								/>
							</div>
						</div>
						<button
							type="button"
							disabled={username.length < 3 || !displayName.trim()}
							onClick={() => setStep(1)}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(199,89%,49%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,42%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Continue <ArrowRight className="h-4 w-4" />
						</button>
					</div>
				)}

				{/* Step 1 — Bio */}
				{step === 1 && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold text-[hsl(216,100%,95%)] flex items-center gap-2">
								<FileText className="h-5 w-5" /> Tell readers about yourself
							</h2>
							<p className="text-sm text-[hsl(217,17%,48%)] mt-1">
								Your bio appears on your public author profile. Make it compelling!
							</p>
						</div>
						<div>
							<label className="block text-xs font-medium text-[hsl(199,69%,84%)] mb-1.5">
								Bio <span className="text-destructive">*</span>
							</label>
							<textarea
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								placeholder="Tell readers who you are, what you write about, and why they should follow you..."
								rows={6}
								className="w-full px-3 py-2.5 rounded-lg border border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)] text-sm text-[hsl(216,100%,95%)] outline-none focus:border-[hsl(199,89%,49%)] placeholder:text-[hsl(217,17%,35%)] resize-none"
							/>
							<div className="flex justify-between mt-1">
								<p className={`text-[10px] ${bio.length < 20 ? "text-amber-400" : "text-[hsl(217,17%,40%)]"}`}>
									{bio.length < 20 ? `${20 - bio.length} more characters needed` : `${bio.length}/2000`}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setStep(0)}
								className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(216,33%,20%)] text-sm text-[hsl(217,17%,48%)] hover:text-[hsl(216,100%,95%)] transition-colors"
							>
								<ArrowLeft className="h-4 w-4" /> Back
							</button>
							<button
								type="button"
								disabled={bio.trim().length < 20}
								onClick={() => setStep(2)}
								className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(199,89%,49%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,42%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Continue <ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}

				{/* Step 2 — Review & Submit */}
				{step === 2 && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold text-[hsl(216,100%,95%)] flex items-center gap-2">
								<Shield className="h-5 w-5" /> Review & Submit
							</h2>
							<p className="text-sm text-[hsl(217,17%,48%)] mt-1">
								Review your application before submitting for admin review.
							</p>
						</div>

						{/* Preview card */}
						<div className="rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] p-5 space-y-3">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-[hsl(199,89%,49%)]/20 border border-[hsl(199,89%,49%)]/30 flex items-center justify-center text-[hsl(199,89%,49%)] font-bold text-sm">
									{displayName[0]?.toUpperCase()}
								</div>
								<div>
									<p className="text-sm font-semibold text-[hsl(216,100%,95%)]">{displayName}</p>
									<p className="text-xs text-[hsl(217,17%,48%)]">@{username}</p>
								</div>
							</div>
							<p className="text-sm text-[hsl(217,24%,59%)] leading-relaxed">{bio}</p>
						</div>

						{/* Policy acceptance */}
						<label className="flex items-start gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={acceptedPolicy}
								onChange={(e) => setAcceptedPolicy(e.target.checked)}
								className="mt-0.5 accent-[hsl(199,89%,49%)]"
							/>
							<span className="text-sm text-[hsl(217,17%,48%)]">
								I agree to the platform's{" "}
								<Link to="/terms" className="text-[hsl(199,89%,49%)] hover:underline">
									content guidelines and terms of service
								</Link>
								. I understand that my application will be reviewed before I can publish posts.
							</span>
						</label>

						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setStep(1)}
								className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(216,33%,20%)] text-sm text-[hsl(217,17%,48%)] hover:text-[hsl(216,100%,95%)] transition-colors"
							>
								<ArrowLeft className="h-4 w-4" /> Back
							</button>
							<button
								type="button"
								disabled={!acceptedPolicy || applyMutation.isPending}
								onClick={handleSubmit}
								className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[hsl(199,89%,49%)] text-white text-sm font-medium hover:bg-[hsl(199,89%,42%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{applyMutation.isPending ? "Submitting…" : "Submit Application"}
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
