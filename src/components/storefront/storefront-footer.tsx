import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export function StorefrontFooter() {
	return (
		<footer className="border-t border-[var(--sf-border)] bg-[var(--sf-surface)]">
			<div className="sf-container py-12">
				<div className="grid gap-8 md:grid-cols-4">
					{/* Brand */}
					<div className="space-y-4">
						<Link
							to="/store"
							className="flex items-center gap-2 text-lg font-bold text-[var(--sf-rose)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							<ShoppingBag className="h-5 w-5" />
							PartyPop
						</Link>
						<p className="text-sm text-[var(--sf-text-muted)]">
							Making every celebration unforgettable with premium party supplies and decorations.
						</p>
					</div>

					{/* Shop */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Shop
						</h4>
						<div className="flex flex-col gap-2">
							<Link to={"/store/products" as string} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								All Products
							</Link>
							<Link to={"/store/products" as string} search={{ sort: "createdAt:desc" } as any} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								New Arrivals
							</Link>
							<Link to={"/store/products" as string} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								Sale
							</Link>
						</div>
					</div>

					{/* Support */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Support
						</h4>
						<div className="flex flex-col gap-2">
							<Link to="/store/faq" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								FAQ
							</Link>
							<Link to="/store/contact" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								Contact Us
							</Link>
							<Link to="/store/faq" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								Shipping & Returns
							</Link>
						</div>
					</div>

					{/* Company */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Company
						</h4>
						<div className="flex flex-col gap-2">
							<Link to="/store/about" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								About Us
							</Link>
							<Link to="/privacy" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								Privacy Policy
							</Link>
							<Link to="/terms" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								Terms of Service
							</Link>
						</div>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="mt-10 border-t border-[var(--sf-border-light)] pt-6">
					<p className="text-center text-xs text-[var(--sf-text-light)]">
						&copy; {new Date().getFullYear()} PartyPop. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
