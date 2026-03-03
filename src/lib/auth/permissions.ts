import { createAccessControl } from "better-auth/plugins/access";
import type { LucideIcon } from "lucide-react";
import {
	Award,
	BarChart3,
	Bot,
	Building2,
	CreditCard,
	FileText,
	HardDrive,
	Home,
	Layers,
	LayoutDashboard,
	LineChart,
	Lock,
	Mail,
	Package,
	Route,
	Shield,
	ShoppingCart,
	Star,
	Tag,
	Truck,
	User,
	UserCog,
	Users,
	Wallet,
	Warehouse,
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
	// E-commerce permissions
	products: ["read", "write", "delete", "publish"],
	variants: ["read", "write", "delete"],
	inventory: ["read", "write", "adjust"],
	orders: ["read", "write", "cancel", "refund", "fulfill"],
	customers: ["read", "write", "export"],
	coupons: ["read", "write", "delete"],
	collections: ["read", "write", "delete"],
	reviews: ["read", "write", "approve", "delete"],
	shipping: ["read", "write", "configure"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
	user: ac.newRole({
		user: ["get", "update"],
		session: ["list", "revoke"],
		// Note: users:read removed - regular users should not access admin user lists
	}),
	moderator: ac.newRole({
		user: ["get", "update"],
		session: ["list", "revoke"],
		users: ["read", "ban"],
		settings: ["read"],
		// E-commerce: moderators can view and approve reviews
		reviews: ["read", "approve"],
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
		// E-commerce: admins can manage products, orders, inventory, coupons
		products: ["read", "write", "publish"],
		variants: ["read", "write"],
		inventory: ["read", "write", "adjust"],
		orders: ["read", "write", "fulfill"],
		customers: ["read"],
		coupons: ["read", "write"],
		collections: ["read", "write"],
		reviews: ["read", "write", "approve"],
		shipping: ["read", "write"],
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
		// E-commerce: superAdmin has full access including delete, cancel, refund
		products: ["read", "write", "delete", "publish"],
		variants: ["read", "write", "delete"],
		inventory: ["read", "write", "adjust"],
		orders: ["read", "write", "cancel", "refund", "fulfill"],
		customers: ["read", "write", "export"],
		coupons: ["read", "write", "delete"],
		collections: ["read", "write", "delete"],
		reviews: ["read", "write", "approve", "delete"],
		shipping: ["read", "write", "configure"],
	}),
} as const;

export type AppPermissions = typeof statements;

export const ROLE_GRANTS = {
	[ROLES.USER]: {
		user: ["get", "update"],
		session: ["list", "revoke"],
		// Note: users:read removed - regular users should not access admin user lists
	},
	[ROLES.MODERATOR]: {
		user: ["get", "update"],
		session: ["list", "revoke"],
		users: ["read", "ban"],
		settings: ["read"],
		// E-commerce: moderators can view and approve reviews
		reviews: ["read", "approve"],
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
		// E-commerce: admins can manage products, orders, inventory, coupons
		products: ["read", "write", "publish"],
		variants: ["read", "write"],
		inventory: ["read", "write", "adjust"],
		orders: ["read", "write", "fulfill"],
		customers: ["read"],
		coupons: ["read", "write"],
		collections: ["read", "write"],
		reviews: ["read", "write", "approve"],
		shipping: ["read", "write"],
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
		// E-commerce: superAdmin has full access including delete, cancel, refund
		products: ["read", "write", "delete", "publish"],
		variants: ["read", "write", "delete"],
		inventory: ["read", "write", "adjust"],
		orders: ["read", "write", "cancel", "refund", "fulfill"],
		customers: ["read", "write", "export"],
		coupons: ["read", "write", "delete"],
		collections: ["read", "write", "delete"],
		reviews: ["read", "write", "approve", "delete"],
		shipping: ["read", "write", "configure"],
	},
} as const satisfies Record<AppRole, Record<string, readonly string[]>>;

export interface RouteConfig {
	title: string;
	description?: string;
	icon?: LucideIcon;
	permissions?: Record<string, string[]>;
	minRole?: AppRole;
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
		permissions: { admin: ["access"] },
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
		title: "Storage",
		icon: HardDrive,
		description: "Manage storage settings",
		minRole: ROLES.SUPER_ADMIN,
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

	// Billing & Finance (e-commerce)
	[ROUTES.ADMIN.FINANCE]: {
		title: "Billing & Finance",
		icon: Wallet,
		description: "Payments, invoices, and financial reports",
		permissions: { orders: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.FINANCE_PAYMENTS]: {
		title: "Payments",
		icon: CreditCard,
		description: "View order payments and transactions",
		permissions: { orders: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.FINANCE,
	},
	[ROUTES.ADMIN.FINANCE_INVOICES]: {
		title: "Invoices",
		icon: FileText,
		description: "Manage and download invoices",
		permissions: { orders: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.FINANCE,
	},
	[ROUTES.ADMIN.FINANCE_REPORTS]: {
		title: "Reports",
		icon: LineChart,
		description: "Financial reports and analytics",
		permissions: { orders: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.FINANCE,
	},

	// E-commerce
	[ROUTES.ADMIN.PRODUCTS]: {
		title: "Products",
		icon: Package,
		description: "Manage products and variants",
		permissions: { products: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.PRODUCT_NEW]: {
		title: "New Product",
		icon: Package,
		description: "Create a new product",
		permissions: { products: ["write"] },
		noIndex: true,
		showInNav: false,
		parent: ROUTES.ADMIN.PRODUCTS,
	},
	[ROUTES.ADMIN.ORDERS]: {
		title: "Orders",
		icon: ShoppingCart,
		description: "View and manage orders",
		permissions: { orders: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.INVENTORY]: {
		title: "Inventory",
		icon: Warehouse,
		description: "Manage product inventory and stock levels",
		permissions: { inventory: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.CUSTOMERS]: {
		title: "Customers",
		icon: Users,
		description: "View customer information and order history",
		permissions: { customers: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.COUPONS]: {
		title: "Coupons",
		icon: Tag,
		description: "Manage discount codes and promotions",
		permissions: { coupons: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.BRANDS]: {
		title: "Brands",
		icon: Award,
		description: "Manage product brands",
		permissions: { products: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.CATEGORIES]: {
		title: "Categories",
		icon: Layers,
		description: "Manage product categories",
		permissions: { products: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.REVIEWS]: {
		title: "Reviews",
		icon: Star,
		description: "Moderate product reviews",
		permissions: { reviews: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.SHIPPING]: {
		title: "Shipping",
		icon: Truck,
		description: "Configure shipping options",
		permissions: { shipping: ["read"] },
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
	},
	[ROUTES.ADMIN.CAMPAIGNS]: {
		title: "Campaigns",
		icon: Mail,
		description: "Email campaigns and templates",
		minRole: ROLES.ADMIN,
		noIndex: true,
		showInNav: true,
		parent: ROUTES.ADMIN.BASE,
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
		// E-commerce capabilities
		canViewProducts: checkPermission(role, { products: ["read"] }),
		canManageProducts: checkPermission(role, { products: ["write"] }),
		canDeleteProducts: checkPermission(role, { products: ["delete"] }),
		canViewOrders: checkPermission(role, { orders: ["read"] }),
		canManageOrders: checkPermission(role, { orders: ["write"] }),
		canFulfillOrders: checkPermission(role, { orders: ["fulfill"] }),
		canCancelOrders: checkPermission(role, { orders: ["cancel"] }),
		canRefundOrders: checkPermission(role, { orders: ["refund"] }),
		canViewInventory: checkPermission(role, { inventory: ["read"] }),
		canAdjustInventory: checkPermission(role, { inventory: ["adjust"] }),
		canViewCustomers: checkPermission(role, { customers: ["read"] }),
		canExportCustomers: checkPermission(role, { customers: ["export"] }),
		canViewCoupons: checkPermission(role, { coupons: ["read"] }),
		canManageCoupons: checkPermission(role, { coupons: ["write"] }),
		canViewReviews: checkPermission(role, { reviews: ["read"] }),
		canApproveReviews: checkPermission(role, { reviews: ["approve"] }),
		canDeleteReviews: checkPermission(role, { reviews: ["delete"] }),
	};
}

export type RoleCapabilities = ReturnType<typeof getRoleCapabilities>;
