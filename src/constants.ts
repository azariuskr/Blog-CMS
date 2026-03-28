export const ROUTES = {
    HOME: "/",
    LOGIN: "/login",
    SIGNUP: "/signup",
    LOGOUT: "/logout",
    DASHBOARD: "/dashboard",
    DASHBOARD_ASSETS: "/dashboard/assets",
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
        ACCEPT_INVITATION: "/auth/accept-invitation",
        CALLBACK: {
            VERIFY_EMAIL: "/auth/callback/verify-email",
            ACCEPT_INVITATION: "/auth/callback/accept-invitation",
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
        READING_LISTS: "/account/reading-lists",
        MUTED_USERS: "/account/muted-users",
        TOPICS: "/account/topics",
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
        BLOG: {
            BASE: "/admin/blog",
            POSTS: "/admin/blog/posts",
            POST_NEW: "/admin/blog/posts/new",
            POST_EDIT: (id: string) => `/admin/blog/posts/${id}/edit`,
            CATEGORIES: "/admin/blog/categories",
            TAGS: "/admin/blog/tags",
            MEDIA: "/admin/blog/media",
            COMMENTS: "/admin/blog/comments",
            SITES: "/admin/blog/sites",
            AUTHORS: "/admin/blog/authors",
            ANALYTICS: "/admin/blog/analytics",
            NEWSLETTER: "/admin/blog/newsletter",
            SETTINGS: "/admin/blog/settings",
        },
        API: {
            BASE: "/admin/api",
            NEW: "/admin/api/new",
            DETAIL: (keyId: string) => `/admin/api/${keyId}`,
        },
    },

    // Public blog routes
    BLOG: {
        HOME: "/",
        POST: (slug: string) => `/${slug}`,
        TAG: (tag: string) => `/blog/tag/${tag}`,
        CATEGORY: (cat: string) => `/blog/category/${cat}`,
        AUTHOR: (username: string) => `/@${username}`,
        SEARCH: "/search",
        PRICING: "/pricing",
        AUTHOR_ONBOARDING: "/author-onboarding",
        PREVIEW: (token: string) => `/preview/${token}`,
    },

    // Editor
    EDITOR: {
        POST: (id: string) => `/editor/${id}`,
        NEW: "/editor/new",
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
    ACCEPT_INVITATION: "accept-invitation",
    TWO_FACTOR: "two-factor",
    EMAIL_OTP: "email-otp",
    LOGOUT: "logout",
    CALLBACK: "callback",
} as const;

export const ACCOUNT_VIEWS = {
    SETTINGS: "settings",
    PROFILE: "profile",
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
        id: ACCOUNT_VIEWS.PROFILE,
        label: "Author Profile",
        icon: User,
        path: ROUTES.ACCOUNT.PROFILE,
    },
    {
        id: ACCOUNT_VIEWS.SECURITY,
        label: "Security",
        icon: Shield,
        path: ROUTES.ACCOUNT.SECURITY,
    },
    {
        id: ACCOUNT_VIEWS.ORGANIZATIONS,
        label: "Organizations",
        icon: Building2,
        path: ROUTES.ACCOUNT.ORGANIZATIONS,
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
        PAYMENT_HISTORY: ["billing", "payment-history"],
        SUBSCRIPTION_HISTORY: ["billing", "subscription-history"],
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
        USER_PAYMENT_HISTORY: (userId: string) => ["billing", "user-payment-history", userId],
    },
    BLOG: {
        POSTS: {
            LIST: ["blog", "posts", "list"],
            PAGINATED: (params?: Record<string, unknown>) => ["blog", "posts", "paginated", params],
            PAGINATED_BASE: ["blog", "posts", "paginated"],
            DETAIL: (slug: string) => ["blog", "posts", "detail", slug],
            BY_ID: (id: string) => ["blog", "posts", "id", id],
            FEATURED: ["blog", "posts", "featured"],
            RECENT: ["blog", "posts", "recent"],
            ADMIN_LIST: ["blog", "admin", "posts"],
            ADMIN_LIST_PARAMS: (params?: Record<string, unknown>) => ["blog", "admin", "posts", params],
            ADMIN_DETAIL: (id: string) => ["blog", "admin", "post", id],
            ADMIN_STATS: ["blog", "admin", "stats"],
            VERSIONS: (postId: string) => ["blog", "admin", "post-versions", postId],
            VERSIONS_BASE: ["blog", "admin", "post-versions"],
            PREVIEW: (token: string) => ["blog", "preview", token],
            BOOKMARK_STATUS: (postId: string) => ["post-bookmark-status", postId],
            BOOKMARK_STATUS_BASE: ["post-bookmark-status"],
            REACTION: (postId: string) => ["post-reaction", postId],
            REACTION_BASE: ["post-reaction"],
        },
        CATEGORIES: {
            LIST: ["blog", "categories", "list"],
        },
        TAGS: {
            LIST: ["blog", "tags", "list"],
        },
        COMMENTS: {
            BASE: ["blog", "comments"],
            BY_POST: (postId: string) => ["blog", "comments", postId],
            PUBLIC: (postId: string) => ["blog", "comments", "public", postId],
            ADMIN: (params?: Record<string, unknown>) => ["blog", "comments", "admin", params],
        },
        AUTHORS: {
            PROFILE: (username: string) => ["blog", "authors", username],
            LIST: ["blog", "authors", "list"],
        },
        SITES: {
            BASE: ["blog", "sites"],
            LIST: ["blog", "sites", "list"],
            DETAIL: (id: string) => ["blog", "sites", id],
        },
        PAGES: {
            BASE: ["blog", "pages"],
            BY_SITE: (siteId: string | null) => ["blog", "pages", siteId],
        },
        AUTHOR_APPLICATIONS: {
            LIST: (status?: string) => ["blog", "author-applications", status],
            LIST_BASE: ["blog", "author-applications"],
            MINE: ["blog", "author-application", "mine"],
        },
        FOLLOW_STATUS: (followerId: string, followingId: string) =>
            ["blog", "follow-status", followerId, followingId],
        FOLLOW_STATUS_BASE: ["blog", "follow-status"],
        NEWSLETTER: {
            SUBSCRIBERS: (params?: Record<string, unknown>) => ["blog", "newsletter", "subscribers", params],
        },
        BOOKMARKS: ["blog", "bookmarks"],
        STATS: ["blog", "stats"],
        API_KEYS: {
            LIST: ["blog", "api-keys", "list"],
            DETAIL: (id: string) => ["blog", "api-keys", id],
        },
    },
    NOTIFICATIONS: {
        BASE: ["notifications"],
        LIST: (limit?: number) => ["notifications", limit],
    },
    READING_LISTS: {
        BASE: ["reading-lists"],
        POSTS: (listId: string | undefined) => ["reading-lists", listId, "posts"],
        PUBLIC_BY_USER: (userId?: string) => ["public-reading-lists", userId],
    },
    MUTED_USERS: ["muted-users"],
    USER_INTERESTS: ["user-interests"],
    ROUTE_ACCESS: (route: string) => ["route-access", route],
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
        PREVIEW_PRORATION: ["billing", "preview-proration"],
        CHANGE_SUBSCRIPTION: ["billing", "change-subscription"],
        CREATE_SETUP_INTENT: ["billing", "create-setup-intent"],
        SET_DEFAULT_PAYMENT_METHOD: ["billing", "set-default-payment-method"],
        DELETE_PAYMENT_METHOD: ["billing", "delete-payment-method"],
        CREATE_CUSTOMER: ["billing", "create-customer"],
        ADMIN_CHANGE_SUBSCRIPTION: ["billing", "admin-change-subscription"],
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
    AUTHOR: "author",
    MODERATOR: "moderator",
    ADMIN: "admin",
    SUPER_ADMIN: "superAdmin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: readonly AppRole[] = [
    ROLES.USER,
    ROLES.AUTHOR,
    ROLES.MODERATOR,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
    [ROLES.USER]: "User",
    [ROLES.AUTHOR]: "Author",
    [ROLES.MODERATOR]: "Moderator",
    [ROLES.ADMIN]: "Admin",
    [ROLES.SUPER_ADMIN]: "Super Admin",
} as const;

import {
    Building2,
    type LucideIcon,
    Settings,
    Shield,
    User,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";

export const ROLE_OPTIONS = ROLE_HIERARCHY.map((role) => {
    const icons = {
        superAdmin: Shield,
        admin: UserCog,
        moderator: Users,
        author: User,
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
