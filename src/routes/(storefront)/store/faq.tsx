import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	ChevronDown,
	Globe,
	HelpCircle,
	Package,
	Rocket,
	Tag,
	Truck,
} from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export const Route = createFileRoute("/(storefront)/store/faq")({
	component: FaqPage,
});

const shippingMethods = [
	{ method: "Standard Ground", time: "3-5 Business Days", cost: "$5.99 (Free over $75)" },
	{ method: "Express Saver", time: "2 Business Days", cost: "$12.99" },
	{ method: "Overnight Party", time: "1 Business Day", cost: "$24.99" },
];

const faqItems = [
	{
		q: "Where is my order?",
		a: "Once your order ships, you'll receive an email with a tracking number. You can also log into your account to see real-time updates. Please allow 24 hours for the tracking to update after the label is created.",
	},
	{
		q: "Do you offer wholesale pricing?",
		a: "Yes! We love partnering with event planners and boutique shops. Please fill out our wholesale application form on the contact page, and we'll get back to you within 3 business days with our catalog and discount tiers.",
	},
	{
		q: "Can I change or cancel my order?",
		a: "We move fast! You have 1 hour after placing your order to request changes. After that, your order enters our packing queue. Contact us ASAP and we'll do our best to accommodate changes.",
	},
	{
		q: "Are your products eco-friendly?",
		a: "We're committed to sustainability. Over 80% of our catalog is either biodegradable, compostable, or reusable. Look for our green leaf icon on eco-certified products.",
	},
	{
		q: "Do you ship internationally?",
		a: "Absolutely! We ship to over 50 countries. International shipping rates are calculated at checkout based on destination and package weight. Duties and import taxes may apply.",
	},
	{
		q: "What payment methods do you accept?",
		a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption.",
	},
];

function FaqPage() {
	const { t } = useTranslation("faq");
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const returnBenefits = [t("returnsBenefit1"), t("returnsBenefit2"), t("returnsBenefit3")];

	const returnSteps = [
		{ step: 1, title: t("step1Title"), desc: t("step1Desc") },
		{ step: 2, title: t("step2Title"), desc: t("step2Desc") },
		{ step: 3, title: t("step3Title"), desc: t("step3Desc") },
	];

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pb-12 pt-16 lg:pb-24 lg:pt-20">
				<div className="sf-container relative z-10 text-center">
					<span className="sf-badge mb-6 inline-flex items-center gap-1.5 bg-sky-50 text-sky-600">
						<HelpCircle className="h-3.5 w-3.5" />
						{t("badge")}
					</span>
					<h1
						className="text-4xl font-bold leading-tight md:text-5xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						<Trans
							i18nKey="heroTitle"
							ns="faq"
							components={{
								1: (
									<>
										<br />
										<span className="text-[var(--sf-rose)]" />
									</>
								),
							}}
						/>
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-[var(--sf-text-muted)]">
						{t("heroSubtitle")}
					</p>
				</div>

				<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-sky-100/30 blur-3xl" />
				<div className="absolute bottom-0 right-10 -z-10 h-80 w-80 rounded-full bg-[var(--sf-rose-light)]/20 blur-3xl" />
			</section>

			{/* Shipping Info */}
			<section className="sf-container mb-20">
				<h2
					className="mb-8 flex items-center gap-3 text-2xl font-bold"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sf-orange)]/10 text-[var(--sf-orange)]">
						<Package className="h-4 w-4" />
					</div>
					{t("shippingTitle")}
				</h2>

				<div className="grid gap-6 md:grid-cols-3">
					<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
						<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sf-bg)] text-[var(--sf-text)]">
							<Rocket className="h-5 w-5" />
						</div>
						<h3
							className="mb-2 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("processingTitle")}
						</h3>
						<p
							className="text-sm leading-relaxed text-[var(--sf-text-muted)]"
							dangerouslySetInnerHTML={{ __html: t("processingDesc") }}
						/>
					</div>

					<div className="relative rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
						<span className="absolute right-4 top-4 rounded-full bg-[var(--sf-rose)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sf-rose)]">
							{t("freeShippingBadge")}
						</span>
						<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sf-bg)] text-[var(--sf-text)]">
							<Tag className="h-5 w-5" />
						</div>
						<h3
							className="mb-2 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("freeShippingTitle")}
						</h3>
						<p
							className="text-sm leading-relaxed text-[var(--sf-text-muted)]"
							dangerouslySetInnerHTML={{ __html: t("freeShippingDesc") }}
						/>
					</div>

					<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
						<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sf-bg)] text-[var(--sf-text)]">
							<Globe className="h-5 w-5" />
						</div>
						<h3
							className="mb-2 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("internationalTitle")}
						</h3>
						<p
							className="text-sm leading-relaxed text-[var(--sf-text-muted)]"
							dangerouslySetInnerHTML={{ __html: t("internationalDesc") }}
						/>
					</div>
				</div>

				{/* Shipping Table */}
				<div className="mt-8 overflow-hidden rounded-2xl border border-[var(--sf-border-light)] bg-white">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-[var(--sf-bg)] text-xs font-semibold uppercase text-[var(--sf-text-muted)]">
								<tr>
									<th className="px-6 py-4">{t("tableMethod")}</th>
									<th className="px-6 py-4">{t("tableTimeframe")}</th>
									<th className="px-6 py-4">{t("tableCost")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--sf-border-light)] text-[var(--sf-text-muted)]">
								{shippingMethods.map((row) => (
									<tr key={row.method} className="transition-colors hover:bg-[var(--sf-bg)]/50">
										<td className="px-6 py-4 font-medium text-[var(--sf-text)]">{row.method}</td>
										<td className="px-6 py-4">{row.time}</td>
										<td className="px-6 py-4">{row.cost}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* Returns Policy */}
			<section className="sf-container mb-20">
				<div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 md:p-12">
					<div className="absolute bottom-0 right-0 h-64 w-64 translate-x-10 translate-y-10 rounded-full bg-[var(--sf-rose)] opacity-20 blur-3xl" />

					<div className="relative z-10 grid items-center gap-12 md:grid-cols-2">
						<div>
							<span className="sf-badge mb-6 inline-flex items-center gap-1.5 !border-slate-700 !bg-slate-800 text-[var(--sf-rose-light)]">
								{t("returnsBadge")}
							</span>
							<h2
								className="mb-4 text-3xl font-bold text-white"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{t("returnsTitle")}
							</h2>
							<p
								className="mb-6 leading-relaxed text-slate-400"
								dangerouslySetInnerHTML={{ __html: t("returnsDesc") }}
							/>
							<ul className="mb-8 space-y-3">
								{returnBenefits.map((text) => (
									<li key={text} className="flex items-center gap-3 text-sm text-slate-300">
										<Check className="h-4 w-4 text-[var(--sf-rose-light)]" />
										{text}
									</li>
								))}
							</ul>
							<Link
								to="/store/contact"
								className="sf-btn-primary inline-flex items-center gap-2 !bg-white !text-slate-900 hover:!bg-[var(--sf-rose-light)]"
							>
								{t("startReturn")}
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>

						{/* Return Steps */}
						<div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
							<h3
								className="mb-6 font-bold text-white"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{t("howItWorks")}
							</h3>
							<div className="relative space-y-8">
								<div className="absolute bottom-4 left-4 top-4 w-px bg-slate-700" />
								{returnSteps.map((s) => (
									<div key={s.step} className="relative flex gap-4">
										<div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-sm text-[var(--sf-rose-light)]">
											{s.step}
										</div>
										<div>
											<h4 className="text-sm font-medium text-white">{s.title}</h4>
											<p className="mt-1 text-xs text-slate-400">{s.desc}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* FAQ Accordion */}
			<section className="mx-auto mb-24 max-w-3xl px-6 lg:px-12">
				<h2
					className="mb-8 text-center text-2xl font-bold"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					{t("faqTitle")}
				</h2>

				<div className="space-y-4">
					{faqItems.map((item, i) => (
						<div
							key={i}
							className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
								openFaq === i
									? "border-[var(--sf-rose-light)]"
									: "border-[var(--sf-border)]"
							}`}
						>
							<button
								onClick={() => setOpenFaq(openFaq === i ? null : i)}
								className="flex w-full cursor-pointer items-center justify-between p-6 text-left font-medium"
							>
								<span>{item.q}</span>
								<span
									className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
										openFaq === i
											? "rotate-180 bg-[var(--sf-rose)]/10 text-[var(--sf-rose)]"
											: "bg-[var(--sf-bg)] text-[var(--sf-text-muted)]"
									}`}
								>
									<ChevronDown className="h-4 w-4" />
								</span>
							</button>
							{openFaq === i && (
								<div className="px-6 pb-6 text-sm leading-relaxed text-[var(--sf-text-muted)]">
									{item.a}
								</div>
							)}
						</div>
					))}
				</div>
			</section>

			{/* Still have questions */}
			<section className="sf-container mb-20 text-center">
				<div className="rounded-2xl bg-[var(--sf-bg-warm)] p-10">
					<Truck className="mx-auto mb-4 h-10 w-10 text-[var(--sf-rose)]" />
					<h3
						className="text-xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{t("stillHaveQuestions")}
					</h3>
					<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
						{t("stillHaveQuestionsDesc")}
					</p>
					<Link
						to="/store/contact"
						className="sf-btn-primary mt-6 inline-flex items-center gap-2"
					>
						{t("common:contactUs")}
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>
			</section>
		</>
	);
}
