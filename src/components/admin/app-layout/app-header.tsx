import { UserButton } from "@daveyplate/better-auth-ui";
import { LayoutDashboard, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { useSearch } from "@/lib/store/search";

interface AppHeaderProps {
	children?: React.ReactNode; // optional "center" slot
	fixed?: boolean;
	className?: string;
	center?: boolean; // whether to truly center children
}

export function AppHeader({
	children,
	fixed = true,
	className,
	center = true,
}: AppHeaderProps) {
	const [isScrolled, setIsScrolled] = useState(false);
	const rafIdRef = useRef<number | null>(null);
	const latestScrollTopRef = useRef(0);
	const { open: searchOpen, setOpen: setSearchOpen } = useSearch();

	useEffect(() => {
		if (!fixed) return;

		const update = () => {
			rafIdRef.current = null;
			const next = latestScrollTopRef.current > 10;
			setIsScrolled((prev) => (prev === next ? prev : next));
		};

		const onScroll = () => {
			latestScrollTopRef.current =
				window.scrollY ||
				document.documentElement.scrollTop ||
				document.body.scrollTop ||
				0;

			if (rafIdRef.current != null) return;
			rafIdRef.current = window.requestAnimationFrame(update);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (rafIdRef.current != null) {
				window.cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
		};
	}, [fixed]);

	return (
		<header
			className={cn(
				"z-50 h-16 border-b",
				fixed && "sticky top-0 w-full",
				isScrolled && fixed && "shadow-sm bg-background/95",
				className,
			)}
		>
			<div className="relative flex h-full items-center gap-2 px-4">
				{/* LEFT */}
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AppBreadcrumbs />
				</div>

				{/* CENTER (children) */}
				{children ? (
					center ? (
						<div className="absolute left-1/2 -translate-x-1/2">
							<div className="flex items-center gap-2">{children}</div>
						</div>
					) : (
						<div className="flex items-center gap-2">{children}</div>
					)
				) : null}

				{/* RIGHT */}
				<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setSearchOpen(!searchOpen)}
						className="hidden md:flex items-center gap-2 text-muted-foreground h-8 px-3 text-xs"
					>
						<Search className="h-3.5 w-3.5" />
						<span>Search…</span>
						<kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
							⌘K
						</kbd>
					</Button>
					<ThemeToggle />
					<UserButton
						size="icon"
						additionalLinks={[
							{
								href: "/dashboard",
								label: "Dashboard",
								icon: <LayoutDashboard size={16} />,
							},
						]}
					/>
				</div>
			</div>
		</header>
	);
}
