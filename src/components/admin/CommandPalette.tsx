import { useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FilePlus, LayoutDashboard, PenLine, Settings, Users } from "lucide-react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { type AppRole, ROLE_HIERARCHY, ROLES, ROUTES } from "@/constants";
import { canAccessRoute, routeConfig } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/auth-client";
import { useSearch, useSearchStore } from "@/lib/store/search";

// Quick actions that aren't in routeConfig
const QUICK_ACTIONS = [
	{
		id: "new-post",
		label: "New Post",
		icon: PenLine,
		path: ROUTES.EDITOR.NEW,
		shortcut: "N",
		minRole: ROLES.USER as AppRole,
	},
	{
		id: "dashboard",
		label: "Dashboard",
		icon: LayoutDashboard,
		path: ROUTES.DASHBOARD,
		minRole: ROLES.USER as AppRole,
	},
	{
		id: "settings",
		label: "Account Settings",
		icon: Settings,
		path: ROUTES.ACCOUNT.BASE,
		minRole: ROLES.USER as AppRole,
	},
	{
		id: "admin-users",
		label: "Manage Users",
		icon: Users,
		path: ROUTES.ADMIN.USERS,
		minRole: ROLES.ADMIN as AppRole,
	},
	{
		id: "admin-posts",
		label: "All Posts (Admin)",
		icon: FilePlus,
		path: ROUTES.ADMIN.BLOG.POSTS,
		minRole: ROLES.ADMIN as AppRole,
	},
] as const;

function hasMinimumRole(userRole: AppRole, minRole: AppRole): boolean {
	return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

// Get nav routes filtered for this user's role
function getNavItems(role: AppRole) {
	return Object.entries(routeConfig)
		.filter(([path, cfg]) => {
			if (!cfg.showInNav) return false;
			return canAccessRoute(path, role);
		})
		.map(([path, cfg]) => ({ path, ...cfg }));
}

export function CommandPalette() {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const isOpen = useSearchStore((s) => s.open);
	const { setOpen, setQuery, addRecentSearch, query } = useSearch();

	const role = (session?.user?.role as AppRole) ?? ROLES.USER;

	// Cmd/Ctrl + K shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen(!isOpen);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [isOpen, setOpen]);

	const go = useCallback(
		(path: string, label?: string) => {
			if (label?.trim()) addRecentSearch(label);
			setOpen(false);
			navigate({ to: path as string });
		},
		[navigate, setOpen, addRecentSearch],
	);

	const navItems = getNavItems(role);
	const quickActions = QUICK_ACTIONS.filter((a) => hasMinimumRole(role, a.minRole));

	return (
		<CommandDialog open={isOpen} onOpenChange={setOpen} title="Command Palette" description="Navigate to any page or run a quick action">
			<CommandInput
				placeholder="Search pages and actions…"
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>

				{/* Quick Actions */}
				<CommandGroup heading="Quick Actions">
					{quickActions.map((action) => (
						<CommandItem
							key={action.id}
							value={action.label}
							onSelect={() => go(action.path, action.label)}
						>
							<action.icon />
							{action.label}
							{"shortcut" in action && action.shortcut && (
								<CommandShortcut>⌘{action.shortcut}</CommandShortcut>
							)}
						</CommandItem>
					))}
				</CommandGroup>

				<CommandSeparator />

				{/* Navigation */}
				<CommandGroup heading="Navigate">
					{navItems.map(({ path, title, icon: Icon, description }) => (
						<CommandItem
							key={path}
							value={`${title} ${description ?? ""} ${path}`}
							onSelect={() => go(path, title)}
						>
							{Icon ? <Icon /> : null}
							<span>{title}</span>
							{description && (
								<span className="text-muted-foreground text-xs ml-1 truncate max-w-52">
									— {description}
								</span>
							)}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
