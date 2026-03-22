/**
 * Puck CMS component configuration.
 * Defines the page-builder components available in the site editor.
 */
"use client";

import type { Config } from "@measured/puck";

// ---------------------------------------------------------------------------
// Component prop types
// ---------------------------------------------------------------------------

export type HeroSectionProps = {
	headline: string;
	subheadline: string;
	ctaText: string;
	ctaHref: string;
	secondaryCtaText?: string;
	secondaryCtaHref?: string;
	backgroundStyle: "gradient" | "solid" | "image";
	backgroundValue: string;
	alignment: "left" | "center";
};

export type FeatureGridProps = {
	heading: string;
	subheading?: string;
	columns: 2 | 3 | 4;
	items: Array<{ icon: string; title: string; description: string }>;
};

export type CTASectionProps = {
	headline: string;
	body: string;
	ctaText: string;
	ctaHref: string;
	variant: "gradient" | "card" | "minimal";
};

export type TextBlockProps = {
	content: string;
	alignment: "left" | "center" | "right";
	size: "sm" | "md" | "lg";
	maxWidth: "prose" | "wide" | "full";
};

export type ImageBlockProps = {
	src: string;
	alt: string;
	caption?: string;
	aspectRatio: "auto" | "16/9" | "4/3" | "1/1";
	rounded: boolean;
	shadow: boolean;
};

export type TestimonialsSectionProps = {
	heading: string;
	items: Array<{ quote: string; author: string; role: string; avatarUrl?: string }>;
	layout: "grid" | "carousel";
};

export type NewsletterSignupProps = {
	heading: string;
	subheading?: string;
	buttonText: string;
	placeholder: string;
	variant: "inline" | "card";
};

export type DividerProps = {
	style: "line" | "dots" | "gradient" | "spacer";
	spacing: "sm" | "md" | "lg";
};

// ---------------------------------------------------------------------------
// Component: HeroSection
// ---------------------------------------------------------------------------

function HeroSection({
	headline,
	subheadline,
	ctaText,
	ctaHref,
	secondaryCtaText,
	secondaryCtaHref,
	alignment,
}: HeroSectionProps) {
	const isCenter = alignment === "center";
	return (
		<section
			className={`navy-blue-blog-section relative overflow-hidden bg-oxford-blue-2 ${isCenter ? "text-center" : "text-left"}`}
		>
			<div className="container mx-auto px-4 max-w-5xl">
				<h1 className="headline-1 text-alice-blue mb-6">{headline}</h1>
				{subheadline && (
					<p className="text-lg text-shadow-blue mb-8 max-w-2xl mx-auto">{subheadline}</p>
				)}
				<div className={`flex gap-4 flex-wrap ${isCenter ? "justify-center" : ""}`}>
					{ctaText && ctaHref && (
						<a
							href={ctaHref}
							className="navy-blue-blog-btn px-8 py-3 rounded-xl text-sm font-semibold inline-block"
						>
							{ctaText}
						</a>
					)}
					{secondaryCtaText && secondaryCtaHref && (
						<a
							href={secondaryCtaHref}
							className="px-8 py-3 rounded-xl text-sm font-semibold border border-prussian-blue text-wild-blue-yonder hover:border-carolina-blue hover:text-carolina-blue transition-colors inline-block"
						>
							{secondaryCtaText}
						</a>
					)}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Component: FeatureGrid
// ---------------------------------------------------------------------------

const COLUMN_CLASSES: Record<number, string> = {
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

function FeatureGrid({ heading, subheading, columns, items }: FeatureGridProps) {
	return (
		<section className="navy-blue-blog-section bg-oxford-blue-2">
			<div className="container mx-auto px-4 max-w-6xl">
				<div className="text-center mb-12">
					<h2 className="headline-2 text-alice-blue">{heading}</h2>
					{subheading && <p className="text-shadow-blue mt-3">{subheading}</p>}
				</div>
				<div className={`grid ${COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[3]} gap-6`}>
					{items.map((item, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							key={i}
							className="navy-blue-blog-card p-6 hover:border-carolina-blue/30 transition-colors"
						>
							{item.icon && (
								<span className="text-3xl block mb-3">{item.icon}</span>
							)}
							<h3 className="text-alice-blue font-semibold mb-2">{item.title}</h3>
							<p className="text-shadow-blue text-sm leading-relaxed">{item.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Component: CTASection
// ---------------------------------------------------------------------------

function CTASection({ headline, body, ctaText, ctaHref, variant }: CTASectionProps) {
	const wrapClass =
		variant === "gradient"
			? "bg-gradient-to-r from-carolina-blue to-blog-teal"
			: variant === "card"
				? "navy-blue-blog-card border border-prussian-blue"
				: "border-t border-prussian-blue";

	return (
		<section className={`navy-blue-blog-section ${wrapClass}`}>
			<div className="container mx-auto px-4 max-w-3xl text-center">
				<h2 className={`headline-2 mb-4 ${variant === "gradient" ? "text-white" : "text-alice-blue"}`}>
					{headline}
				</h2>
				{body && (
					<p className={`mb-8 ${variant === "gradient" ? "text-white/80" : "text-shadow-blue"}`}>
						{body}
					</p>
				)}
				{ctaText && ctaHref && (
					<a
						href={ctaHref}
						className={`navy-blue-blog-btn px-10 py-3 rounded-xl font-semibold inline-block ${variant === "gradient" ? "bg-white text-oxford-blue-2 bg-none" : ""}`}
					>
						{ctaText}
					</a>
				)}
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Component: TextBlock
// ---------------------------------------------------------------------------

const SIZE_CLASS = { sm: "text-sm", md: "text-base", lg: "text-lg" };
const ALIGN_CLASS = { left: "text-left", center: "text-center", right: "text-right" };
const MAX_WIDTH_CLASS = { prose: "max-w-prose mx-auto", wide: "max-w-4xl mx-auto", full: "w-full" };

function TextBlock({ content, alignment, size, maxWidth }: TextBlockProps) {
	return (
		<div className={`py-8 px-4 ${ALIGN_CLASS[alignment]}`}>
			<div
				className={`${MAX_WIDTH_CLASS[maxWidth]} ${SIZE_CLASS[size]} text-shadow-blue leading-relaxed`}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: authored content
				dangerouslySetInnerHTML={{ __html: content }}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Component: ImageBlock
// ---------------------------------------------------------------------------

const ASPECT_CLASS: Record<string, string> = {
	auto: "",
	"16/9": "aspect-video",
	"4/3": "aspect-[4/3]",
	"1/1": "aspect-square",
};

function ImageBlock({ src, alt, caption, aspectRatio, rounded, shadow }: ImageBlockProps) {
	if (!src) return null;
	return (
		<figure className="my-8 px-4">
			<div
				className={`overflow-hidden ${ASPECT_CLASS[aspectRatio] ?? ""} ${rounded ? "rounded-2xl" : ""} ${shadow ? "shadow-xl" : ""}`}
			>
				<img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
			</div>
			{caption && (
				<figcaption className="text-center text-sm text-slate-gray mt-3 italic">{caption}</figcaption>
			)}
		</figure>
	);
}

// ---------------------------------------------------------------------------
// Component: TestimonialsSection
// ---------------------------------------------------------------------------

function TestimonialsSection({ heading, items, layout }: TestimonialsSectionProps) {
	return (
		<section className="navy-blue-blog-section bg-oxford-blue-2">
			<div className="container mx-auto px-4 max-w-6xl">
				<h2 className="headline-2 text-alice-blue text-center mb-12">{heading}</h2>
				<div className={layout === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
					{items.map((item, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							key={i}
							className="navy-blue-blog-card p-6"
						>
							<p className="text-shadow-blue italic mb-4">"{item.quote}"</p>
							<div className="flex items-center gap-3">
								{item.avatarUrl && (
									<img
										src={item.avatarUrl}
										alt={item.author}
										className="w-10 h-10 rounded-full object-cover"
									/>
								)}
								<div>
									<p className="text-alice-blue font-semibold text-sm">{item.author}</p>
									{item.role && <p className="text-slate-gray text-xs">{item.role}</p>}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Component: NewsletterSignup
// ---------------------------------------------------------------------------

function NewsletterSignup({ heading, subheading, buttonText, placeholder, variant }: NewsletterSignupProps) {
	const wrap = variant === "card" ? "navy-blue-blog-card border border-prussian-blue p-8 max-w-xl mx-auto" : "py-8 px-4 max-w-xl mx-auto";
	return (
		<section className="navy-blue-blog-section">
			<div className="container mx-auto px-4">
				<div className={`${wrap} text-center`}>
					<h2 className="headline-2 text-alice-blue mb-3">{heading}</h2>
					{subheading && <p className="text-shadow-blue mb-6">{subheading}</p>}
					<form className="flex gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
						<input
							type="email"
							placeholder={placeholder}
							className="flex-1 px-4 py-2.5 rounded-xl bg-oxford-blue border border-prussian-blue text-alice-blue placeholder:text-slate-gray outline-none focus:border-carolina-blue text-sm"
						/>
						<button
							type="submit"
							className="navy-blue-blog-btn px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
						>
							{buttonText}
						</button>
					</form>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Component: Divider
// ---------------------------------------------------------------------------

function Divider({ style, spacing }: DividerProps) {
	const py = { sm: "py-4", md: "py-8", lg: "py-16" }[spacing];
	if (style === "spacer") return <div className={py} />;
	return (
		<div className={`${py} px-4`}>
			{style === "line" && <hr className="border-prussian-blue" />}
			{style === "gradient" && (
				<div className="h-px bg-gradient-to-r from-transparent via-carolina-blue to-transparent" />
			)}
			{style === "dots" && (
				<div className="flex justify-center gap-2">
					{[0, 1, 2].map((i) => (
						<span key={i} className="w-1.5 h-1.5 rounded-full bg-prussian-blue" />
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Puck Config
// ---------------------------------------------------------------------------

export const puckConfig: Config = {
	components: {
		HeroSection: {
			label: "Hero Section",
			fields: {
				headline: { type: "text", label: "Headline" },
				subheadline: { type: "textarea", label: "Subheadline" },
				ctaText: { type: "text", label: "CTA Button Text" },
				ctaHref: { type: "text", label: "CTA URL" },
				secondaryCtaText: { type: "text", label: "Secondary CTA Text (optional)" },
				secondaryCtaHref: { type: "text", label: "Secondary CTA URL (optional)" },
				backgroundStyle: {
					type: "select",
					label: "Background Style",
					options: [
						{ label: "Gradient", value: "gradient" },
						{ label: "Solid", value: "solid" },
						{ label: "Image", value: "image" },
					],
				},
				backgroundValue: { type: "text", label: "Background Value (color/url)" },
				alignment: {
					type: "select",
					label: "Alignment",
					options: [
						{ label: "Left", value: "left" },
						{ label: "Center", value: "center" },
					],
				},
			},
			defaultProps: {
				headline: "Welcome to Your Site",
				subheadline: "A short description of what you do.",
				ctaText: "Get Started",
				ctaHref: "#",
				secondaryCtaText: "",
				secondaryCtaHref: "",
				backgroundStyle: "solid",
				backgroundValue: "",
				alignment: "center",
			},
			render: HeroSection as any,
		},

		FeatureGrid: {
			label: "Feature Grid",
			fields: {
				heading: { type: "text", label: "Section Heading" },
				subheading: { type: "text", label: "Subheading (optional)" },
				columns: {
					type: "select",
					label: "Columns",
					options: [
						{ label: "2", value: 2 },
						{ label: "3", value: 3 },
						{ label: "4", value: 4 },
					],
				},
				items: {
					type: "array",
					label: "Features",
					arrayFields: {
						icon: { type: "text", label: "Icon (emoji)" },
						title: { type: "text", label: "Title" },
						description: { type: "textarea", label: "Description" },
					},
					defaultItemProps: { icon: "✦", title: "Feature", description: "" },
				},
			},
			defaultProps: {
				heading: "Features",
				subheading: "",
				columns: 3,
				items: [
					{ icon: "✦", title: "Feature One", description: "Description here." },
					{ icon: "⚡", title: "Feature Two", description: "Description here." },
					{ icon: "🛡️", title: "Feature Three", description: "Description here." },
				],
			},
			render: FeatureGrid as any,
		},

		CTASection: {
			label: "CTA Section",
			fields: {
				headline: { type: "text", label: "Headline" },
				body: { type: "textarea", label: "Body Text" },
				ctaText: { type: "text", label: "Button Text" },
				ctaHref: { type: "text", label: "Button URL" },
				variant: {
					type: "select",
					label: "Variant",
					options: [
						{ label: "Gradient", value: "gradient" },
						{ label: "Card", value: "card" },
						{ label: "Minimal", value: "minimal" },
					],
				},
			},
			defaultProps: {
				headline: "Ready to get started?",
				body: "Join thousands of users today.",
				ctaText: "Sign Up Free",
				ctaHref: "#",
				variant: "gradient",
			},
			render: CTASection as any,
		},

		TextBlock: {
			label: "Text Block",
			fields: {
				content: { type: "textarea", label: "Content (HTML supported)" },
				alignment: {
					type: "select",
					label: "Text Alignment",
					options: [
						{ label: "Left", value: "left" },
						{ label: "Center", value: "center" },
						{ label: "Right", value: "right" },
					],
				},
				size: {
					type: "select",
					label: "Font Size",
					options: [
						{ label: "Small", value: "sm" },
						{ label: "Medium", value: "md" },
						{ label: "Large", value: "lg" },
					],
				},
				maxWidth: {
					type: "select",
					label: "Max Width",
					options: [
						{ label: "Prose (65ch)", value: "prose" },
						{ label: "Wide", value: "wide" },
						{ label: "Full", value: "full" },
					],
				},
			},
			defaultProps: {
				content: "<p>Write your content here.</p>",
				alignment: "left",
				size: "md",
				maxWidth: "prose",
			},
			render: TextBlock as any,
		},

		ImageBlock: {
			label: "Image",
			fields: {
				src: { type: "text", label: "Image URL" },
				alt: { type: "text", label: "Alt Text" },
				caption: { type: "text", label: "Caption (optional)" },
				aspectRatio: {
					type: "select",
					label: "Aspect Ratio",
					options: [
						{ label: "Auto", value: "auto" },
						{ label: "16:9", value: "16/9" },
						{ label: "4:3", value: "4/3" },
						{ label: "Square", value: "1/1" },
					],
				},
				rounded: { type: "radio", label: "Rounded Corners", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
				shadow: { type: "radio", label: "Drop Shadow", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
			},
			defaultProps: {
				src: "",
				alt: "",
				caption: "",
				aspectRatio: "16/9",
				rounded: true,
				shadow: false,
			},
			render: ImageBlock as any,
		},

		TestimonialsSection: {
			label: "Testimonials",
			fields: {
				heading: { type: "text", label: "Section Heading" },
				layout: {
					type: "select",
					label: "Layout",
					options: [
						{ label: "Grid", value: "grid" },
						{ label: "Stack", value: "carousel" },
					],
				},
				items: {
					type: "array",
					label: "Testimonials",
					arrayFields: {
						quote: { type: "textarea", label: "Quote" },
						author: { type: "text", label: "Author Name" },
						role: { type: "text", label: "Role / Company" },
						avatarUrl: { type: "text", label: "Avatar URL (optional)" },
					},
					defaultItemProps: { quote: "Great product!", author: "Jane Doe", role: "CEO", avatarUrl: "" },
				},
			},
			defaultProps: {
				heading: "What people say",
				layout: "grid",
				items: [
					{ quote: "This changed how I work.", author: "Alex J.", role: "Developer", avatarUrl: "" },
					{ quote: "Incredible platform.", author: "Sam L.", role: "Designer", avatarUrl: "" },
				],
			},
			render: TestimonialsSection as any,
		},

		NewsletterSignup: {
			label: "Newsletter Signup",
			fields: {
				heading: { type: "text", label: "Heading" },
				subheading: { type: "text", label: "Subheading (optional)" },
				buttonText: { type: "text", label: "Button Text" },
				placeholder: { type: "text", label: "Input Placeholder" },
				variant: {
					type: "select",
					label: "Variant",
					options: [
						{ label: "Inline", value: "inline" },
						{ label: "Card", value: "card" },
					],
				},
			},
			defaultProps: {
				heading: "Stay in the loop",
				subheading: "Get the latest posts delivered to your inbox.",
				buttonText: "Subscribe",
				placeholder: "your@email.com",
				variant: "inline",
			},
			render: NewsletterSignup as any,
		},

		Divider: {
			label: "Divider / Spacer",
			fields: {
				style: {
					type: "select",
					label: "Style",
					options: [
						{ label: "Line", value: "line" },
						{ label: "Gradient Line", value: "gradient" },
						{ label: "Dots", value: "dots" },
						{ label: "Spacer (invisible)", value: "spacer" },
					],
				},
				spacing: {
					type: "select",
					label: "Spacing",
					options: [
						{ label: "Small", value: "sm" },
						{ label: "Medium", value: "md" },
						{ label: "Large", value: "lg" },
					],
				},
			},
			defaultProps: { style: "line", spacing: "md" },
			render: Divider as any,
		},
	},

	root: {
		fields: {
			title: { type: "text", label: "Page Title" },
		},
		defaultProps: { title: "" },
		render: ({ children }: any) => <>{children}</>,
	},
};
