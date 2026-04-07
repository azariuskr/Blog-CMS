import { createAccessControl } from "better-auth/plugins/access";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	BookMarked,
	Bot,
	Building2,
	CalendarDays,
	CreditCard,
	FileText,
	FolderOpen,
	Globe,
	HardDrive,
	Home,
	Images,
	MessageCircle,
	PenLine,
	LayoutDashboard,
	Lock,
	Route,
	Shield,
	User,
	UserCog,
	Users,
	Wallet,
	Mail,
} from "lucide-react";
import { type AppRole, ROLE_HIERARCHY, ROLES, ROUTES } from "@/constants";

export type { AppRole } from "@/constants";

export const statements = {
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	admin: ["access"],
	users: [
		"read",
		"write",
		"delete",
		"ban",
		"create",
		"list",
		"set-role",
		"impersonate",
		"set-password",
		"get",
		"update",
	],
	rbac: ["read", "write"],
	roles: ["read", "write"],
	permissions: ["read", "write"],
	routes: ["read", "write"],
	settings: ["read", "write"],
	billing: ["read", "write"],
	organization: ["read", "write"],
	// Blog permissions
	posts: ["create", "read", "update", "delete", "publish", "feature"],
	comments_mod: ["read", "approve", "delete"],
	// Content permissions (used by blog server functions for admin CRUD)
	content: ["read", "write", "delete"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
	user: ac.newRole({
		user: ["get", "update"],
		session: ["list", "revoke"],
		// Regular users can create and edit their own posts
		posts: ["create", "read", "update"],
		content: ["read"],
	}),
	author: ac.newRole({
		user: ["get", "update"],
		session: ["list", "revoke"],
		admin: ["access"],
		// Authors can create, read, update, and publish their own posts
		posts: ["create", "read", "update", "publish"],
		content: ["read", "write"],
	}),
	moderator: ac.newRole({
		user: ["get", "update"],
		session: ["list", "revoke"],
		users: ["read", "ban"],
		settings: ["read"],
		// Moderators can manage comments and approve posts
		posts: ["create", "read", "update", "delete"],
		comments_mod: ["read", "approve", "delete"],
		content: ["read", "write"],
	}),
	admin: ac.newRole({
		user: ["create", "list", "get", "update", "ban", "set-role"],
		session: ["list", "revoke", "delete"],
		admin: ["access"],
		users: [
			"read",
			"write",
			"ban",
			"create",
			"list",
			"set-role",
			"get",
			"update",
		],
		settings: ["read", "write"],
		billing: ["read"],
		organization: ["read"],
		// Admins have full blog control except feature
		posts: ["create", "read", "update", "delete", "publish"],
		comments_mod: ["read", "approve", "delete"],
		content: ["read", "write", "delete"],
	}),
	superAdmin: ac.newRole({
		user: [
			"create",
			"list",
			"set-role",
			"ban",
			"impersonate",
			"delete",
			"set-password",
			"get",
			"update",
		],
		session: ["list", "revoke", "delete"],
		admin: ["access"],
		users: [
			"read",
			"write",
			"delete",
			"ban",
			"create",
			"list",
			"set-role",
			"impersonate",
			"set-password",
			"get",
			"update",
		],
		settings: ["read", "write"],
		billing: ["read", "write"],
		rbac: ["read", "write"],
		roles: ["read", "write"],
		permissions: ["read", "write"],
		routes: ["read", "write"],
		organization: ["read", "write"],
		// SuperAdmins have full blog control including feature
		posts: ["create", "read", "update", "delete", "publish", "feature"],
		comments_mod: ["read", "approve", "delete"],
		content: ["read", "write", "delete"],
	}),
} as const;

export type AppPermissions = typeof statements;

export const ROLE_GRANTS = {
	[ROLES.USER]: {
		user: ["get", "update"],
		session: ["list", "revoke"],
		// Note: users:read removed - regular users should not access admin user lists
	},
	[ROLES.AUTHOR]: {
		user: ["get", "update"],
		session: ["list", "revoke"],
		admin: ["access"],
		posts: ["create", "read", "update", "publish"],
		content: ["read", "write"],
	},
	[ROLES.MODERATOR]: {
		user: ["get", "update"],
		session: ["list", "revoke"],
		users: ["read", "ban"],
		settings: ["read"],
	},
	[ROLES.ADMIN]: {
		user: ["create", "list", "get", "update", "ban", "set-role"],
		session: ["list", "revoke", "delete"],
		admin: ["access"],
		users: [
			"read",
			"write",
			"ban",
			"create",
			"list",
			"set-role",
			"get",
			"update",
		],
		settings: ["read", "write"],
		billing: ["read"],
		organization: ["read"],
		posts: ["create", "read", "update", "delete", "publish"],
		comments_mod: ["read", "approve", "delete"],
		content: ["read", "write", "delete"],
	},
	[ROLES.SUPER_ADMIN]: {
		user: [
			"create",
			"list",
			"set-role",
			"ban",
			"impersonate",
			"delete",
			"set-password",
			"get",
			"update",
		],
		session: ["list", "revoke", "delete"],
		admin: ["access"],
		users: [
			"read",
			"write",
			"delete",
			"ban",
			"create",
			"list",
			"set-role",
			"impersonate",
			"set-password",
			"get",
			"update",
		],
		settings: ["read", "write"],
		billing: ["read", "write"],
		rbac: ["read", "write"],
		roles: ["read", "write"],
		permissions: ["read", "write"],
		routes: ["read", "write"],
		organization: ["read", "write"],
		posts: ["create", "read", "update", "delete", "publish", "feature"],
		comments_mod: ["read", "approve", "delete"],
		content: ["read", "write", "delete"],
	},
} as const satisfies Record<AppRole, Record<string, readonly string[]>>;

export interface RouteConfig {
	title: string;
	description?: string;
	icon?: LucideIcon;
	permissions?: Record<string, string[]>;
	minRole?: AppRole;
	maxRole?: AppRole;
	noIndex?: boolean;
	showInNav?: boolean;
	parent?: string;
	keywords?: string[];
}

export const routeConfig: Record<string, RouteConfig> = {
	[ROUTES.HOME]: {
		title: "Home",
		icon: Home,
		description: "Welcome to our platform - the best solution for your needs",
		showInNav: true,
		keywords: ["platform", "solution"],
	},
	[ROUTES.LOGIN]: {
		title: "Log In",
		description: "Log in to your account to access your dashboard and features",
		noIndex: true,
	},
	[ROUTES.SIGNUP]: {
		title: "Sign Up",
		description: "Create a new account and start using our platform today",
		noIndex: true,
	},
	[ROUTES.DASHBOARD]: {
		title: "Dashboard",
		icon: LayoutDashboard,
		description: "Your personal dashboard with all your important information",
		noIndex: true,
		showInNav: true,
	},

	// Account
	[ROUTES.ACCOUNT.BASE]: {
		title: "Account",
		description: "Manage your account settings",
		noIndex: true,
	},
	[ROUTES.ACCOUNT.PROFILE]: {
		title: "Profile",
		icon: User,
		description: "View and edit your profile information",
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ACCOUNT.BASE,
	},
	[ROUTES.ACCOUNT.SECURITY]: {
		title: "Security",
		icon: Lock,
		description: "Manage your security settings and preferences",
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ACCOUNT.BASE,
	},
	[ROUTES.ACCOUNT.ORGANIZATIONS]: {
		title: "Organizations",
		icon: Building2,
		description: "Manage your organizations",
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ACCOUNT.BASE,
	},

	// User Billing
	[ROUTES.BILLING.BASE]: {
		title: "Billing",
		icon: Wallet,
		description: "Manage your subscription and billing",
		noIndex: true,
		showInNav: true,
	},

	// Admin
	[ROUTES.ADMIN.BASE]: {
		title: "Admin",
		icon: LayoutDashboard,
		description: "Administration dashboard",
		permissions: { admin: ["access"] },
		noIndex: true,
		showInNav: true,
	},
	[ROUTES.ADMIN.USERS]: {
		title: "Users",
		icon: Users,
		description: "Manage users and their permissions",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.ORGANIZATIONS]: {
		title: "Organizations",
		icon: Building2,
		description: "Manage organizations",
		permissions: { organization: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.BILLING]: {
		title: "Billing",
		icon: CreditCard,
		description: "Manage billing and subscriptions",
		permissions: { billing: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.BILLING_SUBSCRIPTIONS]: {
		title: "Subscriptions",
		icon: CreditCard,
		description: "View and manage subscriptions",
		permissions: { billing: ["read"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BILLING,
	},
	[ROUTES.ADMIN.BILLING_CUSTOMERS]: {
		title: "Customers",
		icon: Users,
		description: "View billing customers",
		permissions: { billing: ["read"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BILLING,
	},
	[ROUTES.ADMIN.BILLING_CREDITS]: {
		title: "Credits",
		icon: CreditCard,
		description: "Manage user credits",
		permissions: { billing: ["write"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BILLING,
	},
	[ROUTES.ADMIN.BILLING_INVOICES]: {
		title: "Invoices",
		icon: CreditCard,
		description: "View invoice history",
		permissions: { billing: ["read"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BILLING,
	},
	[ROUTES.ADMIN.BILLING_EVENTS]: {
		title: "Webhook Events",
		icon: CreditCard,
		description: "View webhook event history",
		permissions: { billing: ["read"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BILLING,
	},
	[ROUTES.ADMIN.STORAGE]: {
		title: "Media",
		icon: HardDrive,
		description: "Manage media files",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.AI]: {
		title: "AI",
		icon: Bot,
		description: "AI configuration and settings",
		minRole: ROLES.SUPER_ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.ANALYTICS]: {
		title: "Analytics",
		icon: BarChart3,
		description: "View analytics and reports",
		permissions: { admin: ["access"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},

	// RBAC
	[ROUTES.ADMIN.RBAC.BASE]: {
		title: "RBAC",
		icon: Shield,
		description: "Role-based access control management",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.RBAC.ROLES]: {
		title: "Roles",
		icon: UserCog,
		description: "Manage roles and their permissions",
		minRole: ROLES.SUPER_ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.RBAC.BASE,
	},
	[ROUTES.ADMIN.RBAC.ROUTES]: {
		title: "Routes",
		icon: Route,
		description: "Manage protected routes",
		minRole: ROLES.SUPER_ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.RBAC.BASE,
	},
	[ROUTES.ADMIN.RBAC.PERMISSIONS]: {
		title: "Permissions",
		icon: Lock,
		description: "Manage permissions",
		minRole: ROLES.SUPER_ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.RBAC.BASE,
	},

	// Blog
	[ROUTES.ADMIN.BLOG.BASE]: {
		title: "Blog",
		icon: FileText,
		description: "Blog management dashboard",
		permissions: { content: ["write"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.BLOG.POSTS]: {
		title: "Posts",
		icon: PenLine,
		description: "Manage blog posts",
		permissions: { content: ["write"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.CATEGORIES]: {
		title: "Categories",
		icon: FolderOpen,
		description: "Manage post categories",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.TAGS]: {
		title: "Tags",
		icon: BarChart3,
		description: "Manage post tags",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.COMMENTS]: {
		title: "Comments",
		icon: MessageCircle,
		description: "Moderate comments",
		permissions: { content: ["write"] },
		noIndex: true,
		showInNav: false, // replaced by DASHBOARD_COMMENTS in sidebar
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.MEDIA]: {
		title: "Media",
		icon: HardDrive,
		description: "Manage blog media",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.AUTHORS]: {
		title: "Authors",
		icon: Users,
		description: "Manage blog authors and review applications",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.ANALYTICS]: {
		title: "Analytics",
		icon: BarChart3,
		description: "Blog performance analytics",
		permissions: { content: ["write"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.NEWSLETTER]: {
		title: "Newsletter",
		icon: Mail,
		description: "Newsletter subscribers and emails",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.BLOG.SITES]: {
		title: "Sites",
		icon: Globe,
		description: "Manage blog sites",
		minRole: ROLES.SUPER_ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BLOG.BASE,
	},
	[ROUTES.ADMIN.API.BASE]: {
		title: "Integrations",
		icon: Globe,
		description: "Manage API keys for external app integrations",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},

	// Writer editor (authors and above only)
	[ROUTES.EDITOR.NEW]: {
		title: "New Post",
		icon: PenLine,
		description: "Write a new blog post",
		minRole: ROLES.AUTHOR,
		noIndex: true,
		showInNav: false,
	},

	// Author workspace routes
	[ROUTES.DASHBOARD_ASSETS]: {
		title: "Media",
		icon: Images,
		description: "Your media files and uploads",
		permissions: { content: ["write"] },
		maxRole: ROLES.MODERATOR,
		noIndex: true,
		showInNav: true,
	},
	[ROUTES.ACCOUNT.READING_LISTS]: {
		title: "Reading Lists",
		icon: BookMarked,
		description: "Your saved reading lists",
		noIndex: true,
		showInNav: true,
	},
	[ROUTES.DASHBOARD_CALENDAR]: {
		title: "Calendar",
		icon: CalendarDays,
		description: "Scheduled and published post timeline",
		minRole: ROLES.AUTHOR,
		noIndex: true,
		showInNav: true,
	},
	[ROUTES.DASHBOARD_COMMENTS]: {
		title: "Comments",
		icon: MessageCircle,
		description: "Comments on your posts",
		permissions: { content: ["write"] },
		noIndex: true,
		showInNav: true,
	},
	[ROUTES.DASHBOARD_SITES]: {
		title: "My Sites",
		icon: Globe,
		description: "Manage your headless CMS sites and API keys",
		noIndex: true,
		showInNav: true,
	},
};

export function hasMinimumRole(userRole: AppRole, minRole: AppRole): boolean {
	return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

export function isHigherRole(role1: AppRole, role2: AppRole): boolean {
	return ROLE_HIERARCHY.indexOf(role1) > ROLE_HIERARCHY.indexOf(role2);
}

export function checkPermission(
	role: AppRole,
	permissions: Record<string, string[]>,
): boolean {
	const roleImpl = roles[role];
	if (!roleImpl) return false;

	const authorize = roleImpl.authorize as (
		permissions: Record<string, string[]>,
	) => { success: boolean; errors?: { resource: string; action: string }[] };

	return authorize(permissions).success;

	//// @ts-expect-error - Better Auth type limitation
	// return roleImpl.authorize(permissions).success;
}

export function canAccessRoute(route: string, userRole?: AppRole): boolean {
	const path = route.split("?")[0].split("#")[0];
	let config = routeConfig[path];

	// For dynamic routes (e.g. /admin/orders/{id}), fall back to the parent route config
	if (!config && path.startsWith(ROUTES.ADMIN.BASE)) {
		const segments = path.split("/");
		for (let i = segments.length - 1; i >= 2; i--) {
			const parentPath = segments.slice(0, i).join("/");
			if (routeConfig[parentPath]) {
				config = routeConfig[parentPath];
				break;
			}
		}
	}

	if (!config) {
		// Secure-by-default for admin routes: missing config should not imply access.
		if (path.startsWith(ROUTES.ADMIN.BASE)) return false;
		return true;
	}
	if (!userRole) return !config.permissions && !config.minRole;
	if (config.minRole && !hasMinimumRole(userRole, config.minRole)) return false;
	if (config.maxRole && !hasMinimumRole(config.maxRole, userRole)) return false;
	if (config.permissions && !checkPermission(userRole, config.permissions))
		return false;
	return true;
}

export function getRouteConfig(route: string): RouteConfig | undefined {
	const path = route.split("?")[0].split("#")[0];
	const config = routeConfig[path];
	if (config) return config;

	// Fall back to parent route config for dynamic routes
	if (path.startsWith(ROUTES.ADMIN.BASE)) {
		const segments = path.split("/");
		for (let i = segments.length - 1; i >= 2; i--) {
			const parentPath = segments.slice(0, i).join("/");
			if (routeConfig[parentPath]) return routeConfig[parentPath];
		}
	}
	return undefined;
}

export function getProtectedRoutes(): string[] {
	return Object.entries(routeConfig)
		.filter(([_, config]) => config.permissions || config.minRole)
		.map(([route]) => route);
}

export function getRoleCapabilities(role: AppRole) {
	return {
		canAccessAdmin: checkPermission(role, { admin: ["access"] }),
		canManageUsers: checkPermission(role, { users: ["write"] }),
		canBanUsers: checkPermission(role, { users: ["ban"] }),
		canDeleteUsers: checkPermission(role, { users: ["delete"] }),
		canManageRBAC: checkPermission(role, { rbac: ["write"] }),
		canViewBilling: checkPermission(role, { billing: ["read"] }),
		canManageBilling: checkPermission(role, { billing: ["write"] }),
		canManageRoutes: checkPermission(role, { routes: ["write"] }),
		canManageSettings: checkPermission(role, { settings: ["write"] }),
		canImpersonate: checkPermission(role, { user: ["impersonate"] }),
	};
}

export type RoleCapabilities = ReturnType<typeof getRoleCapabilities>;
