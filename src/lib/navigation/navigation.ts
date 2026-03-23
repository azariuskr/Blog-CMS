import type { LucideIcon } from "lucide-react";
import { ROUTES } from "@/constants";
import {
	type AppRole,
	canAccessRoute,
	routeConfig,
} from "@/lib/auth/permissions";

export interface NavItem {
	type: "link";
	title: string;
	path: string;
	icon?: LucideIcon;
	badge?: string;
}

export interface NavCollapsible {
	type: "collapsible";
	title: string;
	icon?: LucideIcon;
	items: NavItem[];
}

export type NavEntry = NavItem | NavCollapsible;

export interface NavSection {
	title: string;
	items: NavEntry[];
}

export interface Breadcrumb {
	label: string;
	path: string;
}

interface NavStructureItem {
	section: string;
	routes?: string[];
	collapsible?: {
		title: string;
		icon?: LucideIcon;
		routes: string[];
	}[];
}

const NAV_STRUCTURE: NavStructureItem[] = [
	{
		section: "General",
		routes: [ROUTES.DASHBOARD],
	},
	{
		section: "Content",
		routes: [
			ROUTES.ADMIN.BLOG.POSTS,
			ROUTES.ADMIN.BLOG.CATEGORIES,
			ROUTES.ADMIN.BLOG.TAGS,
			ROUTES.ADMIN.BLOG.COMMENTS,
			ROUTES.ADMIN.BLOG.NEWSLETTER,
		],
	},
	{
		section: "People",
		routes: [ROUTES.ADMIN.USERS],
	},
	{
		section: "Media",
		routes: [ROUTES.ADMIN.STORAGE],
	},
	{
		section: "Settings",
		routes: [
			ROUTES.ADMIN.BLOG.SITES,
			ROUTES.ADMIN.API.BASE,
			ROUTES.ADMIN.ORGANIZATIONS,
		],
	},
];

function routeToNavItem(route: string): NavItem | null {
	const config = routeConfig[route];
	if (!config?.showInNav) return null;
	return {
		type: "link",
		title: config.title,
		path: route,
		icon: config.icon,
	};
}

export function buildNavigation(userRole?: AppRole): NavSection[] {
	const sections: NavSection[] = [];

	for (const { section, routes = [], collapsible = [] } of NAV_STRUCTURE) {
		const items: NavEntry[] = [];

		for (const route of routes) {
			if (!canAccessRoute(route, userRole)) continue;
			const item = routeToNavItem(route);
			if (item) items.push(item);
		}

		for (const group of collapsible) {
			const subItems: NavItem[] = [];
			for (const route of group.routes) {
				if (!canAccessRoute(route, userRole)) continue;
				const item = routeToNavItem(route);
				if (item) subItems.push(item);
			}
			if (subItems.length > 0) {
				const baseConfig = routeConfig[group.routes[0]];
				items.push({
					type: "collapsible",
					title: group.title,
					icon: group.icon ?? baseConfig?.icon,
					items: subItems,
				});
			}
		}

		if (items.length > 0) {
			sections.push({ title: section, items });
		}
	}

	return sections;
}

export function generateBreadcrumbs(currentPath: string): Breadcrumb[] {
	const cleanPath = currentPath.split("?")[0].split("#")[0];
	const segments = cleanPath.split("/").filter(Boolean);
	const breadcrumbs: Breadcrumb[] = [];

	let accumulated = "";
	for (const segment of segments) {
		accumulated += `/${segment}`;
		const config = routeConfig[accumulated];
		breadcrumbs.push({
			label: config?.title ?? formatSegment(segment),
			path: accumulated,
		});
	}

	return breadcrumbs;
}

function formatSegment(segment: string): string {
	return segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isRouteActive(
	currentPath: string,
	itemPath: string,
	checkChildren = false,
): boolean {
	if (currentPath === itemPath) return true;

	if (currentPath.split("?")[0] === itemPath) return true;

	if (checkChildren) {
		const currentSegments = currentPath.split("/").filter(Boolean);
		const itemSegments = itemPath.split("/").filter(Boolean);

		if (currentSegments[0] && itemSegments[0]) {
			return currentSegments[0] === itemSegments[0];
		}
	}

	return false;
}
export function getActiveSection(
	currentPath: string,
	sections: NavSection[],
): string | null {
	for (const section of sections) {
		for (const item of section.items) {
			if (item.type === "link" && isRouteActive(currentPath, item.path)) {
				return section.title;
			}
			if (item.type === "collapsible") {
				for (const subItem of item.items) {
					if (isRouteActive(currentPath, subItem.path)) {
						return section.title;
					}
				}
			}
		}
	}
	return null;
}

export function buildRouteTitleMap(): Map<string, string> {
	const map = new Map<string, string>();
	for (const [route, config] of Object.entries(routeConfig)) {
		map.set(route, config.title);
	}
	return map;
}
