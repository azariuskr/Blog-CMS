export const siteConfig = {
    name: "Your App Name",
    title: "Your App - Tagline",
    description: "Your app description that explains what you do and why users should care.",
    url: "https://yourapp.com",

    ogImage: "/og-image.jpg",
    twitterHandle: "@yourhandle",
    twitterCreator: "@yourhandle",
    locale: "en_US",

    themeColor: "#000000",
    backgroundColor: "#ffffff",

    organization: {
        name: "Your Company Name",
        url: "https://yourapp.com",
        logo: "https://yourapp.com/logo.png",
        sameAs: [
            "https://twitter.com/yourhandle",
            "https://linkedin.com/company/yourcompany",
            "https://github.com/yourorg",
        ],
    },

    contact: {
        email: "hello@yourapp.com",
        supportUrl: "https://yourapp.com/support",
    },

    defaultRobots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",

    analytics: {
        googleAnalyticsId: import.meta.env.VITE_GA_ID,
        plausibleDomain: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    },

    verification: {
        google: import.meta.env.VITE_GOOGLE_SITE_VERIFICATION,
        bing: import.meta.env.VITE_BING_SITE_VERIFICATION,
    },
} as const;

export type SiteConfig = typeof siteConfig;
