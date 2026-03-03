export const ROUTES = {
    HOME: "/",
    LOGIN: "/login",
    SIGNUP: "/signup",
    LOGOUT: "/logout",
    DASHBOARD: "/dashboard",
    TERMS: "/terms",
    PRIVACY: "/privacy",
    COOKIES: "/cookies",

    AUTH: {
        BASE: "/auth",
        TWO_FACTOR: "/auth/two-factor",
        FORGOT_PASSWORD: "/auth/forgot-password",
        RESET_PASSWORD: "/auth/reset-password",
        MAGIC_LINK: "/auth/magic-link",
        VERIFY_EMAIL: "/auth/verify-email",
        CALLBACK: {
            VERIFY_EMAIL: "/auth/callback/verify-email",
        },
    },

    ACCOUNT: {
        BASE: "/account",
        SETTINGS: "/account/settings",
        PROFILE: "/account/profile",
        SECURITY: "/account/security",
        SESSION: "/account/session",
        ORGANIZATIONS: "/account/organizations",

        SESSIONS: "/account/sessions",

        APPEARANCE: "/account/appearance",
        NOTIFICATIONS: "/account/notifications",
    },

    ADMIN: {
        BASE: "/admin",
        USERS: "/admin/users",
        ORGANIZATIONS: "/admin/organizations",
        BILLING: "/admin/billing",
        BILLING_SUBSCRIPTIONS: "/admin/billing/subscriptions",
        BILLING_CUSTOMERS: "/admin/billing/customers",
        BILLING_CREDITS: "/admin/billing/credits",
        BILLING_INVOICES: "/admin/billing/invoices",
        BILLING_EVENTS: "/admin/billing/events",
        STORAGE: "/admin/storage",
        AI: "/admin/ai",
        ANALYTICS: "/admin/analytics",
        RBAC: {
            BASE: "/admin/rbac",
            ROLES: "/admin/rbac/roles",
            ROUTES: "/admin/rbac/routes",
            PERMISSIONS: "/admin/rbac/permissions",
        },
        // Billing & Finance (e-commerce)
        FINANCE: "/admin/finance",
        FINANCE_PAYMENTS: "/admin/finance/payments",
        FINANCE_INVOICES: "/admin/finance/invoices",
        FINANCE_REPORTS: "/admin/finance/reports",
        // E-commerce
        PRODUCTS: "/admin/products",
        PRODUCT_NEW: "/admin/products/new",
        PRODUCT_DETAIL: (id: string) => `/admin/products/${id}` as const,
        ORDERS: "/admin/orders",
        ORDER_DETAIL: (id: string) => `/admin/orders/${id}` as const,
        INVENTORY: "/admin/inventory",
        CUSTOMERS: "/admin/customers",
        COUPONS: "/admin/coupons",
        BRANDS: "/admin/brands",
        CATEGORIES: "/admin/categories",
        REVIEWS: "/admin/reviews",
        SHIPPING: "/admin/shipping",
        COLLECTIONS: "/admin/collections",
        CAMPAIGNS: "/admin/campaigns",
        CAMPAIGN_DETAIL: (id: string) => `/admin/campaigns/${id}` as const,
        CAMPAIGN_NEW: "/admin/campaigns/new",
    },

    // Storefront
    STORE: {
        BASE: "/store",
        PRODUCTS: "/store/products",
        CART: "/store/cart",
        WISHLIST: "/store/wishlist",
        ABOUT: "/store/about",
        FAQ: "/store/faq",
        CONTACT: "/store/contact",
        ACCOUNT: {
            BASE: "/store/account",
            ORDERS: "/store/account/orders",
            ORDER_DETAIL: (id: string) => `/store/account/orders/${id}` as const,
            ADDRESSES: "/store/account/addresses",
        },
    },

    // User billing routes
    BILLING: {
        BASE: "/billing",
        SUCCESS: "/billing/success",
        CANCEL: "/billing/cancel",
    },

    API: {
        AUTH: "/api/auth",
    },
} as const;

export const AUTH_ROUTE_VIEWS = {
    LOGIN: "login",
    SIGNUP: "signup",
    FORGOT_PASSWORD: "forgot-password",
    RESET_PASSWORD: "reset-password",
    MAGIC_LINK: "magic-link",
    VERIFY_EMAIL: "verify-email",
    TWO_FACTOR: "two-factor",
    EMAIL_OTP: "email-otp",
    LOGOUT: "logout",
    CALLBACK: "callback",
} as const;

export const ACCOUNT_VIEWS = {
    SETTINGS: "settings",
    SECURITY: "security",
    SESSIONS: "sessions",
    APPEARANCE: "appearance",
    NOTIFICATIONS: "notifications",
    ORGANIZATIONS: "organizations",
} as const;

export type AccountTypeView =
    (typeof ACCOUNT_VIEWS)[keyof typeof ACCOUNT_VIEWS];
export const allowedViews = Object.values(
    ACCOUNT_VIEWS,
) as readonly AccountTypeView[];

// Helper function to generate account routes
export const getAccountRoute = (view: AccountTypeView) => `/account/${view}`;

export type AccountTabConfig = {
    id: AccountTypeView;
    label: string;
    icon: LucideIcon;
    path: string;
};

export const ACCOUNT_TABS: readonly AccountTabConfig[] = [
    {
        id: ACCOUNT_VIEWS.SETTINGS,
        label: "Settings",
        icon: Settings,
        path: ROUTES.ACCOUNT.SETTINGS,
    },
    {
        id: ACCOUNT_VIEWS.SECURITY,
        label: "Security",
        icon: Shield,
        path: ROUTES.ACCOUNT.SECURITY,
    },
    {
        id: ACCOUNT_VIEWS.SESSIONS,
        label: "Sessions",
        icon: Monitor,
        path: ROUTES.ACCOUNT.SESSIONS,
    },
    {
        id: ACCOUNT_VIEWS.APPEARANCE,
        label: "Appearance",
        icon: Palette,
        path: ROUTES.ACCOUNT.APPEARANCE,
    },
    {
        id: ACCOUNT_VIEWS.NOTIFICATIONS,
        label: "Notifications",
        icon: Bell,
        path: ROUTES.ACCOUNT.NOTIFICATIONS,
    },
] as const;

export const ALLOW_WHEN_SIGNED_IN = {
    TWO_FACTOR: "/two-factor",
    TWO_FACTOR_AUTH: "/auth/two-factor",
    SIGN_OUT: "/logout",
    SIGN_OUT_AUTH: "/auth/logout",
} as const;

export const QUERY_KEYS = {
    AUTH: {
        SESSION: ["session"],
        USER: ["auth", "user"],
        ROLE_INFO: ["auth", "role-info"],
    },
    USERS: {
        LIST: ["users", "list"],
        STATS: ["users", "stats"],
        FACETS: ["users", "facets"],
        DETAIL: (id: string) => ["users", "detail", id],
        PAGINATED: (params?: Record<string, unknown>) => [
            "users",
            "paginated",
            params,
        ],
        PAGINATED_BASE: ["users", "paginated"],
        SESSIONS: (userId: string) => ["users", "sessions", userId],
    },
    ORGANIZATIONS: {
        LIST: ["organizations", "list"],
        DETAIL: (id: string) => ["organizations", "detail", id],
    },
    FILES: {
        LIST: ["files"],
        PAGINATED: (params?: Record<string, unknown>) => [
            "files",
            "paginated",
            params,
        ],
        PAGINATED_BASE: ["files", "paginated"],
        DETAIL: (id: string) => ["files", "detail", id],
    },
    BILLING: {
        CONFIG: ["billing", "config"],
        PLANS: ["billing", "plans"],
        SUBSCRIPTION: ["billing", "subscription"],
        CREDITS: ["billing", "credits"],
        CREDIT_PACKAGES: ["billing", "credit-packages"],
        PAYMENT_METHODS: ["billing", "payment-methods"],
        // User payment/subscription history
        PAYMENT_HISTORY: ["billing", "payment-history"],
        SUBSCRIPTION_HISTORY: ["billing", "subscription-history"],
        // Admin keys
        STATS: ["billing", "stats"],
        SUBSCRIPTIONS_LIST: ["billing", "subscriptions", "list"],
        SUBSCRIPTIONS_PAGINATED: (params?: Record<string, unknown>) => [
            "billing",
            "subscriptions",
            "paginated",
            params,
        ],
        SUBSCRIPTIONS_PAGINATED_BASE: ["billing", "subscriptions", "paginated"],
        CUSTOMERS_LIST: ["billing", "customers", "list"],
        CUSTOMERS_PAGINATED: (params?: Record<string, unknown>) => [
            "billing",
            "customers",
            "paginated",
            params,
        ],
        CUSTOMERS_PAGINATED_BASE: ["billing", "customers", "paginated"],
        TRANSACTIONS_PAGINATED: (params?: Record<string, unknown>) => [
            "billing",
            "transactions",
            "paginated",
            params,
        ],
        TRANSACTIONS_PAGINATED_BASE: ["billing", "transactions", "paginated"],
        TRANSACTION_FACETS: ["billing", "transactions", "facets"],
        INVOICES_LIST: ["billing", "invoices", "list"],
        REVENUE_METRICS: ["billing", "revenue", "metrics"],
        WEBHOOK_EVENTS: ["billing", "webhook-events"],
        // Admin: User-specific
        USER_PAYMENT_HISTORY: (userId: string) => ["billing", "user-payment-history", userId],
    },
    ROUTE_ACCESS: (route: string) => ["route-access", route],

    // E-commerce
    PRODUCTS: {
        LIST: ["products", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["products", "paginated", params],
        PAGINATED_BASE: ["products", "paginated"],
        DETAIL: (id: string) => ["products", "detail", id],
        BY_SLUG: (slug: string) => ["products", "slug", slug],
        FACETS: ["products", "facets"],
    },
    VARIANTS: {
        LIST: (productId: string) => ["variants", "list", productId],
        DETAIL: (id: string) => ["variants", "detail", id],
    },
    CATEGORIES: {
        LIST: ["categories", "list"],
        TREE: ["categories", "tree"],
        PAGINATED: (params?: Record<string, unknown>) => ["categories", "paginated", params],
        PAGINATED_BASE: ["categories", "paginated"],
        DETAIL: (id: string) => ["categories", "detail", id],
    },
    BRANDS: {
        LIST: ["brands", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["brands", "paginated", params],
        PAGINATED_BASE: ["brands", "paginated"],
        DETAIL: (id: string) => ["brands", "detail", id],
    },
    ORDERS: {
        LIST: ["orders", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["orders", "paginated", params],
        PAGINATED_BASE: ["orders", "paginated"],
        DETAIL: (id: string) => ["orders", "detail", id],
        BY_NUMBER: (orderNumber: string) => ["orders", "number", orderNumber],
        FACETS: ["orders", "facets"],
        STATS: ["orders", "stats"],
    },
    CART: {
        CURRENT: ["cart", "current"],
        ITEMS: ["cart", "items"],
    },
    INVENTORY: {
        LIST: ["inventory", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["inventory", "paginated", params],
        PAGINATED_BASE: ["inventory", "paginated"],
        LOW_STOCK: ["inventory", "low-stock"],
    },
    CUSTOMERS: {
        LIST: ["customers", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["customers", "paginated", params],
        PAGINATED_BASE: ["customers", "paginated"],
        DETAIL: (id: string) => ["customers", "detail", id],
    },
    COUPONS: {
        LIST: ["coupons", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["coupons", "paginated", params],
        PAGINATED_BASE: ["coupons", "paginated"],
        DETAIL: (id: string) => ["coupons", "detail", id],
        VALIDATE: (code: string) => ["coupons", "validate", code],
    },
    REVIEWS: {
        LIST: ["reviews", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["reviews", "paginated", params],
        PAGINATED_BASE: ["reviews", "paginated"],
        BY_PRODUCT: (productId: string) => ["reviews", "product", productId],
        PENDING: ["reviews", "pending"],
    },
    COLLECTIONS: {
        LIST: ["collections", "list"],
        DETAIL: (id: string) => ["collections", "detail", id],
        BY_SLUG: (slug: string) => ["collections", "slug", slug],
    },
    MY_ORDERS: {
        LIST: ["my-orders", "list"],
        PAGINATED: (params?: Record<string, unknown>) => ["my-orders", "paginated", params],
        DETAIL: (id: string) => ["my-orders", "detail", id],
    },
    WISHLIST: {
        ITEMS: ["wishlist", "items"],
    },
    ADDRESSES: {
        LIST: ["addresses", "list"],
        DETAIL: (id: string) => ["addresses", "detail", id],
    },
    COLORS: {
        LIST: ["colors", "list"],
    },
    SIZES: {
        LIST: ["sizes", "list"],
    },
    CAMPAIGNS: {
        PAGINATED: (filters: Record<string, unknown>) => ["campaigns", "paginated", filters],
        PAGINATED_BASE: ["campaigns", "paginated"],
        DETAIL: (id: string) => ["campaigns", "detail", id],
    },
    EMAIL_TEMPLATES: {
        LIST: ["email-templates", "list"],
        DETAIL: (id: string) => ["email-templates", "detail", id],
    },
} as const;

export const MUTATION_KEYS = {
    USER: {
        CREATE: ["user", "create"],
        UPDATE: ["user", "update"],
        DELETE: ["user", "delete"],
        SET_ROLE: ["user", "set-role"],
        SET_PASSWORD: ["user", "set-password"],
        BAN: ["user", "ban"],
        UNBAN: ["user", "unban"],
    },
    SESSION: {
        REVOKE: ["session", "revoke"],
        REVOKE_ALL: ["session", "revoke-all"],
    },
    IMPERSONATION: {
        START: ["impersonation", "start"],
        STOP: ["impersonation", "stop"],
    },
    BILLING: {
        CREATE_CHECKOUT: ["billing", "create-checkout"],
        CANCEL_SUBSCRIPTION: ["billing", "cancel-subscription"],
        PURCHASE_CREDITS: ["billing", "purchase-credits"],
        USE_CREDITS: ["billing", "use-credits"],
        GRANT_CREDITS: ["billing", "grant-credits"],
        GET_PORTAL_URL: ["billing", "portal-url"],
        // Subscription change
        PREVIEW_PRORATION: ["billing", "preview-proration"],
        CHANGE_SUBSCRIPTION: ["billing", "change-subscription"],
        // Payment methods
        CREATE_SETUP_INTENT: ["billing", "create-setup-intent"],
        SET_DEFAULT_PAYMENT_METHOD: ["billing", "set-default-payment-method"],
        DELETE_PAYMENT_METHOD: ["billing", "delete-payment-method"],
        // Admin
        CREATE_CUSTOMER: ["billing", "create-customer"],
        ADMIN_CHANGE_SUBSCRIPTION: ["billing", "admin-change-subscription"],
    },

    // E-commerce
    PRODUCT: {
        CREATE: ["product", "create"],
        UPDATE: ["product", "update"],
        DELETE: ["product", "delete"],
        PUBLISH: ["product", "publish"],
        ARCHIVE: ["product", "archive"],
    },
    VARIANT: {
        CREATE: ["variant", "create"],
        UPDATE: ["variant", "update"],
        DELETE: ["variant", "delete"],
    },
    INVENTORY: {
        ADJUST: ["inventory", "adjust"],
        BULK_UPDATE: ["inventory", "bulk-update"],
    },
    ORDER: {
        UPDATE_STATUS: ["order", "update-status"],
        ADD_SHIPMENT: ["order", "add-shipment"],
        CANCEL: ["order", "cancel"],
        REFUND: ["order", "refund"],
        ADD_NOTE: ["order", "add-note"],
    },
    CART: {
        ADD_ITEM: ["cart", "add-item"],
        UPDATE_ITEM: ["cart", "update-item"],
        REMOVE_ITEM: ["cart", "remove-item"],
        APPLY_COUPON: ["cart", "apply-coupon"],
        REMOVE_COUPON: ["cart", "remove-coupon"],
        CLEAR: ["cart", "clear"],
        MERGE: ["cart", "merge"],
    },
    CHECKOUT: {
        CREATE: ["checkout", "create"],
        VERIFY_PAYMENT: ["checkout", "verify-payment"],
    },
    COUPON: {
        CREATE: ["coupon", "create"],
        UPDATE: ["coupon", "update"],
        DELETE: ["coupon", "delete"],
    },
    REVIEW: {
        CREATE: ["review", "create"],
        UPDATE: ["review", "update"],
        DELETE: ["review", "delete"],
        APPROVE: ["review", "approve"],
    },
    WISHLIST: {
        ADD: ["wishlist", "add"],
        REMOVE: ["wishlist", "remove"],
    },
    ADDRESS: {
        CREATE: ["address", "create"],
        UPDATE: ["address", "update"],
        DELETE: ["address", "delete"],
        SET_DEFAULT: ["address", "set-default"],
    },
    CATEGORY: {
        CREATE: ["category", "create"],
        UPDATE: ["category", "update"],
        DELETE: ["category", "delete"],
    },
    BRAND: {
        CREATE: ["brand", "create"],
        UPDATE: ["brand", "update"],
        DELETE: ["brand", "delete"],
    },
    COLLECTION: {
        CREATE: ["collection", "create"],
        UPDATE: ["collection", "update"],
        DELETE: ["collection", "delete"],
        ADD_PRODUCT: ["collection", "add-product"],
        REMOVE_PRODUCT: ["collection", "remove-product"],
    },
} as const;

export const MESSAGES = {
    SUCCESS: {
        USER_CREATED: "User created successfully",
        USER_UPDATED: "User updated successfully",
        USER_DELETED: "User deleted successfully",
        ROLE_UPDATED: "Role updated successfully",
        USER_BANNED: "User banned successfully",
        USER_UNBANNED: "User unbanned successfully",
        SESSION_REVOKED: "Session revoked successfully",
        SESSIONS_REVOKED: "All sessions revoked successfully",
        IMPERSONATION_STARTED: "Now impersonating user",
        IMPERSONATION_STOPPED: "Stopped impersonating",
        PASSWORD_CHANGED: "Password changed successfully",
        // Billing messages
        SUBSCRIPTION_CREATED: "Subscription created successfully",
        SUBSCRIPTION_CANCELED: "Subscription canceled successfully",
        SUBSCRIPTION_UPGRADED: "Subscription upgraded successfully",
        SUBSCRIPTION_DOWNGRADED: "Subscription downgraded successfully",
        SUBSCRIPTION_CHANGED: "Subscription changed successfully",
        CREDITS_PURCHASED: "Credits purchased successfully",
        CREDITS_USED: "Credits used successfully",
        CREDITS_GRANTED: "Credits granted successfully",
        CUSTOMER_CREATED: "Customer created successfully",
        PAYMENT_METHOD_ADDED: "Payment method added successfully",
        PAYMENT_METHOD_REMOVED: "Payment method removed successfully",
        DEFAULT_PAYMENT_METHOD_SET: "Default payment method updated",
        // E-commerce messages
        PRODUCT_CREATED: "Product created successfully",
        PRODUCT_UPDATED: "Product updated successfully",
        PRODUCT_DELETED: "Product deleted successfully",
        PRODUCT_PUBLISHED: "Product published successfully",
        VARIANT_CREATED: "Variant created successfully",
        VARIANT_UPDATED: "Variant updated successfully",
        VARIANT_DELETED: "Variant deleted successfully",
        ORDER_UPDATED: "Order updated successfully",
        ORDER_SHIPPED: "Order marked as shipped",
        ORDER_CANCELLED: "Order cancelled successfully",
        ORDER_REFUNDED: "Order refunded successfully",
        CART_ITEM_ADDED: "Item added to cart",
        CART_ITEM_UPDATED: "Cart updated",
        CART_ITEM_REMOVED: "Item removed from cart",
        COUPON_APPLIED: "Coupon applied successfully",
        COUPON_REMOVED: "Coupon removed",
        COUPON_CREATED: "Coupon created successfully",
        COUPON_UPDATED: "Coupon updated successfully",
        COUPON_DELETED: "Coupon deleted successfully",
        BRAND_CREATED: "Brand created successfully",
        BRAND_UPDATED: "Brand updated successfully",
        BRAND_DELETED: "Brand deleted successfully",
        CATEGORY_CREATED: "Category created successfully",
        CATEGORY_UPDATED: "Category updated successfully",
        CATEGORY_DELETED: "Category deleted successfully",
        REVIEW_SUBMITTED: "Review submitted successfully",
        REVIEW_APPROVED: "Review approved",
        REVIEW_DELETED: "Review deleted",
        WISHLIST_ADDED: "Added to wishlist",
        WISHLIST_REMOVED: "Removed from wishlist",
        ADDRESS_SAVED: "Address saved successfully",
        ADDRESS_DELETED: "Address deleted",
        STOCK_ADJUSTED: "Stock adjusted successfully",
        TEMPLATE_CREATED: "Email template created",
        TEMPLATE_UPDATED: "Email template updated",
        TEMPLATE_DELETED: "Email template deleted",
        CAMPAIGN_CREATED: "Campaign created",
        CAMPAIGN_UPDATED: "Campaign updated",
        CAMPAIGN_DELETED: "Campaign deleted",
        CAMPAIGN_SCHEDULED: "Campaign scheduled",
        CAMPAIGN_STARTED: "Campaign started",
    },

    ERROR: {
        UNAUTHORIZED: "Please log in to continue",
        FORBIDDEN: "You don't have permission to access this resource",
        NOT_FOUND: "The requested resource was not found",
        VALIDATION_FAILED: "Please check your input and try again",
        SERVER_ERROR: "Something went wrong. Please try again",
        MAINTENANCE: "Service temporarily unavailable. We'll be back soon",
        ACTION_FAILED: "Action failed. Please try again",
        LOGIN_FAILED: "Invalid email or password",
        SIGNUP_FAILED: "Unable to create account",
        SESSION_EXPIRED: "Your session has expired. Please log in again",
        INVALID_TOKEN: "Invalid or expired token",
        NETWORK_ERROR: "Network error. Please check your connection",
        SELF_ACTION: "Cannot perform this action on yourself",
        // Billing errors
        BILLING_NOT_CONFIGURED: "Billing is not configured",
        SUBSCRIPTION_FAILED: "Failed to create subscription",
        CREDITS_INSUFFICIENT: "Insufficient credits for this action",
        CHECKOUT_FAILED: "Failed to create checkout session",
        PORTAL_FAILED: "Failed to open billing portal",
        PAYMENT_METHOD_REQUIRED: "Please add a payment method to continue",
        PAYMENT_METHOD_FAILED: "Failed to update payment method",
        // E-commerce errors
        PRODUCT_NOT_FOUND: "Product not found",
        VARIANT_NOT_FOUND: "Variant not found",
        ORDER_NOT_FOUND: "Order not found",
        CART_EMPTY: "Your cart is empty",
        INSUFFICIENT_STOCK: "Insufficient stock available",
        INVALID_COUPON: "Invalid or expired coupon code",
        COUPON_MIN_ORDER: "Order does not meet minimum amount for this coupon",
        COUPON_EXPIRED: "This coupon has expired",
        COUPON_USAGE_LIMIT: "This coupon has reached its usage limit",
        CHECKOUT_FAILED_STOCK: "Some items are no longer available in the requested quantity",
        REVIEW_ALREADY_EXISTS: "You have already reviewed this product",
        ADDRESS_NOT_FOUND: "Address not found",
    },

    CONFIRM: {
        DELETE:
            "This action cannot be undone. This will permanently delete the item.",
        LOGOUT: "Are you sure you want to logout?",
        CANCEL:
            "Are you sure you want to cancel? Any unsaved changes will be lost.",

        // More specific confirms (admin/actions)
        DELETE_USER: "This will permanently delete the user and all their data.",
        BAN_USER: "This will prevent the user from accessing their account.",
        REVOKE_SESSION: "This will log the user out of this device.",
        REVOKE_ALL_SESSIONS: "This will log the user out of all devices.",

        // Billing confirms
        CANCEL_SUBSCRIPTION: "Are you sure you want to cancel your subscription? You will still have access until the end of the billing period.",
        CANCEL_SUBSCRIPTION_IMMEDIATE: "Are you sure you want to cancel immediately? You will lose access right away.",
    },
} as const;

// Optional: handy types
export type MessageGroup = keyof typeof MESSAGES;
export type MessageKey<G extends MessageGroup> = keyof (typeof MESSAGES)[G];

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

// Centralized role definitions - single source of truth
export const ROLES = {
    USER: "user",
    MODERATOR: "moderator",
    ADMIN: "admin",
    SUPER_ADMIN: "superAdmin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: readonly AppRole[] = [
    ROLES.USER,
    ROLES.MODERATOR,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
    [ROLES.USER]: "User",
    [ROLES.MODERATOR]: "Moderator",
    [ROLES.ADMIN]: "Admin",
    [ROLES.SUPER_ADMIN]: "Super Admin",
} as const;

import {
    Bell,
    type LucideIcon,
    Monitor,
    Palette,
    Settings,
    Shield,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";

export const ROLE_OPTIONS = ROLE_HIERARCHY.map((role) => {
    const icons = {
        superAdmin: Shield,
        admin: UserCog,
        moderator: Users,
        user: Wallet,
    };

    return {
        value: role,
        label: ROLE_LABELS[role],
        icon: icons[role as keyof typeof icons],
    };
});

import { CheckCircle, Clock, XCircle } from "lucide-react";

export const USER_STATUSES = ["active", "banned", "pending"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
    active: "Active",
    banned: "Banned",
    pending: "Pending",
} as const;

const STATUS_ICONS: Record<
    UserStatus,
    React.ComponentType<{ className?: string }>
> = {
    active: CheckCircle,
    banned: XCircle,
    pending: Clock,
} as const;

export const USER_STATUS_OPTIONS = USER_STATUSES.map((status) => ({
    value: status,
    label: USER_STATUS_LABELS[status],
    icon: STATUS_ICONS[status],
}));

// ============================================================================
// Storage Configuration
// ============================================================================

export const STORAGE_PATHS = {
    AVATAR: "avatar",
    ATTACHMENT: "attachment",
    DOCUMENT: "document",
    MEDIA: "media",
} as const;

export type StoragePath = (typeof STORAGE_PATHS)[keyof typeof STORAGE_PATHS];

// Valid prefixes for upload validation (auto-derived so we don't forget to update it)
export const VALID_UPLOAD_PREFIXES = Object.values(
    STORAGE_PATHS,
) as readonly StoragePath[];

export const STORAGE_API = {
    UPLOAD: "/api/storage/upload",
    FILES: "/api/storage/files",
    AVATAR: (userId: string) => `/api/storage/avatar/${userId}`,
} as const;

export const STORAGE_CACHE = {
    AVATAR_MAX_AGE: 3600,
    AVATAR_STALE_WHILE_REVALIDATE: 86400,
    FILES_MAX_AGE: 3600,
} as const;

export const AVATAR_CONFIG = {
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    OUTPUT_SIZE: 256,
    OUTPUT_FORMAT: "webp" as const,
    OUTPUT_QUALITY: 85,
    ALLOWED_TYPES: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ] as const,
} as const;

// ============================================================================
// E-Commerce Configuration
// ============================================================================

export const ORDER_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
} as const;

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
    draft: "Draft",
    active: "Active",
    archived: "Archived",
} as const;

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
    refunded: "Refunded",
} as const;

export const DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const SIZE_CATEGORIES = ["clothing", "shoes", "accessories", "one_size"] as const;

export type SizeCategory = (typeof SIZE_CATEGORIES)[number];

export const SIZE_CATEGORY_LABELS: Record<SizeCategory, string> = {
    clothing: "Clothing",
    shoes: "Shoes",
    accessories: "Accessories",
    one_size: "One Size",
} as const;

// Currency formatting (USD only for now)
export const CURRENCY = {
    CODE: "USD",
    SYMBOL: "$",
    DECIMAL_PLACES: 2,
} as const;

// Format cents to display string
export const formatPrice = (cents: number): string => {
    return `${CURRENCY.SYMBOL}${(cents / 100).toFixed(CURRENCY.DECIMAL_PLACES)}`;
};

// Parse display string to cents
export const parsePriceToCents = (price: string | number): number => {
    if (typeof price === "number") return Math.round(price * 100);
    const cleaned = price.replace(/[^0-9.]/g, "");
    return Math.round(parseFloat(cleaned) * 100);
};

// Cart configuration
export const CART_CONFIG = {
    GUEST_CART_EXPIRY_DAYS: 7,
    ABANDONED_CART_HOURS: 2,
    MAX_QUANTITY_PER_ITEM: 99,
} as const;

// Inventory configuration
export const INVENTORY_CONFIG = {
    DEFAULT_LOW_STOCK_THRESHOLD: 10,
    RESERVATION_EXPIRY_MINUTES: 10,
} as const;

// Shipping carriers
export const SHIPPING_CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"] as const;

export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number];
