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
		<div className="blog-layout min-h-screen bg-oxford-blue-2 text-shadow-blue">
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
					? "py-2 bg-oxford-blue-2 shadow-[0_8px_20px_0_hsla(0,0%,0%,0.1)] border-b border-prussian-blue"
					: "py-6 bg-oxford-blue-2",
			)}
		>
			<div className="container flex items-center justify-between gap-4 mx-auto px-4 max-w-[1140px]">
				{/* Logo */}
				<Link to="/" className="flex-shrink-0">
					<span className="text-2xl font-bold text-alice-blue">
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
								"text-wild-blue-yonder font-medium transition-colors hover:text-carolina-blue",
								currentPath === link.href && "text-carolina-blue",
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
						className="text-wild-blue-yonder hover:text-carolina-blue transition-colors"
						aria-label="Search"
					>
						<Search className="h-5 w-5" />
					</button>

					{user ? (
						<>
							<Link
								to={ROUTES.EDITOR.NEW as string}
								className="navy-blue-blog-btn px-4 py-2 rounded-md text-sm flex items-center gap-2"
							>
								<PenLine className="w-4 h-4" />
								Write
							</Link>
							<DropdownMenu>
								<DropdownMenuTrigger {...{asChild: true} as any}>
									<button
										type="button"
										className="h-10 w-10 rounded-full overflow-hidden border-2 border-carolina-blue"
									>
										<Avatar className="h-10 w-10">
											<AvatarImage
												src={user.image ?? undefined}
												alt={`${user.name ?? "User"}'s avatar`}
											/>
											<AvatarFallback className="bg-prussian-blue text-alice-blue">
												{user.name?.charAt(0)?.toUpperCase() ?? "U"}
											</AvatarFallback>
										</Avatar>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56 bg-oxford-blue border-prussian-blue"
								>
									<div className="px-3 py-2 border-b border-prussian-blue">
										<p className="text-sm font-medium text-columbia-blue">
											{user.name}
										</p>
										<p className="text-xs text-slate-gray">{user.email}</p>
									</div>
									<DropdownMenuItem className="text-alice-blue hover:bg-prussian-blue cursor-pointer">
										<User className="mr-2 h-4 w-4" />
										Profile
									</DropdownMenuItem>
									<DropdownMenuItem {...{asChild: true} as any}>
										<Link
											to={ROUTES.ADMIN.BLOG.POSTS as string}
											className="flex items-center text-alice-blue cursor-pointer"
										>
											<FileText className="mr-2 h-4 w-4" />
											My Posts
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem {...{asChild: true} as any}>
										<Link
											to={ROUTES.ACCOUNT.BASE as string}
											className="flex items-center text-alice-blue cursor-pointer"
										>
											<Settings className="mr-2 h-4 w-4" />
											Settings
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator className="bg-prussian-blue" />
									<DropdownMenuItem {...{asChild: true} as any}>
										<Link
											to={ROUTES.LOGOUT}
											className="flex items-center text-alice-blue cursor-pointer"
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
					className="lg:hidden text-wild-blue-yonder"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					aria-label="Toggle menu"
				>
					{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
				</button>
			</div>

			{/* Mobile Sidebar */}
			<div
				className={cn(
					"lg:hidden fixed top-0 right-0 w-[300px] max-w-full h-screen bg-oxford-blue-2 z-50 p-8 overflow-y-auto transition-transform duration-500",
					mobileMenuOpen ? "translate-x-0" : "translate-x-full",
				)}
			>
				<div className="flex items-center justify-between mb-6 pb-4 border-b border-prussian-blue">
					<span className="text-xl font-bold text-alice-blue">
						Blog<span className="navy-blue-blog-gradient-text">CMS</span>
					</span>
					<button
						type="button"
						onClick={() => setMobileMenuOpen(false)}
						className="text-wild-blue-yonder"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<nav className="space-y-1 border-b border-prussian-blue pb-4 mb-4">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							to={link.href}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2.5 text-alice-blue font-medium hover:text-carolina-blue transition-colors"
						>
							{link.label}
						</Link>
					))}
				</nav>
				{user ? (
					<div className="space-y-2">
						<Link
							to={ROUTES.EDITOR.NEW as string}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-alice-blue hover:text-carolina-blue"
						>
							Write
						</Link>
						<Link
							to={ROUTES.ACCOUNT.BASE as string}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-alice-blue hover:text-carolina-blue"
						>
							Settings
						</Link>
						<Link
							to={ROUTES.LOGOUT}
							onClick={() => setMobileMenuOpen(false)}
							className="block py-2 text-alice-blue hover:text-carolina-blue"
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
		<footer className="bg-oxford-blue rounded-t-[48px] mx-5 mb-6 text-wild-blue-yonder">
			<div className="container py-16 mx-auto px-4 max-w-[1140px]">
				<div className="grid md:grid-cols-3 gap-10">
					{/* Brand */}
					<div>
						<Link to="/" className="inline-block mb-5">
							<span className="text-2xl font-bold text-alice-blue">
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
						<h3 className="text-columbia-blue text-lg mb-6">
							<span className="relative">
								Quick Links
								<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-carolina-blue" />
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
								{ label: "Become an Author", to: ROUTES.BLOG.AUTHOR_ONBOARDING },
							].map((link) => (
								<li key={link.label}>
									<Link
										to={link.to}
										className="text-sm hover:text-carolina-blue transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Newsletter */}
					<div>
						<h3 className="text-columbia-blue text-lg mb-6">
							<span className="relative">
								Newsletter
								<span className="absolute bottom-[-10px] left-0 w-24 h-[3px] bg-carolina-blue" />
							</span>
						</h3>
						<p className="text-sm mb-4 mt-8">Subscribe to get the latest articles.</p>
						<form onSubmit={handleNewsletterSubmit} className="relative">
							<input
								type="email"
								value={newsletterEmail}
								onChange={(e) => setNewsletterEmail(e.target.value)}
								placeholder="Your email address"
								className="w-full bg-transparent border-b border-wild-blue-yonder py-3 pr-8 text-sm outline-none focus:border-carolina-blue transition-colors text-alice-blue"
								disabled={subscribeNewsletter.isPending}
							/>
							<button type="submit" disabled={subscribeNewsletter.isPending} className="absolute right-0 top-1/2 -translate-y-1/2">
								<ChevronRight className="w-5 h-5" />
							</button>
						</form>
					</div>
				</div>
			</div>

			<div className="border-t border-prussian-blue py-8">
				<div className="container flex flex-col md:flex-row items-center justify-between gap-4 mx-auto px-4 max-w-[1140px]">
					<p className="text-sm text-center">
						Copyright 2026 ©{" "}
						<span className="text-carolina-blue italic">BlogCMS</span>. All rights reserved.
					</p>
					<div className="flex items-center gap-4">
						{["Twitter", "GitHub", "Discord"].map((social) => (
							<a
								key={social}
								href="#"
								className="text-sm hover:text-carolina-blue transition-colors"
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
				"fixed bottom-5 right-5 w-12 h-12 bg-prussian-blue text-white rounded-full border-2 border-carolina-blue grid place-items-center transition-all duration-300 z-50 hover:shadow-[0px_3px_20px_hsla(180,90%,43%,0.3)]",
				show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
			)}
			aria-label="Back to top"
		>
			<ArrowUp className="w-5 h-5" />
		</button>
	);
}
