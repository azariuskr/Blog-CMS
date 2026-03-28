import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Calendar,
	Clock,
	Eye,
	Heart,
	MessageCircle,
	Share2,
	Bookmark,
	ChevronLeft,
	Send,
	ThumbsUp,
	List,
	ChevronUp,
	Copy,
	Twitter,
	Linkedin,
	Check,
} from "lucide-react";
import { toast } from "sonner";
import { usePostBySlug, usePublishedPosts, usePublicComments, useCreateComment, useToggleReaction, useAddToReadingList, useMyReadingLists, useUserPostReaction, usePostBookmarkStatus, useRemoveFromReadingList, postBySlugQueryOptions, publicCommentsQueryOptions } from "@/lib/blog/queries";
import { useQueryClient } from "@tanstack/react-query";
import { PaywallCard } from "@/components/blog/PaywallCard";
import { MemberCTA } from "@/components/blog/MemberCTA";
import { FreeReadsBanner } from "@/components/blog/FreeReadsBanner";
import { useSession } from "@/lib/auth/auth-client";
import { unwrap } from "@/lib/result";
import { siteConfig } from "@/lib/seo/siteConfig";
import { MermaidBlock } from "@/components/blog/MermaidBlock";
import { ShikiCodeBlock } from "@/components/blog/ShikiCodeBlock";
import { ThrottledImage } from "@/components/shared/ThrottledImage";

export const Route = createFileRoute("/(blog)/$slug")({
	loader: async ({ context, params }) => {
		await context.queryClient.prefetchQuery(postBySlugQueryOptions(params.slug));
		// Also prefetch comments so they render on first load without a loading state
		const postResult = context.queryClient.getQueryData(
			postBySlugQueryOptions(params.slug).queryKey,
		);
		const postId = postResult?.ok ? (postResult as any).data?.id : undefined;
		if (postId) {
			await context.queryClient.prefetchQuery(publicCommentsQueryOptions(postId));
		}
	},
	head: ({ loaderData: _l, params, ...ctx }) => {
		// Read cached post data for SSR meta — may be undefined during first render
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const queryClient = (ctx as any).context?.queryClient;
		const cachedResult = queryClient
			? queryClient.getQueryData(postBySlugQueryOptions(params.slug).queryKey)
			: undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const post = cachedResult?.ok ? (cachedResult as any).data : undefined;

		const title = post?.title ?? "Blog Post";
		const description = post?.excerpt ?? siteConfig.description;
		const image = post?.featuredImageUrl ?? siteConfig.ogImage;
		const imageUrl = image.startsWith("http") ? image : `${siteConfig.url}${image}`;
		const fullTitle = `${title} | ${siteConfig.name}`;
		const canonicalUrl = post?.canonicalUrl || `${siteConfig.url}/${params.slug}`;
		const authorName = post?.author?.name ?? siteConfig.organization.name;
		const publishedTime = post?.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
		const updatedTime = post?.updatedAt ? new Date(post.updatedAt).toISOString() : undefined;
		const tags: string[] = post?.tags?.map((t: { tag: { name: string } }) => t.tag.name) ?? [];

		return {
			meta: [
				{ title: fullTitle },
				{ name: "description", content: description },
				{ name: "robots", content: siteConfig.defaultRobots },
				{ rel: "canonical", href: canonicalUrl },

				{ property: "og:type", content: "article" },
				{ property: "og:site_name", content: siteConfig.name },
				{ property: "og:title", content: fullTitle },
				{ property: "og:description", content: description },
				{ property: "og:image", content: imageUrl },
				{ property: "og:image:alt", content: title },
				{ property: "og:url", content: canonicalUrl },
				{ property: "og:locale", content: siteConfig.locale },

				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:site", content: siteConfig.twitterHandle },
				{ name: "twitter:creator", content: siteConfig.twitterCreator },
				{ name: "twitter:title", content: fullTitle },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: imageUrl },

				...(publishedTime ? [{ property: "article:published_time", content: publishedTime }] : []),
				...(updatedTime ? [{ property: "article:modified_time", content: updatedTime }] : []),
				{ property: "article:author", content: authorName },
				...(post?.category?.name ? [{ property: "article:section", content: post.category.name }] : []),
				...tags.map((tag) => ({ property: "article:tag", content: tag })),
			],
		};
	},
	component: BlogPostPage,
});

type BlogBlock = {
	id: string;
	type: string; // supports both legacy (heading/quote/list/divider) and new editor types (h1-h4/blockquote/ul/ol/etc.)
	content: string;
	meta?: Record<string, unknown>; // legacy field
	props?: Record<string, unknown>; // new editor field (same as meta for rendering)
};


function formatDate(date: string | Date): string {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

function estimateReadTimeFromBlocks(blocks: BlogBlock[]): string {
	const words = blocks
		.map((b) => b.content)
		.join(" ")
		.split(/\s+/)
		.filter(Boolean).length;
	const minutes = Math.ceil(words / 200);
	return `${Math.max(minutes, 1)} min read`;
}

function extractHeadingsFromBlocks(
	blocks: BlogBlock[],
): Array<{ id: string; text: string; level: number }> {
	const HEADING_LEVEL: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4 };
	return blocks
		.filter((b) => b.type === "heading" || b.type in HEADING_LEVEL)
		.map((b) => {
			const text = b.content;
			let level: number;
			if (b.type in HEADING_LEVEL) {
				level = HEADING_LEVEL[b.type];
			} else {
				const levelRaw = Number((b.meta ?? b.props ?? {}).level ?? 2);
				level = Number.isFinite(levelRaw) ? Math.min(Math.max(levelRaw, 1), 4) : 2;
			}
			const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
			return { id, text, level };
		});
}

function PostBlocksRenderer({ blocks }: { blocks: BlogBlock[] }) {
	return (
		<>
			{blocks.map((block) => {
				// Merged props: new editor uses block.props, legacy uses block.meta
				const attrs = block.props ?? block.meta ?? {};

				// ── Headings (new: h1-h4 types; legacy: heading + meta.level) ──
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
				// Legacy heading
				if (block.type === "heading") {
					const levelRaw = Number(attrs.level ?? 2);
					const level = Number.isFinite(levelRaw) ? Math.min(Math.max(levelRaw, 1), 3) : 2;
					const id = block.content.toLowerCase().replace(/[^a-z0-9]+/g, "-");
					if (level === 1) return <h1 key={block.id} id={id} className="text-3xl font-bold text-white mt-10 mb-5 scroll-mt-24">{block.content}</h1>;
					if (level === 2) return <h2 key={block.id} id={id} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-prussian-blue scroll-mt-24">{block.content}</h2>;
					return <h3 key={block.id} id={id} className="text-xl font-semibold text-white mt-6 mb-3 scroll-mt-24">{block.content}</h3>;
				}

				// ── Paragraph ──
				if (block.type === "paragraph") {
					const isHtml = block.content?.trimStart().startsWith("<");
					return isHtml
						? <div key={block.id} className="tiptap-prose text-shadow-blue leading-relaxed text-lg mb-6 [&_a]:text-carolina-blue [&_a]:underline [&_code]:bg-prussian-blue [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_strong]:text-white [&_em]:italic" dangerouslySetInnerHTML={{ __html: block.content }} />
						: <p key={block.id} className="text-shadow-blue leading-relaxed text-lg mb-6">{block.content}</p>;
				}

				// ── Blockquote (new) / quote (legacy) ──
				if (block.type === "blockquote" || block.type === "quote") {
					return (
						<blockquote key={block.id} className="border-l-4 border-carolina-blue pl-6 py-3 my-6 bg-prussian-blue/30 rounded-r-xl">
							<p className="text-columbia-blue text-lg italic">{block.content}</p>
						</blockquote>
					);
				}

				// ── Alert ──
				if (block.type === "alert") {
					const v = String(attrs.variant ?? "info");
					const colors: Record<string, string> = {
						info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
						warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
						error: "bg-red-500/10 border-red-500/30 text-red-300",
						success: "bg-green-500/10 border-green-500/30 text-green-300",
					};
					return <div key={block.id} className={`rounded-xl border p-4 my-4 ${colors[v] ?? colors.info}`}>{block.content}</div>;
				}

				// ── Code ──
				if (block.type === "code") {
					const lang = String(attrs.language ?? attrs.lang ?? "plaintext");
					return <ShikiCodeBlock key={block.id} code={block.content} lang={lang} />;
				}

				// ── Lists (new: ul/ol/task-list; legacy: list) ──
				if (block.type === "ul" || block.type === "list") {
					const items = block.content.split("\n").map((i) => i.replace(/^-\s*/, "").trim()).filter(Boolean);
					return (
						<ul key={block.id} className="my-4 space-y-2 ml-4 list-none">
							{items.map((item, i) => (
								<li key={`${block.id}-${i}`} className="flex items-start gap-3 text-shadow-blue">
									<span className="w-2 h-2 rounded-full bg-gradient-to-r from-carolina-blue to-blog-teal mt-2.5 flex-shrink-0" />
									<span className="text-lg">{item}</span>
								</li>
							))}
						</ul>
					);
				}
				if (block.type === "ol") {
					const items = block.content.split("\n").map((i) => i.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
					return (
						<ol key={block.id} className="my-4 ml-6 list-decimal space-y-1 text-shadow-blue text-lg">
							{items.map((item, i) => <li key={`${block.id}-${i}`}>{item}</li>)}
						</ol>
					);
				}
				if (block.type === "task-list") {
					const items = block.content.split("\n").filter(Boolean);
					return (
						<ul key={block.id} className="my-4 space-y-2 ml-2 list-none">
							{items.map((item, i) => {
								const checked = /^\s*-\s*\[x\]/i.test(item);
								const text = item.replace(/^\s*-\s*\[.\]\s*/, "").trim();
								return (
									<li key={`${block.id}-${i}`} className="flex items-center gap-3 text-shadow-blue text-lg">
										<span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${checked ? "bg-carolina-blue border-carolina-blue text-white" : "border-prussian-blue-dark"}`}>
											{checked ? "✓" : ""}
										</span>
										<span className={checked ? "line-through opacity-60" : ""}>{text}</span>
									</li>
								);
							})}
						</ul>
					);
				}

				// ── Image ──
				if (block.type === "image") {
					const src = String(attrs.src ?? block.content ?? "");
					const alt = String(attrs.alt ?? "post image");
					const caption = String(attrs.caption ?? "");
					if (!src) return null;
					return (
						<figure key={block.id} className="my-8">
							<ThrottledImage
								src={src}
								alt={alt}
								className="w-full h-auto rounded-2xl shadow-2xl"
								placeholder={<div className="w-full aspect-video rounded-2xl bg-prussian-blue animate-pulse" />}
							/>
							{caption && <figcaption className="text-center text-sm text-yonder-dim mt-3 italic">{caption}</figcaption>}
						</figure>
					);
				}

				// ── Separator / divider ──
				if (block.type === "separator" || block.type === "divider") {
					return (
						<div key={block.id} className="my-10 flex items-center justify-center">
							<div className="w-1/4 h-px bg-gradient-to-r from-transparent via-carolina-blue to-transparent" />
							<div className="mx-4 w-2 h-2 rounded-full bg-carolina-blue" />
							<div className="w-1/4 h-px bg-gradient-to-r from-transparent via-blog-teal to-transparent" />
						</div>
					);
				}

				// ── Table ──
				if (block.type === "table") {
					const lines = block.content.split("\n").filter(Boolean);
					const rows = lines.map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
					const [header, , ...body] = rows;
					if (!header) return null;
					return (
						<div key={block.id} className="my-6 overflow-x-auto rounded-xl border border-prussian-blue">
							<table className="w-full text-sm text-shadow-blue">
								<thead className="bg-prussian-blue">
									<tr>{header.map((h, i) => <th key={i} className="px-4 py-2 text-left text-white font-medium">{h}</th>)}</tr>
								</thead>
								<tbody>
									{body.map((row, ri) => (
										<tr key={ri} className="border-t border-prussian-blue hover:bg-prussian-blue/30">
											{row.map((cell, ci) => <td key={ci} className="px-4 py-2">{cell}</td>)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					);
				}

				if (block.type === "diagram") {
					return <MermaidBlock key={block.id} id={block.id} code={block.content} />;
				}

				return null;
			})}
		</>
	);
}

function BlogPostPage() {
	const { slug } = Route.useParams();
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const [commentText, setCommentText] = useState("");
	const [showListPicker, setShowListPicker] = useState(false);
	const listPickerRef = useRef<HTMLDivElement>(null);
	const [readingProgress, setReadingProgress] = useState(0);
	const [showToc, setShowToc] = useState(false);
	const [showBackToTop, setShowBackToTop] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const postQuery = usePostBySlug(slug);
	const toggleReaction = useToggleReaction();
	const addToReadingList = useAddToReadingList();
	const removeFromReadingList = useRemoveFromReadingList();
	const readingListsQuery = useMyReadingLists();
	const myLists = readingListsQuery.data?.ok ? (readingListsQuery.data.data as any[]) : [];
	const queryClient = useQueryClient();
	const createComment = useCreateComment();
	const resolvedPostForCategory = postQuery.data?.ok ? (postQuery.data as any).data : null;
	const relatedPostsQuery = usePublishedPosts({
		categorySlug: resolvedPostForCategory?.category?.slug ?? undefined,
		limit: 3,
	});
	const authorPostsQuery = usePublishedPosts({
		authorId: resolvedPostForCategory?.author?.id ?? undefined,
		limit: 4,
	});


	const fallbackPostBySlug: Record<string, { title: string; excerpt: string; categoryName: string; authorName: string; createdAt: string; viewCount: number; featuredImageUrl?: string; blocks: BlogBlock[] }> = {
		"getting-started-tanstack-start": {
			title: "Getting Started with TanStack Start",
			excerpt: "A comprehensive guide to building SSR apps with TanStack Start framework.",
			categoryName: "Development",
			authorName: "Mike Wilson",
			createdAt: "2026-01-20",
			viewCount: 1234,
			featuredImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
			blocks: [
				{ id: "h1", type: "heading", content: "Getting Started with TanStack Start", meta: { level: 1 } },
				{ id: "p1", type: "paragraph", content: "TanStack Start gives you an opinionated setup for modern full-stack React apps." },
				{ id: "h2", type: "heading", content: "Why it matters", meta: { level: 2 } },
				{ id: "l1", type: "list", content: "Fast routing\nData-first patterns\nGreat DX" },
			],
		},
	};

	const resolvedPost = postQuery.data?.ok ? unwrap(postQuery.data) as any : null;
	const fallbackPost = fallbackPostBySlug[slug];
	const post = resolvedPost
		?? (fallbackPost
			? {
				id: slug,
				slug,
				title: fallbackPost.title,
				excerpt: fallbackPost.excerpt,
				createdAt: fallbackPost.createdAt,
				viewCount: fallbackPost.viewCount,
				featuredImageUrl: fallbackPost.featuredImageUrl,
				content: fallbackPost.blocks.map((b) => b.content).join("\n\n"),
				blocks: fallbackPost.blocks,
				author: { name: fallbackPost.authorName },
				category: { name: fallbackPost.categoryName },
			}
			: null);
	const reactionQuery = useUserPostReaction(post?.id);
	const bookmarkQuery = usePostBookmarkStatus(post?.id);
	const isLiked = (reactionQuery.data as any)?.ok ? !!(reactionQuery.data as any).data?.liked : false;
	const isBookmarked = (bookmarkQuery.data as any)?.ok ? !!(bookmarkQuery.data as any).data?.bookmarked : false;
	const bookmarkedListId = (bookmarkQuery.data as any)?.ok ? ((bookmarkQuery.data as any).data?.listId ?? null) : null;

	const relatedPosts = relatedPostsQuery.data?.ok ? relatedPostsQuery.data.data.items.filter((p: any) => p.id !== post?.id) : [];
	const moreByAuthor = authorPostsQuery.data?.ok ? authorPostsQuery.data.data.items.filter((p: any) => p.id !== post?.id).slice(0, 3) : [];
	const rawBlocks = (post?.blocks ?? []) as BlogBlock[];
	const blocks =
		rawBlocks.length > 0
			? rawBlocks
			: String(post?.content ?? "")
					// Strip YAML frontmatter so it never renders as plain text
					.replace(/^---[\s\S]*?---\s*\n?/, "")
					.split(/\n\n+/)
					.map((chunk, _i) => chunk.trim())
					.filter(Boolean)
					.map((chunk, i) => ({
						id: `legacy-${i}`,
						type: "paragraph" as const,
						content: chunk,
					}));
	const headings = useMemo(() => extractHeadingsFromBlocks(blocks), [blocks]);

	const commentsQuery = usePublicComments(post?.id ?? "");
	const realComments = commentsQuery.data?.ok ? commentsQuery.data.data : [];
	const [replyToId, setReplyToId] = useState<string | null>(null);
	const [replyText, setReplyText] = useState("");

	// Build threaded structure: top-level comments + their replies
	const topLevelComments = useMemo(
		() => realComments.filter((c: any) => !c.parentId),
		[realComments],
	);
	const repliesByParent = useMemo(() => {
		const map: Record<string, typeof realComments> = {};
		for (const c of realComments) {
			if ((c as any).parentId) {
				const pid = (c as any).parentId as string;
				map[pid] = map[pid] ?? [];
				map[pid].push(c);
			}
		}
		return map;
	}, [realComments]);

	const handleReply = async (parentId: string) => {
		if (!replyText.trim()) return;
		if (!userId) { toast.error("You must be logged in to reply"); return; }
		if (!post) return;
		await createComment.mutateAsync({ postId: post.id, authorId: userId, content: replyText.trim(), parentId });
		setReplyText("");
		setReplyToId(null);
		toast.success("Reply submitted for review!");
	};

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (listPickerRef.current && !listPickerRef.current.contains(e.target as Node)) {
				setShowListPicker(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			const scrollTop = window.scrollY;
			const docHeight =
				document.documentElement.scrollHeight - window.innerHeight;
			setReadingProgress(Math.min((scrollTop / docHeight) * 100, 100));
			setShowBackToTop(scrollTop > 500);
		}
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);


	const handleShare = async (platform?: string) => {
		const url = window.location.href;
		const title = post?.title ?? "";
		if (platform === "twitter") {
			window.open(
				`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
				"_blank",
			)
		} else if (platform === "linkedin") {
			window.open(
				`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
				"_blank",
			)
		} else {
			await navigator.clipboard.writeText(url);
			toast.success("Link copied!");
		}
	}

	const handleComment = async () => {
		if (!commentText.trim()) return;
		if (!userId || !post?.id) {
			toast.error("You must be logged in to comment");
			return;
		}
		await createComment.mutateAsync({ postId: post.id, authorId: userId, content: commentText.trim() });
		setCommentText("");
		toast.success("Comment submitted for review!");
	}

	if (postQuery.isLoading) {
		return <div className="min-h-screen pt-32 text-center text-wild-blue-yonder">Loading post…</div>;
	}

	if (!post) {
		return <div className="min-h-screen pt-32 text-center text-red-400">Failed to load this post.</div>;
	}

	// Build JSON-LD structured data
	const jsonLd = post ? JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Article",
		headline: post.title,
		description: post.excerpt ?? "",
		image: post.featuredImageUrl ?? "",
		datePublished: post.publishedAt ? new Date(post.publishedAt as string | Date).toISOString() : undefined,
		dateModified: post.updatedAt ? new Date(post.updatedAt as string | Date).toISOString() : undefined,
		author: { "@type": "Person", name: (post as any)?.author?.name ?? "BlogCMS" },
	}) : null;

	return (
		<>
			{jsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: jsonLd }}
				/>
			)}
			{/* Reading progress bar */}
			<div className="fixed top-0 left-0 right-0 h-1 bg-prussian-blue z-50">
				<div
					className="h-full bg-gradient-to-r from-carolina-blue to-blog-teal transition-all duration-150"
					style={{ width: `${readingProgress}%` }}
				/>
			</div>

			<article className="min-h-screen">
				{/* Hero */}
				<header className="relative pt-32 pb-16 md:pt-40 md:pb-24">
					<div className="container mx-auto px-4 max-w-4xl">
						<Link to="/">
							<Button
								variant="ghost"
								className="text-wild-blue-yonder hover:text-white mb-8 -ml-4"
							>
								<ChevronLeft className="w-4 h-4 mr-2" />
								Back to Blog
							</Button>
						</Link>

						{/* Category */}
						<div className="flex flex-wrap items-center gap-3 mb-6">
							{post.category?.name && (
								<Badge className="bg-gradient-to-r from-carolina-blue to-blog-teal text-white border-0">
									{post.category.name}
								</Badge>
							)}
						</div>

						<h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
							{post.title}
						</h1>

						{post.excerpt && (
							<p className="text-xl text-wild-blue-yonder mb-8 leading-relaxed">
								{post.excerpt}
							</p>
						)}

						<div className="flex flex-wrap items-center gap-6 text-sm text-wild-blue-yonder">
							<div className="flex items-center gap-3">
								<Avatar className="w-12 h-12 ring-2 ring-carolina-blue/30">
									<AvatarFallback className="bg-gradient-to-br from-carolina-blue to-blog-teal text-white font-bold">
										{(post.author?.name?.[0] ?? "A").toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="text-white font-medium">{post.author?.name ?? "Unknown Author"}</p>
									<p className="text-xs">Author</p>
								</div>
							</div>
							<span className="text-prussian-blue">•</span>
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4" />
								<span>{formatDate(post.createdAt)}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="w-4 h-4" />
								<span>{(post as any).readTimeMinutes ? `${(post as any).readTimeMinutes} min read` : estimateReadTimeFromBlocks(blocks)}</span>
							</div>
							<div className="flex items-center gap-2">
								<Eye className="w-4 h-4" />
								<span>{post.viewCount} views</span>
							</div>
						</div>
					</div>
				</header>

				{/* Featured Image */}
				{post.featuredImageUrl && (
					<div className="container mx-auto px-4 max-w-5xl mb-12">
						<img
							src={post.featuredImageUrl}
							alt={post.title}
							className="w-full h-auto rounded-2xl shadow-2xl"
						/>
					</div>
				)}

				{/* Content area */}
				<div className="container mx-auto px-4 max-w-4xl">
					<div className="flex gap-8">
						{/* Floating action bar */}
						<aside className="hidden lg:block">
							<div className="sticky top-24 flex flex-col gap-4">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => {
										if (!userId || !post?.id) { toast.error("Sign in to like posts"); return; }
										toggleReaction.mutate({ postId: post.id, userId, type: "like" }, {
											onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post-reaction", post.id] }),
										});
									}}
									className={`rounded-full ${isLiked ? "text-pink-500 bg-pink-500/10" : "text-wild-blue-yonder hover:text-pink-500"}`}
								>
									<Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
								</Button>
								<div className="relative" ref={listPickerRef}>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											if (!userId || !post?.id) { toast.error("Sign in to bookmark posts"); return; }
											setShowListPicker((p) => !p);
										}}
										className={`rounded-full ${isBookmarked ? "text-carolina-blue bg-carolina-blue/10" : "text-wild-blue-yonder hover:text-carolina-blue"}`}
									>
										<Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
									</Button>
									{showListPicker && (
										<div className="absolute right-0 top-full mt-1 z-50 w-52 bg-oxford-blue border border-prussian-blue rounded-xl shadow-xl p-2">
											<p className="text-[10px] text-slate-gray uppercase tracking-wide px-2 pb-1">Save to list</p>
											{myLists.length === 0 ? (
												<p className="text-xs text-slate-gray px-2 py-1">No lists yet. Create one in your account.</p>
											) : (
												<>
													{myLists.map((list: any) => {
														const inThisList = bookmarkedListId === list.id;
														return (
															<button
																key={list.id}
																type="button"
																onClick={() => {
																	if (!post?.id) return;
																	if (inThisList) {
																		removeFromReadingList.mutate({ postId: post.id });
																		toast.success(`Removed from "${list.name}"`);
																	} else {
																		addToReadingList.mutate({ postId: post.id, listId: list.id });
																		toast.success(`Saved to "${list.name}"`);
																	}
																	setShowListPicker(false);
																}}
																className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors flex items-center justify-between gap-2 ${inThisList ? "text-carolina-blue bg-carolina-blue/10" : "text-alice-blue hover:bg-prussian-blue/40"}`}
															>
																<span className="truncate">
																	{list.name}
																	{list.isDefault && <span className="ml-1 text-[10px] text-slate-gray">(default)</span>}
																</span>
																{inThisList && <Check className="w-3.5 h-3.5 shrink-0" />}
															</button>
														);
													})}
												</>
											)}
										</div>
									)}
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleShare("twitter")}
									className="rounded-full text-wild-blue-yonder hover:text-carolina-blue"
								>
									<Twitter className="w-5 h-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleShare("linkedin")}
									className="rounded-full text-wild-blue-yonder hover:text-blue-400"
								>
									<Linkedin className="w-5 h-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleShare()}
									className="rounded-full text-wild-blue-yonder hover:text-white"
								>
									<Share2 className="w-5 h-5" />
								</Button>
								<div className="w-px h-8 bg-prussian-blue mx-auto" />
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setShowToc(!showToc)}
									className={`rounded-full ${showToc ? "text-carolina-blue bg-carolina-blue/10" : "text-wild-blue-yonder hover:text-carolina-blue"}`}
								>
									<List className="w-5 h-5" />
								</Button>
							</div>
						</aside>

						{/* Main content */}
						<div className="flex-1 min-w-0 pb-20">
							{/* Table of Contents */}
							{showToc && headings.length > 0 && (
								<nav className="mb-8 p-6 bg-prussian-blue/50 rounded-xl border border-prussian-blue">
									<h4 className="text-white font-semibold mb-4 flex items-center gap-2">
										<List className="w-4 h-4" />
										Table of Contents
									</h4>
									<ul className="space-y-2">
										{headings.map((heading, i) => (
											<li
												key={i}
												style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
											>
												<a
													href={`#${heading.id}`}
													className="text-wild-blue-yonder hover:text-carolina-blue transition-colors text-sm"
												>
													{heading.text}
												</a>
											</li>
										))}
									</ul>
								</nav>
							)}

							{/* Article content */}
							{!(post as any).isLocked && (post as any).freeReadGranted && (
								<FreeReadsBanner readsRemaining={(post as any).freeReadsRemaining ?? 0} />
							)}
							<div ref={contentRef} className={(post as any).isLocked ? "relative min-h-[20rem]" : ""}>
								<PostBlocksRenderer blocks={blocks} />
								{(post as any).isLocked && (
									<div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-oxford-blue to-transparent pointer-events-none" />
								)}
							</div>
							{(post as any).isLocked && <PaywallCard />}
							{!(post as any).isLocked && <MemberCTA />}

							{/* Author bio */}
						{(() => {
							const profile = (post as any).authorProfile as { displayName?: string; username?: string; bio?: string; avatarUrl?: string } | null;
							const displayName = profile?.displayName ?? post.author?.name ?? "Unknown Author";
							return (
								<div className="mt-16 p-8 bg-gradient-to-br from-prussian-blue/50 to-oxford-blue-2 rounded-2xl border border-prussian-blue">
									<div className="flex items-start gap-6">
										<Avatar className="w-20 h-20 ring-4 ring-carolina-blue/20">
											{profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={displayName} />}
											<AvatarFallback className="bg-gradient-to-br from-carolina-blue to-blog-teal text-white text-2xl font-bold">
												{displayName[0].toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1">
											<h3 className="text-xl font-bold text-white mb-1">Written by {displayName}</h3>
											{profile?.username && (
												<Link to={"/@{$username}" as string} params={{ username: profile.username } as any} className="text-xs text-carolina-blue hover:underline block mb-3">
													@{profile.username}
												</Link>
											)}
											{profile?.bio ? (
												<p className="text-wild-blue-yonder mb-4 leading-relaxed">{profile.bio}</p>
											) : (
												<p className="text-wild-blue-yonder mb-4">No bio available.</p>
											)}
										</div>
									</div>
								</div>
							);
						})()}

							{/* Share */}
							<div className="mt-12 p-6 bg-prussian-blue/30 rounded-xl text-center">
								<h4 className="text-white font-semibold mb-4">Share this article</h4>
								<div className="flex justify-center gap-4">
									<Button
										variant="outline"
										size="icon"
										onClick={() => handleShare("twitter")}
										className="rounded-full border-prussian-blue text-wild-blue-yonder hover:text-carolina-blue hover:border-carolina-blue"
									>
										<Twitter className="w-5 h-5" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => handleShare("linkedin")}
										className="rounded-full border-prussian-blue text-wild-blue-yonder hover:text-blue-400 hover:border-blue-400"
									>
										<Linkedin className="w-5 h-5" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => handleShare()}
										className="rounded-full border-prussian-blue text-wild-blue-yonder hover:text-white hover:border-white"
									>
										<Copy className="w-5 h-5" />
									</Button>
								</div>
							</div>

							{/* Comments */}
							<section className="mt-16">
								<h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
									<MessageCircle className="w-6 h-6 text-carolina-blue" />
									Comments ({realComments.length})
								</h3>

								<div className="mb-8 p-6 bg-prussian-blue/30 rounded-xl">
									<Textarea
										value={commentText}
										onChange={(e) => setCommentText(e.target.value)}
										placeholder="Write a comment..."
										className="bg-prussian-blue border-prussian-blue-dark text-white placeholder:text-wild-blue-yonder mb-4 min-h-[100px]"
									/>
									<div className="flex justify-end">
										<Button
										onClick={handleComment}
										disabled={!commentText.trim() || createComment.isPending}
											className="bg-gradient-to-r from-carolina-blue to-blog-teal hover:opacity-90"
										>
											<Send className="w-4 h-4 mr-2" />
											Post Comment
										</Button>
									</div>
								</div>

																<div className="space-y-6">
									{commentsQuery.isLoading && (
										<p className="text-wild-blue-yonder text-sm">Loading comments…</p>
									)}
									{!commentsQuery.isLoading && topLevelComments.length === 0 && (
										<p className="text-wild-blue-yonder text-sm py-4 text-center">No comments yet. Be the first!</p>
									)}
									{topLevelComments.map((comment: any) => {
										const authorName = comment.author?.name ?? "Anonymous";
										const replies = repliesByParent[comment.id] ?? [];
										const isReplying = replyToId === comment.id;
										return (
											<div key={comment.id} className="space-y-3">
												<div className="p-6 bg-prussian-blue/20 rounded-xl border border-prussian-blue/50">
													<div className="flex items-start gap-4">
														<Avatar className="w-10 h-10">
															<AvatarFallback className="bg-gradient-to-br from-carolina-blue to-blog-teal text-white">
																{authorName[0]}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<div className="flex items-center justify-between mb-2">
																<div>
																	<span className="font-medium text-white">{authorName}</span>
																	<span className="text-wild-blue-yonder text-sm ml-3">
																		{formatDate(comment.createdAt)}
																	</span>
																</div>
															</div>
															<p className="text-shadow-blue mb-3">{comment.content}</p>
															<div className="flex items-center gap-4">
																<span className="flex items-center gap-2 text-sm text-wild-blue-yonder">
																	<ThumbsUp className="w-4 h-4" />
																	{comment.likeCount}
																</span>
																{userId && (
																	<button
																		onClick={() => {
																			setReplyToId(isReplying ? null : comment.id);
																			setReplyText("");
																		}}
																		className="text-sm text-carolina-blue hover:underline"
																	>
																		{isReplying ? "Cancel" : "Reply"}
																	</button>
																)}
																{replies.length > 0 && (
																	<span className="text-xs text-wild-blue-yonder">
																		{replies.length} {replies.length === 1 ? "reply" : "replies"}
																	</span>
																)}
															</div>
														</div>
													</div>
												</div>

												{/* Inline reply form */}
												{isReplying && (
													<div className="ml-10 p-4 bg-prussian-blue/30 rounded-xl border border-prussian-blue-dark/40">
														<Textarea
															value={replyText}
															onChange={(e) => setReplyText(e.target.value)}
															placeholder={`Replying to ${authorName}…`}
															className="bg-prussian-blue border-prussian-blue-dark text-white placeholder:text-wild-blue-yonder mb-3 min-h-[80px]"
														/>
														<div className="flex justify-end gap-2">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => { setReplyToId(null); setReplyText(""); }}
																className="text-wild-blue-yonder"
															>
																Cancel
															</Button>
															<Button
																size="sm"
																onClick={() => handleReply(comment.id)}
																disabled={!replyText.trim() || createComment.isPending}
																className="bg-gradient-to-r from-carolina-blue to-blog-teal hover:opacity-90"
															>
																<Send className="w-3 h-3 mr-1" />
																Post Reply
															</Button>
														</div>
													</div>
												)}

												{/* Nested replies */}
												{replies.length > 0 && (
													<div className="ml-10 space-y-3">
														{replies.map((reply: any) => {
															const replyAuthor = reply.author?.name ?? "Anonymous";
															return (
																<div
																	key={reply.id}
																	className="p-4 bg-prussian-blue/10 rounded-xl border border-prussian-blue/30"
																>
																	<div className="flex items-start gap-3">
																		<Avatar className="w-8 h-8">
																			<AvatarFallback className="bg-gradient-to-br from-carolina-blue to-blog-teal text-white text-xs">
																				{replyAuthor[0]}
																			</AvatarFallback>
																		</Avatar>
																		<div className="flex-1">
																			<div className="mb-1">
																				<span className="font-medium text-white text-sm">{replyAuthor}</span>
																				<span className="text-wild-blue-yonder text-xs ml-2">
																					{formatDate(reply.createdAt)}
																				</span>
																			</div>
																			<p className="text-shadow-blue text-sm">{reply.content}</p>
																		</div>
																	</div>
																</div>
															);
														})}
													</div>
												)}
											</div>
										);
									})}
								</div>
							</section>

							{/* More from this author */}
							{moreByAuthor.length > 0 && (
								<section className="mt-16">
									<h3 className="text-2xl font-bold text-white mb-8">
										More from{" "}
										<Link
											to={`/@${(post as any).authorProfile?.username ?? ""}` as string}
											className="text-carolina-blue hover:underline"
										>
											{(post as any).authorProfile?.displayName ?? post?.author?.name ?? "this author"}
										</Link>
									</h3>
									<div className="grid gap-6">
										{moreByAuthor.map((related: any) => (
											<Link
												key={related.id}
												to={"/$slug" as string}
												params={{ slug: related.slug } as any}
												className="flex gap-4 p-4 rounded-xl border border-prussian-blue hover:border-carolina-blue/50 bg-prussian-blue/20 hover:bg-prussian-blue/40 transition-all group"
											>
												{related.featuredImageUrl && (
													<img
														src={related.featuredImageUrl}
														alt={related.title}
														className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
													/>
												)}
												<div className="flex-1 min-w-0">
													<h4 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-carolina-blue transition-colors mb-1">
														{related.title}
													</h4>
													{related.excerpt && (
														<p className="text-xs text-wild-blue-yonder line-clamp-2">{related.excerpt}</p>
													)}
												</div>
											</Link>
										))}
									</div>
								</section>
							)}

	{/* Related posts */}
							{relatedPosts.length > 0 && (
								<section className="mt-16">
									<h3 className="text-2xl font-bold text-white mb-8">
										More from{post.category?.name ? ` ${post.category.name}` : " the blog"}
									</h3>
									<div className="grid gap-6">
										{relatedPosts.slice(0, 3).map((related: any) => (
											<Link
												key={related.id}
												to={"/$slug" as string}
												params={{ slug: related.slug } as any}
												className="flex gap-4 p-4 rounded-xl border border-prussian-blue hover:border-carolina-blue/50 bg-prussian-blue/20 hover:bg-prussian-blue/40 transition-all group"
											>
												{related.featuredImageUrl && (
													<img
														src={related.featuredImageUrl}
														alt={related.title}
														className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
													/>
												)}
												<div className="flex-1 min-w-0">
													<h4 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-carolina-blue transition-colors mb-1">
														{related.title}
													</h4>
													{related.excerpt && (
														<p className="text-xs text-wild-blue-yonder line-clamp-2">{related.excerpt}</p>
													)}
												</div>
											</Link>
										))}
									</div>
								</section>
							)}
						</div>
					</div>
				</div>
			</article>

			{/* Back to top */}
			{showBackToTop && (
				<button
					type="button"
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
					className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-carolina-blue to-blog-teal text-white shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center z-40"
				>
					<ChevronUp className="w-6 h-6" />
				</button>
			)}
		</>
	)
}
