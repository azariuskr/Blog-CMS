import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/auth/auth-client";
import { useState, useEffect } from "react";
import {
	Menu,
	X,
	Search,
	ArrowUp,
	ChevronRight,
	User,
	FileText,
	Settings,
	LogOut,
	PenLine,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useSubscribeNewsletter } from "@/lib/blog/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/(blog)")({
	component: BlogLayout,
});

const navLinks = [
	{ href: "/", label: "Home" },
	{ href: "/topics", label: "Topics" },
	{ href: "/authors", label: "Authors" },
	{ href: "/about", label: "About" },
];

function BlogLayout() {
	return (
		<div className="blog-layout min-h-screen bg-[hsl(222,47%,11%)] text-[hsl(217,24%,59%)]">
			<BlogHeader />
			<main>
				<Outlet />
			</main>
			<BlogFooter />
			<BackToTopButton />
		</div>
	);
}

function BlogHeader() {
	const { data: session } = useSession();
	const user = session?.user;
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [headerActive, setHeaderActive] = useState(false);

	useEffect(() => {
		const handleScroll = () => setHeaderActive(window.scrollY > 100);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={cn(
				"fixed top-0 left-0 w-full z-50 transition-all duration-500",
				headerActive
					? "py-2 bg-[hsl(222,47%,11%)] shadow-[0_8px_20px_0_hsla(0,0%,0%,0.1)] border-b border-[hsl(216,33%,20%)]"
					: "py-6 bg-[hsl(222,47%,11%)]",
			)}
		>
			<div className="container flex items-center justify-between gap-4 mx-auto px-4 max-w-[1140px]">
				{/* Logo */}
				<Link to="/" className="flex-shrink-0">
					<span className="text-2xl font-bold text-[hsl(216,100%,95%)]">
						Blog<span className="navy-blue-blog-gradient-text">CMS</span>
					</span>
				</Link>

				{/* Desktop Nav */}
				<nav className="hidden lg:flex items-center gap-10 mx-auto">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							to={link.href}
							className={cn(
								"text-[hsl(216,33%,68%)] font-medium transition-colors hover:text-[hsl(199,89%,49%)]",
								currentPath === link.href && "text-[hsl(199,89%,49%)]",
							)}
						>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Desktop Actions */}
				<div className="hidden sm:flex items-center gap-4">
					<button
						type="button"
						className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
						aria-label="Search"
					>
						<Search className="h-5 w-5" />
					</button>

					{user ? (
						<>
							<Link
								to={ROUTES.EDITOR.NEW}
								className="navy-blue-blog-btn px-4 py-2 rounded-md text-sm flex items-center gap-2"
							>
								<PenLine className="w-4 h-4" />
								Write
							</Link>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="h-10 w-10 rounded-full overflow-hidden border-2 border-[hsl(199,89%,49%)]"
									>
										<Avatar className="h-10 w-10">
											<AvatarImage
												src={user.image ?? undefined}
												alt={`${user.name ?? "User"}'s avatar`}
											/>
											<AvatarFallback className="bg-[hsl(216,33%,20%)] text-[hsl(216,100%,95%)]">
												{user.name?.charAt(0)?.toUpperCase() ?? "U"}
											</AvatarFallback>
										</Avatar>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56 bg-[hsl(222,44%,13%)] border-[hsl(216,33%,20%)]"
								>
									<div className="px-3 py-2 border-b border-[hsl(216,33%,20%)]">
										<p className="text-sm font-medium text-[hsl(199,69%,84%)]">
											{user.name}
										</p>
										<p className="text-xs text-[hsl(217,17%,48%)]">{user.email}</p>
									</div>
									<DropdownMenuItem className="text-[hsl(216,100%,95%)] hover:bg-[hsl(216,33%,20%)] cursor-pointer">
										<User className="mr-2 h-4 w-4" />
										Profile
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link
											to={ROUTES.ADMIN.BLOG.POSTS}
											className="flex items-center text-[hsl(216,100%,95%)] cursor-pointer"
										>
											<FileText className="mr-2 h-4 w-4" />
											My Posts
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link
											to={ROUTES.ACCOUNT.BASE}
											className="flex items-center text-[hsl(216,100%,95%)] cursor-pointer"
										>
											<Settings className="mr-2 h-4 w-4" />
											Settings
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator className="bg-[hsl(216,33%,20%)]" />
									<DropdownMenuItem asChild>
										<Link
											to={ROUTES.LOGOUT}
											className="flex items-center text-[hsl(216,100%,95%)] cursor-pointer"
										>
											<LogOut className="mr-2 h-4 w-4" />
											Sign Out
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					) : (
						<Link to={ROUTES.LOGIN} className="navy-blue-blog-btn px-4 py-2 rounded-md text-sm">
							Get Started
						</Link>
					)}
				</div>

				{/* Mobile Menu Toggle */}
				<button
					type="button"
					className="lg:hidden text-[hsl(216,33%,68%)]"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					aria-label="Toggle menu"
				>
					{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
				</button>
			</div>

			{/* Mobile Sidebar */}
			<div
				className={cn(
					"lg:hidden fixed top-0 right-0 w-[300px] max-w-full h-screen bg-[hsl(222,47%,11%)] z-50 p-8 overflow-y-auto transition-transform duration-500",
					mobileMenuOpen ? "translate-x-0" : "translate-x-full",
				)}
			>
				<div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(216,33%,20%)]">
					<span className="text-xl font-bold text-[hsl(216,100%,95%)]">
						Blog<span className="navy-blue-blog-gradient-text">CMS</span>
					</span>
					<button
						type="button"
						onClick={() => setMobileMenuOpen(false)}
						className="text-[hsl(216,33%,68%)]"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<nav className="space-y-1 border-b border-[hsl(216,33%,20%)] pb-4 mb-4">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							to={link.href}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2.5 text-[hsl(216,100%,95%)] font-medium hover:text-[hsl(199,89%,49%)] transition-colors"
						>
							{link.label}
						</Link>
					))}
				</nav>
				{user ? (
					<div className="space-y-2">
						<Link
							to={ROUTES.EDITOR.NEW}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-[hsl(216,100%,95%)] hover:text-[hsl(199,89%,49%)]"
						>
							Write
						</Link>
						<Link
							to={ROUTES.ACCOUNT.BASE}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-[hsl(216,100%,95%)] hover:text-[hsl(199,89%,49%)]"
						>
							Settings
						</Link>
						<Link
							to={ROUTES.LOGOUT}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-[hsl(216,100%,95%)] hover:text-[hsl(199,89%,49%)]"
						>
							Sign Out
						</Link>
					</div>
				) : (
					<Link
						to={ROUTES.LOGIN}
						onClick={() => setMobileMenuOpen(false)}
						className="navy-blue-blog-btn block py-2.5 px-4 rounded-md text-sm text-center"
					>
						Get Started
					</Link>
				)}
			</div>

			{mobileMenuOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black/50 z-40"
					onClick={() => setMobileMenuOpen(false)}
					onKeyDown={(e) => e.key === "Escape" && setMobileMenuOpen(false)}
				/>
			)}
		</header>
	);
}

function BlogFooter() {
	const subscribeNewsletter = useSubscribeNewsletter();
	const [newsletterEmail, setNewsletterEmail] = useState("");

	const handleNewsletterSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newsletterEmail.trim()) return;
		const result = await subscribeNewsletter.mutateAsync({ email: newsletterEmail.trim() });
		if (result?.ok) {
			const d = result.data as any;
			if (d?.alreadySubscribed) {
				toast.info("You're already subscribed!");
			} else {
				toast.success("Subscribed! Check your inbox.");
			}
			setNewsletterEmail("");
		} else {
			toast.error("Failed to subscribe. Please try again.");
		}
	};

	return (
		<footer className="bg-[hsl(222,44%,13%)] rounded-t-[48px] mx-5 mb-6 text-[hsl(216,33%,68%)]">
			<div className="container py-16 mx-auto px-4 max-w-[1140px]">
				<div className="grid md:grid-cols-3 gap-10">
					{/* Brand */}
					<div>
						<Link to="/" className="inline-block mb-5">
							<span className="text-2xl font-bold text-[hsl(216,100%,95%)]">
								Blog<span className="navy-blue-blog-gradient-text">CMS</span>
							</span>
						</Link>
						<p className="text-sm mb-5 leading-relaxed">
							A modern publishing platform for creators. Write, share, and connect with a
							community of passionate readers.
						</p>
					</div>

					{/* Quick Links */}
					<div>
						<h3 className="text-[hsl(199,69%,84%)] text-lg mb-6">
							<span className="relative">
								Quick Links
								<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-[hsl(199,89%,49%)]" />
							</span>
						</h3>
						<ul className="grid grid-cols-2 gap-3 mt-8">
							{[
								{ label: "Home", to: "/" },
								{ label: "Topics", to: "/topics" },
								{ label: "Authors", to: "/authors" },
								{ label: "About", to: "/about" },
								{ label: "Write", to: ROUTES.EDITOR.NEW },
								{ label: "Sign In", to: ROUTES.LOGIN },
							].map((link) => (
								<li key={link.label}>
									<Link
										to={link.to}
										className="text-sm hover:text-[hsl(199,89%,49%)] transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Newsletter */}
					<div>
						<h3 className="text-[hsl(199,69%,84%)] text-lg mb-6">
							<span className="relative">
								Newsletter
								<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-[hsl(199,89%,49%)]" />
							</span>
						</h3>
						<p className="text-sm mb-4 mt-8">Subscribe to get the latest articles.</p>
						<form onSubmit={handleNewsletterSubmit} className="relative">
							<input
								type="email"
								value={newsletterEmail}
								onChange={(e) => setNewsletterEmail(e.target.value)}
								placeholder="Your email address"
								className="w-full bg-transparent border-b border-[hsl(216,33%,68%)] py-3 pr-8 text-sm outline-none focus:border-[hsl(199,89%,49%)] transition-colors text-[hsl(216,100%,95%)]"
								disabled={subscribeNewsletter.isPending}
							/>
							<button type="submit" disabled={subscribeNewsletter.isPending} className="absolute right-0 top-1/2 -translate-y-1/2">
								<ChevronRight className="w-5 h-5" />
							</button>
						</form>
					</div>
				</div>
			</div>

			<div className="border-t border-[hsl(216,33%,20%)] py-8">
				<div className="container flex flex-col md:flex-row items-center justify-between gap-4 mx-auto px-4 max-w-[1140px]">
					<p className="text-sm text-center">
						Copyright 2026 ©{" "}
						<span className="text-[hsl(199,89%,49%)] italic">BlogCMS</span>. All rights reserved.
					</p>
					<div className="flex items-center gap-4">
						{["Twitter", "GitHub", "Discord"].map((social) => (
							<a
								key={social}
								href="#"
								className="text-sm hover:text-[hsl(199,89%,49%)] transition-colors"
							>
								{social}
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
}

function BackToTopButton() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const handleScroll = () => setShow(window.scrollY > 300);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<button
			type="button"
			onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
			className={cn(
				"fixed bottom-5 right-5 w-12 h-12 bg-[hsl(216,33%,20%)] text-white rounded-full border-2 border-[hsl(199,89%,49%)] grid place-items-center transition-all duration-300 z-50 hover:shadow-[0px_3px_20px_hsla(180,90%,43%,0.3)]",
				show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
			)}
			aria-label="Back to top"
		>
			<ArrowUp className="w-5 h-5" />
		</button>
	);
}
