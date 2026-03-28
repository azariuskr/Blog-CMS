import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ArrowLeft, Lock } from "lucide-react";
import { usePostByPreviewToken } from "@/lib/blog/queries";
import { siteConfig } from "@/lib/seo/siteConfig";
import { ThrottledImage } from "@/components/shared/ThrottledImage";
import { MermaidBlock } from "@/components/blog/MermaidBlock";
import { ShikiCodeBlock } from "@/components/blog/ShikiCodeBlock";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(blog)/preview/$token")({
	component: PreviewPage,
});

type BlogBlock = {
	id: string;
	type: string;
	content: string;
	meta?: Record<string, unknown>;
	props?: Record<string, unknown>;
};

function PostBlocksRenderer({ blocks }: { blocks: BlogBlock[] }) {
	return (
		<>
			{blocks.map((block) => {
				const attrs = block.props ?? block.meta ?? {};

				if (block.type === "h1") {
					const id = block.content.toLowerCase().replace(/[^a-z0-9]+/g, "-");
					return <h1 key={block.id} id={id} className="text-3xl font-bold text-white mt-10 mb-5 scroll-mt-24">{block.content}</h1>;
				}
				if (block.type === "h2") {
					const id = block.content.toLowerCase().replace(/[^a-z0-9]+/g, "-");
					return <h2 key={block.id} id={id} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-prussian-blue scroll-mt-24">{block.content}</h2>;
				}
				if (block.type === "h3") {
					const id = block.content.toLowerCase().replace(/[^a-z0-9]+/g, "-");
					return <h3 key={block.id} id={id} className="text-xl font-semibold text-white mt-6 mb-3 scroll-mt-24">{block.content}</h3>;
				}
				if (block.type === "h4") {
					return <h4 key={block.id} className="text-lg font-semibold text-white mt-5 mb-2">{block.content}</h4>;
				}
				if (block.type === "heading") {
					const levelRaw = Number(attrs.level ?? 2);
					const level = Number.isFinite(levelRaw) ? Math.min(Math.max(levelRaw, 1), 3) : 2;
					const id = block.content.toLowerCase().replace(/[^a-z0-9]+/g, "-");
					if (level === 1) return <h1 key={block.id} id={id} className="text-3xl font-bold text-white mt-10 mb-5 scroll-mt-24">{block.content}</h1>;
					if (level === 2) return <h2 key={block.id} id={id} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-prussian-blue scroll-mt-24">{block.content}</h2>;
					return <h3 key={block.id} id={id} className="text-xl font-semibold text-white mt-6 mb-3 scroll-mt-24">{block.content}</h3>;
				}
				if (block.type === "paragraph") {
					return <p key={block.id} className="text-shadow-blue leading-relaxed mb-4">{block.content}</p>;
				}
				if (block.type === "blockquote" || block.type === "quote") {
					return (
						<blockquote key={block.id} className="border-l-4 border-carolina-blue pl-4 italic text-wild-blue-yonder my-6">
							{block.content}
						</blockquote>
					);
				}
				if (block.type === "code") {
					const lang = String(attrs.language ?? attrs.lang ?? "text");
					return <ShikiCodeBlock key={block.id} code={block.content} lang={lang} />;
				}
				if (block.type === "diagram") {
					return <MermaidBlock key={block.id} code={block.content} id={block.id} />;
				}
				if (block.type === "ul" || block.type === "ol" || block.type === "list" || block.type === "task-list") {
					const items = block.content.split("\n").filter(Boolean);
					const Tag = block.type === "ol" ? "ol" : "ul";
					return (
						<Tag key={block.id} className={`my-4 pl-6 space-y-1 ${block.type === "ol" ? "list-decimal" : "list-disc"} text-shadow-blue`}>
							{items.map((item, i) => <li key={i}>{item.replace(/^\[[ x]\]\s*/, "")}</li>)}
						</Tag>
					);
				}
				if (block.type === "separator" || block.type === "divider") {
					return <hr key={block.id} className="my-8 border-prussian-blue" />;
				}
				if (block.type === "image") {
					const src = attrs.src as string ?? block.content;
					const alt = attrs.alt as string ?? "";
					if (!src) return null;
					return (
						<figure key={block.id} className="my-6">
							<ThrottledImage src={src} alt={alt} className="rounded-xl w-full object-cover max-h-96" />
							{alt && <figcaption className="text-center text-xs text-slate-gray mt-2">{alt}</figcaption>}
						</figure>
					);
				}
				if (block.type === "alert") {
					const variant = String(attrs.variant ?? "info");
					const colorMap: Record<string, string> = {
						info: "border-carolina-blue/40 bg-carolina-blue/10 text-carolina-blue",
						warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
						error: "border-red-500/40 bg-red-500/10 text-red-300",
						success: "border-green-500/40 bg-green-500/10 text-green-300",
					};
					return (
						<div key={block.id} className={`my-4 rounded-lg border px-4 py-3 text-sm ${colorMap[variant] ?? colorMap.info}`}>
							{block.content}
						</div>
					);
				}
				// Fallback — render as paragraph
				return <p key={block.id} className="text-shadow-blue leading-relaxed mb-4">{block.content}</p>;
			})}
		</>
	);
}

function PreviewPage() {
	const { token } = Route.useParams();
	const query = usePostByPreviewToken(token);

	if (query.isLoading) {
		return (
			<div className="min-h-screen bg-oxford-blue-2 flex items-center justify-center">
				<div className="animate-pulse text-wild-blue-yonder">Loading preview…</div>
			</div>
		);
	}

	if (!query.data?.ok || !query.data.data) {
		return (
			<div className="min-h-screen bg-oxford-blue-2 flex flex-col items-center justify-center gap-4 px-4 text-center">
				<Lock className="h-10 w-10 text-prussian-blue-dark" />
				<h1 className="text-xl font-bold text-alice-blue">Preview not found</h1>
				<p className="text-sm text-slate-gray max-w-sm">This preview link may have expired or been revoked.</p>
				<Link to={ROUTES.HOME} className="text-carolina-blue hover:underline text-sm">← Go home</Link>
			</div>
		);
	}

	const post = query.data.data as any;
	const rawBlocks = (post.blocks ?? []) as BlogBlock[];
	const blocks =
		rawBlocks.length > 0
			? rawBlocks
			: String(post.content ?? "")
					.split(/\n\n+/)
					.filter(Boolean)
					.map((chunk: string, i: number) => ({ id: `legacy-${i}`, type: "paragraph" as const, content: chunk }));

	const postUrl = `${siteConfig.url}/${post.slug}`;

	return (
		<div className="min-h-screen bg-oxford-blue-2 text-shadow-blue">
			{/* Preview banner */}
			<div className="sticky top-0 z-50 bg-carolina-blue/10 border-b border-carolina-blue/30 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 text-xs text-carolina-blue font-medium">
					<Eye className="h-3.5 w-3.5" />
					<span>Preview — this post is not yet published</span>
				</div>
				<Link to={ROUTES.HOME} className="flex items-center gap-1 text-xs text-wild-blue-yonder hover:text-carolina-blue transition-colors">
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to blog
				</Link>
			</div>

			<article className="max-w-3xl mx-auto px-4 py-12">
				{/* Category */}
				{post.category?.name && (
					<p className="text-xs font-semibold uppercase tracking-widest text-carolina-blue mb-4">{post.category.name}</p>
				)}

				{/* Title */}
				<h1 className="text-4xl font-extrabold text-alice-blue leading-tight mb-4">{post.title}</h1>

				{/* Excerpt */}
				{post.excerpt && (
					<p className="text-lg text-wild-blue-yonder leading-relaxed mb-6">{post.excerpt}</p>
				)}

				{/* Author + meta */}
				<div className="flex items-center gap-3 mb-8 pb-8 border-b border-prussian-blue">
					<div className="h-9 w-9 rounded-full bg-prussian-blue flex items-center justify-center text-sm font-bold text-alice-blue flex-shrink-0">
						{post.author?.name?.[0]?.toUpperCase() ?? "?"}
					</div>
					<div>
						<p className="text-sm font-medium text-alice-blue">{post.author?.name ?? "Unknown"}</p>
						<p className="text-xs text-slate-gray">
							Draft · {post.readTimeMinutes ? `${post.readTimeMinutes} min read` : ""}
						</p>
					</div>
				</div>

				{/* Featured image */}
				{post.featuredImageUrl && (
					<figure className="mb-8 rounded-2xl overflow-hidden">
						<ThrottledImage
							src={post.featuredImageUrl}
							alt={post.title}
							className="w-full object-cover max-h-96"
						/>
					</figure>
				)}

				{/* Content */}
				<div className="prose-blog">
					<PostBlocksRenderer blocks={blocks} />
				</div>

				{/* Draft notice */}
				<div className="mt-12 p-4 rounded-xl border border-carolina-blue/30 bg-carolina-blue/5 text-center">
					<p className="text-xs text-wild-blue-yonder">
						This is a draft preview. When published, it will be available at{" "}
						<span className="font-mono text-carolina-blue">{postUrl}</span>
					</p>
				</div>
			</article>
		</div>
	);
}
