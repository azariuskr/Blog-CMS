import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/hooks/auth-hooks";
import { useCart, useWishlist } from "@/lib/ecommerce/queries";

export function StorefrontNav() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();
	const { data: session } = useSession();
	const { data: cartData } = useCart();
	const { data: wishlistData } = useWishlist();
	const cartCount = cartData?.ok ? cartData.data?.itemCount ?? 0 : 0;
	const wishlistCount = wishlistData?.ok ? wishlistData.data?.productIds?.length ?? 0 : 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate({ to: "/store/search", search: { q: searchQuery.trim() } as any });
			setSearchOpen(false);
			setSearchQuery("");
		}
	};

	return (
		<nav className="sticky top-0 z-50 border-b border-[var(--sf-border)] bg-[var(--sf-surface)]/95 backdrop-blur-md">
			<div className="sf-container">
				<div className="flex h-16 items-center justify-between gap-4">
					{/* Logo */}
					<Link
						to="/store"
						className="flex items-center gap-2 text-xl font-bold text-[var(--sf-rose)]"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						<ShoppingBag className="h-6 w-6" />
						<span>PartyPop</span>
					</Link>

					{/* Desktop Nav Links */}
					<div className="hidden items-center gap-8 md:flex">
						<Link
							to="/store"
							className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
						>
							Home
						</Link>
						<Link
							to={"/store/products" as string}
							className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
						>
							Shop
						</Link>
						<Link
							to="/store/about"
							className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
						>
							About
						</Link>
						<Link
							to="/store/faq"
							className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
						>
							FAQ
						</Link>
						<Link
							to="/store/contact"
							className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
						>
							Contact
						</Link>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-3">
						{/* Search */}
						<button
							onClick={() => setSearchOpen(!searchOpen)}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<Search className="h-5 w-5" />
						</button>

						{/* User */}
						<Link
							to={(session?.user ? "/store/account" : "/auth/login") as string}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<User className="h-5 w-5" />
						</Link>

						{/* Wishlist */}
						<Link
							to="/store/wishlist"
							className="relative hidden rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-rose)] sm:block"
						>
							<Heart className="h-5 w-5" />
							{wishlistCount > 0 && (
								<span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sf-rose)] text-[10px] font-bold text-white">
									{wishlistCount > 99 ? "99+" : wishlistCount}
								</span>
							)}
						</Link>

						{/* Cart */}
						<Link
							to="/store/cart"
							className="relative rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<ShoppingBag className="h-5 w-5" />
							{cartCount > 0 && (
								<span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sf-rose)] text-[10px] font-bold text-white">
									{cartCount > 99 ? "99+" : cartCount}
								</span>
							)}
						</Link>

						{/* Mobile menu toggle */}
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] md:hidden"
						>
							{mobileMenuOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>

				{/* Search bar (expandable) */}
				{searchOpen && (
					<div className="border-t border-[var(--sf-border-light)] py-3">
						<form onSubmit={handleSearch} className="relative">
							<Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sf-text-light)]" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search for products..."
								autoFocus
								className="w-full rounded-full border border-[var(--sf-border)] bg-[var(--sf-bg)] py-2.5 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-[var(--sf-text-light)] focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</form>
					</div>
				)}

				{/* Mobile menu */}
				{mobileMenuOpen && (
					<div className="border-t border-[var(--sf-border-light)] py-4 md:hidden">
						<div className="flex flex-col gap-3">
							<Link
								to="/store"
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
							>
								Home
							</Link>
							<Link
								to={"/store/products" as string}
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
							>
								Shop
							</Link>
							<Link
								to="/store/about"
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
							>
								About
							</Link>
							<Link
								to="/store/faq"
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
							>
								FAQ
							</Link>
							<Link
								to="/store/contact"
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
							>
								Contact
							</Link>
						</div>
					</div>
				)}
			</div>
		</nav>
	);
}
