import { useEffect } from "react";
import { siteConfig } from "./siteConfig";

export function GlobalSEO() {
    return (
        <>
            <link rel="icon" href="/favicon.ico" sizes="any" />
            <link rel="icon" href="/icon.svg" type="image/svg+xml" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
            <Analytics />
        </>
    );
}

function Analytics() {
    useEffect(() => {
        if (siteConfig.analytics.googleAnalyticsId) {
            const script1 = document.createElement("script");
            script1.async = true;
            script1.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.analytics.googleAnalyticsId}`;
            document.head.appendChild(script1);

            const script2 = document.createElement("script");
            script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteConfig.analytics.googleAnalyticsId}');
      `;
            document.head.appendChild(script2);
        }

        if (siteConfig.analytics.plausibleDomain) {
            const script = document.createElement("script");
            script.defer = true;
            script.setAttribute("data-domain", siteConfig.analytics.plausibleDomain);
            script.src = "https://plausible.io/js/script.js";
            document.head.appendChild(script);
        }
    }, []);

    return null;
}

export function Breadcrumbs({ items }: { items: Array<{ name: string; url: string }> }) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url.startsWith("http") ? item.url : `${siteConfig.url}${item.url}`,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
                {items.map((item, index) => (
                    <span key={item.url} className="flex items-center">
                        {index > 0 && <span className="mx-2">/</span>}
                        {index === items.length - 1 ? (
                            <span className="font-semibold">{item.name}</span>
                        ) : (
                            <a href={item.url} className="hover:underline">
                                {item.name}
                            </a>
                        )}
                    </span>
                ))}
            </nav>
        </>
    );
}

export function FAQStructuredData({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}

export function OrganizationStructuredData() {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.organization.name,
        url: siteConfig.organization.url,
        logo: siteConfig.organization.logo,
        sameAs: siteConfig.organization.sameAs,
        contactPoint: {
            "@type": "ContactPoint",
            email: siteConfig.contact.email,
            contactType: "Customer Support",
            url: siteConfig.contact.supportUrl,
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}

export function ReviewStructuredData({
    itemName,
    ratingValue,
    reviewCount,
    bestRating = 5,
}: {
    itemName: string;
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
}) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: itemName,
        aggregateRating: { "@type": "AggregateRating", ratingValue, reviewCount, bestRating },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}

export function VideoStructuredData({
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
}: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;
    contentUrl: string;
}) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name,
        description,
        thumbnailUrl,
        uploadDate,
        contentUrl,
        ...(duration && { duration }),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}
