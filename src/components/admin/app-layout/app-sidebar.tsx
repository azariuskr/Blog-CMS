import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import * as React from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useRole } from "@/hooks/auth-hooks";
import {
	buildNavigation,
	isRouteActive,
	type NavEntry,
	type NavSection,
} from "@/lib/navigation/navigation";
import { useLayout } from "@/lib/store/layout";
import { AppSidebarUser } from "./app-sidebar-user";
import { OrganizationSwitcher } from "@daveyplate/better-auth-ui";

function useMounted() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	return mounted;
}

export function AppSidebar() {
	const role = useRole();
	const location = useLocation();
	const currentPath = location.pathname;
	const mounted = useMounted();
	const layout = useLayout();
	// Wait for client-side hydration before building navigation
	// This ensures consistent rendering between server and client
	const navSections = mounted ? buildNavigation(role ?? undefined) : [];

	const variant = mounted ? layout.variant : "inset";
	const collapsible = mounted ? layout.collapsible : "icon";

	return (
		<Sidebar variant={variant} collapsible={collapsible}>
			<SidebarHeader>
				<OrganizationSwitcher />
			</SidebarHeader>

			<SidebarContent>
				{mounted &&
					navSections.map((section) => (
						<NavSectionGroup
							key={section.title}
							section={section}
							currentPath={currentPath}
						/>
					))}
			</SidebarContent>

			<SidebarFooter>
				<AppSidebarUser />
			</SidebarFooter>
		</Sidebar>
	);
}

interface NavSectionGroupProps {
	section: NavSection;
	currentPath: string;
}

function NavSectionGroup({ section, currentPath }: NavSectionGroupProps) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>{section.title}</SidebarGroupLabel>
			<SidebarMenu>
				{section.items.map((item) => (
					<NavEntryItem
						key={getItemKey(item)}
						item={item}
						currentPath={currentPath}
					/>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

interface NavEntryItemProps {
	item: NavEntry;
	currentPath: string;
}

function NavEntryItem({ item, currentPath }: NavEntryItemProps) {
	if (item.type === "link") {
		const isActive = isRouteActive(currentPath, item.path);
		const Icon = item.icon;

		return (
			<SidebarMenuItem>
				<Link to={item.path as string}>
					<SidebarMenuButton isActive={isActive} tooltip={item.title}>
						{Icon && <Icon className="size-4" />}
						<span>{item.title}</span>
					</SidebarMenuButton>
				</Link>
			</SidebarMenuItem>
		);
	}

	if (item.type === "collapsible") {
		return <CollapsibleNavItem item={item} currentPath={currentPath} />;
	}

	return null;
}

interface CollapsibleNavItemProps {
	item: Extract<NavEntry, { type: "collapsible" }>;
	currentPath: string;
}

function CollapsibleNavItem({ item, currentPath }: CollapsibleNavItemProps) {
	const hasActiveChild = item.items.some((subItem) =>
		isRouteActive(currentPath, subItem.path),
	);
	const Icon = item.icon;
	const [open, setOpen] = React.useState(hasActiveChild);

	React.useEffect(() => {
		setOpen(hasActiveChild);
	}, [hasActiveChild]);

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className="group/collapsible"
		>
			<SidebarMenuItem>
				<CollapsibleTrigger
					render={
						<SidebarMenuButton tooltip={item.title}>
							{Icon && <Icon className="size-4" />}
							<span>{item.title}</span>
							<ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					}
				></CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{item.items.map((subItem) => {
							const isActive = isRouteActive(currentPath, subItem.path);
							return (
								<SidebarMenuSubItem key={subItem.path}>
									<SidebarMenuSubButton
										isActive={isActive}
										render={<Link to={subItem.path as string} />}
									>
										<span>{subItem.title}</span>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}

function getItemKey(item: NavEntry): string {
	if (item.type === "link") return item.path;
	return `collapsible-${item.title}`;
}
