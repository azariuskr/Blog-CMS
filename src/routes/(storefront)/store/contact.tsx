import { createFileRoute } from "@tanstack/react-router";
import {
	Clock,
	Mail,
	MapPin,
	MessageCircle,
	Phone,
	Send,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(storefront)/store/contact")({
	component: ContactPage,
});

const topics = [
	{ value: "order", label: "Order Issue" },
	{ value: "return", label: "Return / Refund" },
	{ value: "product", label: "Product Question" },
	{ value: "wholesale", label: "Wholesale Inquiry" },
	{ value: "other", label: "Other" },
];

function ContactPage() {
	const [selectedTopic, setSelectedTopic] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
	};

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pb-12 pt-16 lg:pb-20 lg:pt-24">
				<div className="sf-container relative z-10 text-center">
					<span className="sf-badge mb-6 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600">
						<MessageCircle className="h-3.5 w-3.5" />
						We're Here to Help
					</span>
					<h1
						className="text-4xl font-bold leading-tight md:text-5xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Get in <span className="text-[var(--sf-rose)]">Touch</span>
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-[var(--sf-text-muted)]">
						Questions, feedback, or just want to say hi? We'd love to hear from
						you. Our team typically responds within 24 hours.
					</p>
				</div>

				<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-emerald-100/30 blur-3xl" />
				<div className="absolute bottom-0 right-10 -z-10 h-80 w-80 rounded-full bg-[var(--sf-rose-light)]/20 blur-3xl" />
			</section>

			{/* Contact Info Cards */}
			<section className="sf-container mb-16">
				<div className="grid gap-6 md:grid-cols-3">
					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-rose)]/10 text-[var(--sf-rose)] transition-transform group-hover:scale-110">
							<Mail className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Email Us
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							hello@partypop.com
						</p>
					</div>

					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-orange)]/10 text-[var(--sf-orange)] transition-transform group-hover:scale-110">
							<Phone className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Call Us
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							1-800-PARTY-POP
						</p>
					</div>

					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-110">
							<Clock className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Business Hours
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							Mon-Fri: 9AM - 6PM EST
						</p>
					</div>
				</div>
			</section>

			{/* Contact Form & Map */}
			<section className="sf-container mb-20">
				<div className="grid gap-10 lg:grid-cols-5">
					{/* Form */}
					<div className="lg:col-span-3">
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-8">
							<h2
								className="mb-6 text-2xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Send a Message
							</h2>

							{submitted ? (
								<div className="py-12 text-center">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
										<Send className="h-8 w-8" />
									</div>
									<h3
										className="text-xl font-bold"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										Message Sent!
									</h3>
									<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
										Thanks for reaching out. We'll get back to you within 24
										hours.
									</p>
									<button
										onClick={() => setSubmitted(false)}
										className="sf-btn-outline mt-6 text-sm"
									>
										Send Another Message
									</button>
								</div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-6">
									{/* Topic selector */}
									<div>
										<label className="mb-2 block text-sm font-bold">
											What can we help with?
										</label>
										<div className="flex flex-wrap gap-2">
											{topics.map((t) => (
												<button
													key={t.value}
													type="button"
													onClick={() => setSelectedTopic(t.value)}
													className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
														selectedTopic === t.value
															? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5 text-[var(--sf-rose)]"
															: "border-[var(--sf-border)] hover:border-[var(--sf-rose)]"
													}`}
												>
													{t.label}
												</button>
											))}
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="mb-2 block text-sm font-bold">
												First Name
											</label>
											<input
												type="text"
												required
												className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
												placeholder="Sarah"
											/>
										</div>
										<div>
											<label className="mb-2 block text-sm font-bold">
												Last Name
											</label>
											<input
												type="text"
												required
												className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
												placeholder="Johnson"
											/>
										</div>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											Email
										</label>
										<input
											type="email"
											required
											className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder="sarah@example.com"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											Order Number (optional)
										</label>
										<input
											type="text"
											className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder="ORD-XXXXXX"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											Message
										</label>
										<textarea
											required
											rows={5}
											className="w-full resize-none rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder="Tell us how we can help..."
										/>
									</div>

									<button
										type="submit"
										className="sf-btn-primary flex items-center gap-2"
									>
										<Send className="h-4 w-4" />
										Send Message
									</button>
								</form>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="space-y-6 lg:col-span-2">
						{/* Office Location */}
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sf-bg)] text-[var(--sf-text)]">
									<MapPin className="h-5 w-5" />
								</div>
								<h3
									className="font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Our Office
								</h3>
							</div>
							<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
								123 Party Lane
								<br />
								Suite 456
								<br />
								Austin, TX 78701
								<br />
								United States
							</p>
						</div>

						{/* Response Times */}
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
							<h3
								className="mb-4 font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Average Response Times
							</h3>
							<div className="space-y-3">
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">Email</span>
									<span className="font-semibold">Within 24 hours</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">Phone</span>
									<span className="font-semibold">Immediate</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">Returns</span>
									<span className="font-semibold">1-2 business days</span>
								</div>
							</div>
						</div>

						{/* Social */}
						<div className="rounded-2xl bg-[var(--sf-bg-warm)] p-6 text-center">
							<h3
								className="mb-2 font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Follow the Fun
							</h3>
							<p className="text-sm text-[var(--sf-text-muted)]">
								Stay connected for party inspo, deals, and behind-the-scenes
								peeks.
							</p>
							<div className="mt-4 flex justify-center gap-3">
								{["Instagram", "TikTok", "Pinterest"].map((platform) => (
									<span
										key={platform}
										className="rounded-full border border-[var(--sf-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--sf-text-muted)] transition-colors hover:border-[var(--sf-rose)] hover:text-[var(--sf-rose)]"
									>
										{platform}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
