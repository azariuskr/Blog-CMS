import { siteConfig } from "./siteConfig";
import type { PageMetadata } from "./metadata.config";
import { getMetadataForRoute } from "./metadata.config";

export function generateMetadata(
    metadataOrPath: PageMetadata | string,
    overrides?: Partial<PageMetadata>
) {
    const metadata =
        typeof metadataOrPath === "string"
            ? getMetadataForRoute(metadataOrPath)
            : metadataOrPath;

    const config = { ...metadata, ...overrides };

    const {
        title,
        description,
        image = siteConfig.ogImage,
        canonical,
        noIndex = false,
        noFollow = false,
        type = "website",
        keywords = [],
        article,
        product,
        structuredData,
    } = config;

    const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.title;
    const imageUrl = image.startsWith("http") ? image : `${siteConfig.url}${image}`;
    const canonicalUrl = canonical
        ? canonical.startsWith("http")
            ? canonical
            : `${siteConfig.url}${canonical}`
        : undefined;

    let robotsContent: string = siteConfig.defaultRobots;
    if (noIndex || noFollow) {
        const robotsParts = [];
        if (noIndex) robotsParts.push("noindex");
        if (noFollow) robotsParts.push("nofollow");
        robotsContent = robotsParts.join(", ");
    }

    const meta: Array<Record<string, string>> = [
        { title: fullTitle },
        { name: "description", content: description },
        { name: "robots", content: robotsContent },
        { name: "theme-color", content: siteConfig.themeColor },

        ...(keywords.length > 0 ? [{ name: "keywords", content: keywords.join(", ") }] : []),
        ...(canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : []),

        { property: "og:type", content: type },
        { property: "og:site_name", content: siteConfig.name },
        { property: "og:title", content: fullTitle },
        { property: "og:description", content: description },
        { property: "og:image", content: imageUrl },
        { property: "og:image:alt", content: fullTitle },
        { property: "og:locale", content: siteConfig.locale },
        ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),

        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: siteConfig.twitterHandle },
        { name: "twitter:creator", content: siteConfig.twitterCreator },
        { name: "twitter:title", content: fullTitle },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
        { name: "twitter:image:alt", content: fullTitle },

        ...(article?.publishedTime
            ? [{ property: "article:published_time", content: article.publishedTime }]
            : []),
        ...(article?.modifiedTime
            ? [{ property: "article:modified_time", content: article.modifiedTime }]
            : []),
        ...(article?.author ? [{ property: "article:author", content: article.author }] : []),
        ...(article?.section ? [{ property: "article:section", content: article.section }] : []),
        ...(article?.tags ?? []).map((tag) => ({ property: "article:tag", content: tag })),

        ...(product?.price ? [{ property: "product:price:amount", content: product.price }] : []),
        ...(product?.currency
            ? [{ property: "product:price:currency", content: product.currency }]
            : []),
        ...(product?.availability
            ? [{ property: "product:availability", content: product.availability }]
            : []),

        ...(siteConfig.verification.google
            ? [{ name: "google-site-verification", content: siteConfig.verification.google }]
            : []),
        ...(siteConfig.verification.bing
            ? [{ name: "msvalidate.01", content: siteConfig.verification.bing }]
            : []),
    ];

    const finalStructuredData = structuredData ?? generateDefaultStructuredData(config);
    if (finalStructuredData) {
        meta.push({
            type: "application/ld+json",
            children: JSON.stringify(finalStructuredData),
        });
    }

    return meta;
}

function generateDefaultStructuredData(config: PageMetadata) {
    const { type, title, description, image, article, product } = config;
    const baseData = { "@context": "https://schema.org" };

    if (type === "website" || !type) {
        return {
            ...baseData,
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            publisher: {
                "@type": "Organization",
                name: siteConfig.organization.name,
                logo: { "@type": "ImageObject", url: siteConfig.organization.logo },
            },
        };
    }

    if (type === "article" && article) {
        return {
            ...baseData,
            "@type": "Article",
            headline: title,
            description,
            image,
            datePublished: article.publishedTime,
            dateModified: article.modifiedTime ?? article.publishedTime,
            author: { "@type": "Person", name: article.author ?? siteConfig.organization.name },
            publisher: {
                "@type": "Organization",
                name: siteConfig.organization.name,
                logo: { "@type": "ImageObject", url: siteConfig.organization.logo },
            },
        };
    }

    if (type === "product" && product) {
        return {
            ...baseData,
            "@type": "Product",
            name: title,
            description,
            image,
            brand: { "@type": "Brand", name: product.brand ?? siteConfig.organization.name },
            offers: {
                "@type": "Offer",
                price: product.price,
                priceCurrency: product.currency ?? "USD",
                availability:
                    product.availability === "in stock"
                        ? "https://schema.org/InStock"
                        : "https://schema.org/OutOfStock",
            },
        };
    }

    return null;
}
