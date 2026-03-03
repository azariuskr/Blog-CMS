import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Heart,
	Leaf,
	Shield,
	Smile,
	Star,
} from "lucide-react";

export const Route = createFileRoute("/(storefront)/store/about")({
	component: AboutPage,
});

function AboutPage() {
	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pb-20 pt-16 lg:pb-32 lg:pt-24">
				<div className="sf-container relative z-10 text-center">
					<span className="sf-badge mb-6 inline-flex items-center gap-1.5 bg-[var(--sf-rose)]/10 text-[var(--sf-rose)]">
						<Star className="h-3.5 w-3.5" />
						Est. 2015
					</span>
					<h1
						className="text-4xl font-bold leading-tight md:text-6xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						Making memories,
						<br />
						one <span className="text-[var(--sf-rose)]">pop</span> at a time.
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-[var(--sf-text-muted)]">
						We believe that every celebration, big or small, deserves a sprinkle
						of magic. We're on a mission to make party planning as fun as the
						party itself.
					</p>
				</div>

				{/* Decorative blobs */}
				<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-[var(--sf-rose-light)]/20 blur-3xl" />
				<div className="absolute bottom-0 right-10 -z-10 h-80 w-80 rounded-full bg-[var(--sf-orange)]/10 blur-3xl" />
			</section>

			{/* The Story */}
			<section className="border-y border-[var(--sf-border-light)] bg-white py-20">
				<div className="sf-container">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div className="space-y-6">
							<h2
								className="text-3xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								From a Garage to a Global Party
							</h2>
							<div className="space-y-4 leading-relaxed text-[var(--sf-text-muted)]">
								<p>
									It all started with a disastrous 5th birthday party. Our
									founder, Sarah, spent weeks hunting for the perfect
									dinosaur-themed supplies, only to end up with unmatched
									plates and deflated balloons.
								</p>
								<p>
									She realized that creating joy shouldn't be stressful. Armed
									with a passion for design and a garage full of samples,
									PartyPop was born.
								</p>
								<p>
									Today, we curate the world's most delightful party goods,
									testing every popper, balloon, and banner to ensure it brings
									a smile to your face. We aren't just selling supplies;
									we're selling the backdrop to your best memories.
								</p>
							</div>

							{/* Stats */}
							<div className="grid grid-cols-3 gap-6 border-t border-[var(--sf-border-light)] pt-6">
								<div>
									<div
										className="text-2xl font-bold text-[var(--sf-rose)]"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										1M+
									</div>
									<div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--sf-text-light)]">
										Parties Hosted
									</div>
								</div>
								<div>
									<div
										className="text-2xl font-bold text-[var(--sf-rose)]"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										500+
									</div>
									<div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--sf-text-light)]">
										Unique Themes
									</div>
								</div>
								<div>
									<div
										className="text-2xl font-bold text-[var(--sf-rose)]"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										50
									</div>
									<div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--sf-text-light)]">
										Team Members
									</div>
								</div>
							</div>
						</div>

						{/* Image Grid */}
						<div className="relative">
							<div className="absolute -inset-4 -z-10 rotate-2 rounded-3xl bg-[var(--sf-bg-warm)]" />
							<div className="grid grid-cols-2 gap-4">
								<div className="aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--sf-border-light)]">
									<img
										src="/template/products/1p.png"
										alt="Party setup"
										className="h-full w-full object-cover transition-transform duration-500 hover:-translate-y-1"
									/>
								</div>
								<div className="space-y-4 pt-8">
									<div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--sf-border-light)]">
										<img
											src="/template/products/2p.png"
											alt="Balloon arch"
											className="h-full w-full object-cover transition-transform duration-500 hover:-translate-y-1"
										/>
									</div>
									<div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--sf-rose)] p-6 text-white shadow-lg">
										<Heart className="mb-2 h-8 w-8" />
										<span
											className="font-semibold"
											style={{ fontFamily: "'Varela Round', sans-serif" }}
										>
											Made with Love
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Values */}
			<section className="py-20">
				<div className="sf-container">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<h2
							className="text-3xl font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Why We Party Different
						</h2>
						<p className="mt-4 text-[var(--sf-text-muted)]">
							We take fun seriously. Here are the core values that guide every
							confetti cannon we launch.
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-8 transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-rose)]/10 text-[var(--sf-rose)] transition-transform group-hover:scale-110">
								<Leaf className="h-6 w-6" />
							</div>
							<h3
								className="mb-3 text-lg font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Eco-Conscious Fun
							</h3>
							<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
								We are committed to reducing plastic waste. 80% of our products
								are biodegradable or reusable, because the planet deserves a
								party too.
							</p>
						</div>

						<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-8 transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-orange)]/10 text-[var(--sf-orange)] transition-transform group-hover:scale-110">
								<Shield className="h-6 w-6" />
							</div>
							<h3
								className="mb-3 text-lg font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Curated Quality
							</h3>
							<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
								No flimsy forks here. We hand-pick and test every item to ensure
								it survives the cake cutting and the dance floor.
							</p>
						</div>

						<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-8 transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-110">
								<Smile className="h-6 w-6" />
							</div>
							<h3
								className="mb-3 text-lg font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Customer Joy
							</h3>
							<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
								Our happiness guarantee is simple: if it doesn't make you
								smile, we'll fix it. We are obsessed with your satisfaction.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="sf-container mb-20">
				<div className="relative overflow-hidden rounded-3xl bg-slate-900 p-12 text-center">
					<div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--sf-rose)] opacity-10 blur-3xl" />
					<div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-sky-500 opacity-10 blur-3xl" />

					<div className="relative z-10 mx-auto max-w-2xl">
						<h2
							className="text-3xl font-bold text-white"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Ready to plan your next event?
						</h2>
						<p className="mt-4 text-slate-300">
							Join thousands of happy party planners and discover the magic of
							stress-free celebrations.
						</p>
						<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Link
								to={"/store/products" as string}
								className="sf-btn-primary inline-flex items-center justify-center gap-2 !bg-white !text-slate-900 hover:!bg-slate-50"
							>
								Start Shopping
								<ArrowRight className="h-4 w-4" />
							</Link>
							<Link
								to="/store/contact"
								className="sf-btn-outline inline-flex items-center justify-center gap-2 !border-slate-700 !text-white hover:!bg-slate-800"
							>
								Contact Support
							</Link>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
