import { siteConfig } from "./siteConfig";
import { routeConfig } from "@/lib/auth/permissions";
import { ROUTES } from "@/constants";

export interface PageMetadata {
    title: string;
    description: string;
    image?: string;
    canonical?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    type?: "website" | "article" | "profile" | "product";
    keywords?: string[];
    article?: {
        author?: string;
        publishedTime?: string;
        modifiedTime?: string;
        section?: string;
        tags?: string[];
    };
    product?: {
        price?: string;
        currency?: string;
        availability?: "in stock" | "out of stock" | "preorder";
        brand?: string;
    };
    structuredData?: Record<string, unknown>;
}

function fromRouteConfig(route: string): PageMetadata | null {
    const config = routeConfig[route];
    if (!config) return null;
    return {
        title: config.title,
        description: config.description ?? "",
        canonical: route,
        noIndex: config.noIndex,
        keywords: config.keywords,
    };
}

export const METADATA: Record<string, PageMetadata> = {
    HOME: fromRouteConfig(ROUTES.HOME) ?? {
        title: "Home",
        description: "Welcome to our platform",
        canonical: "/",
    },

    LOGIN: fromRouteConfig(ROUTES.LOGIN) ?? {
        title: "Log In",
        description: "Log in to your account",
        canonical: "/login",
        noIndex: true,
    },

    SIGNUP: fromRouteConfig(ROUTES.SIGNUP) ?? {
        title: "Sign Up",
        description: "Create a new account",
        canonical: "/signup",
        noIndex: true,
    },

    DASHBOARD: fromRouteConfig(ROUTES.DASHBOARD) ?? {
        title: "Dashboard",
        description: "Your personal dashboard",
        canonical: "/dashboard",
        noIndex: true,
        noFollow: true,
    },

    ACCOUNT_PROFILE: fromRouteConfig(ROUTES.ACCOUNT.PROFILE) ?? {
        title: "Profile",
        description: "View and edit your profile",
        canonical: "/account/profile",
        noIndex: true,
    },

    ACCOUNT_SECURITY: fromRouteConfig(ROUTES.ACCOUNT.SECURITY) ?? {
        title: "Security",
        description: "Manage security settings",
        canonical: "/account/security",
        noIndex: true,
    },

    ADMIN_USERS: fromRouteConfig(ROUTES.ADMIN.USERS) ?? {
        title: "Users",
        description: "Manage users",
        canonical: "/admin/users",
        noIndex: true,
    },

    ADMIN_RBAC: fromRouteConfig(ROUTES.ADMIN.RBAC.BASE) ?? {
        title: "RBAC",
        description: "Role-based access control",
        canonical: "/admin/rbac",
        noIndex: true,
    },

    NOT_FOUND: {
        title: "404 - Page Not Found",
        description: "The page you are looking for could not be found",
        noIndex: true,
    },

    PRIVACY: {
        title: "Privacy Policy",
        description: "Our privacy policy and how we handle your data",
        canonical: "/privacy",
        keywords: ["privacy", "policy", "data", "gdpr"],
    },

    TERMS: {
        title: "Terms of Service",
        description: "Terms and conditions for using our platform",
        canonical: "/terms",
        keywords: ["terms", "conditions", "legal"],
    },

    COOKIES: {
        title: "Cookie Policy",
        description: "Cookie Policy our platform uses",
        canonical: "/cookies",
        keywords: ["cookies", "policies"],
    },
};

export function getMetadataForRoute(route: string): PageMetadata {
    const config = routeConfig[route];
    if (config) {
        return {
            title: config.title,
            description: config.description ?? siteConfig.description,
            canonical: route,
            noIndex: config.noIndex,
            keywords: config.keywords,
        };
    }
    return METADATA.NOT_FOUND;
}

export function createDynamicMetadata(
    baseMetadata: PageMetadata,
    overrides: Partial<PageMetadata>
): PageMetadata {
    return {
        ...baseMetadata,
        ...overrides,
        keywords: [...(baseMetadata.keywords ?? []), ...(overrides.keywords ?? [])],
    };
}

export function createBlogPostMetadata(post: {
    title: string;
    excerpt: string;
    slug: string;
    coverImage?: string;
    author: string;
    publishedAt: string;
    updatedAt?: string;
    tags?: string[];
    category?: string;
}): PageMetadata {
    return {
        title: post.title,
        description: post.excerpt,
        image: post.coverImage ?? siteConfig.ogImage,
        canonical: `/blog/${post.slug}`,
        type: "article",
        keywords: post.tags,
        article: {
            author: post.author,
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            section: post.category,
            tags: post.tags,
        },
    };
}

export function createProfileMetadata(profile: {
    name: string;
    username: string;
    bio?: string;
    avatar?: string;
    isPrivate?: boolean;
}): PageMetadata {
    return {
        title: `${profile.name} (@${profile.username})`,
        description: profile.bio ?? `Check out ${profile.name}'s profile`,
        image: profile.avatar ?? siteConfig.ogImage,
        canonical: `/profile/${profile.username}`,
        type: "profile",
        noIndex: profile.isPrivate ?? false,
    };
}

export function createProductMetadata(product: {
    name: string;
    description: string;
    id: string;
    image?: string;
    price?: number;
    currency?: string;
    inStock?: boolean;
    brand?: string;
}): PageMetadata {
    return {
        title: product.name,
        description: product.description,
        image: product.image ?? siteConfig.ogImage,
        canonical: `/products/${product.id}`,
        type: "product",
        product: product.price
            ? {
                price: product.price.toString(),
                currency: product.currency ?? "USD",
                availability: product.inStock ? "in stock" : "out of stock",
                brand: product.brand,
            }
            : undefined,
    };
}

export type MetadataKey = keyof typeof METADATA;
