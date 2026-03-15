export type BlogSeedAuthor = {
	id: string;
	name: string;
	email: string;
	username: string;
	bio: string;
	avatarUrl: string;
};

export type BlogSeedCategory = {
	id: string;
	name: string;
	slug: string;
	description: string;
	color: string;
};

export type BlogSeedTag = {
	id: string;
	name: string;
	slug: string;
};

export type BlogSeedPost = {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	authorId: string;
	categoryId: string;
	tagIds: string[];
	featuredImageUrl: string;
	status: "published";
	isFeatured?: boolean;
	viewCount?: number;
	publishedAt: string;
	blocks: Array<{ id: string; type: string; content: string; meta?: Record<string, unknown> }>;
};

export const BLOG_SEED_AUTHORS: BlogSeedAuthor[] = [
	{
		id: "seed-user-john",
		name: "John Doe",
		email: "john.seed@blogcms.local",
		username: "john-doe",
		bio: "Platform architect focused on scalable systems and distributed design.",
		avatarUrl: "https://i.pravatar.cc/300?img=1",
	},
	{
		id: "seed-user-jane",
		name: "Jane Smith",
		email: "jane.seed@blogcms.local",
		username: "jane-smith",
		bio: "Frontend engineer writing about DX, performance, and product UX.",
		avatarUrl: "https://i.pravatar.cc/300?img=2",
	},
	{
		id: "seed-user-alex",
		name: "Alex Johnson",
		email: "alex.seed@blogcms.local",
		username: "alex-johnson",
		bio: "TypeScript and platform tooling enthusiast.",
		avatarUrl: "https://i.pravatar.cc/300?img=3",
	},
];

export const BLOG_SEED_CATEGORIES: BlogSeedCategory[] = [
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed001", name: "Technology", slug: "technology", description: "Engineering and architecture", color: "#0ea5e9" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed002", name: "Development", slug: "development", description: "Practical coding content", color: "#14b8a6" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed003", name: "Design", slug: "design", description: "UI and product design", color: "#8b5cf6" },
];

export const BLOG_SEED_TAGS: BlogSeedTag[] = [
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed101", name: "typescript", slug: "typescript" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed102", name: "react", slug: "react" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed103", name: "tanstack", slug: "tanstack" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed104", name: "architecture", slug: "architecture" },
];

export const BLOG_SEED_POSTS: BlogSeedPost[] = [
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed201",
		slug: "building-scalable-applications",
		title: "Building Scalable Applications with Modern Architecture",
		excerpt: "Learn how to design and implement scalable systems that can handle millions of users.",
		authorId: "seed-user-john",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed001",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed104", "f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
		status: "published",
		isFeatured: true,
		viewCount: 5420,
		publishedAt: "2026-01-15T09:00:00.000Z",
		blocks: [
			{ id: "h1", type: "heading", content: "Building Scalable Applications", meta: { level: 1 } },
			{ id: "p1", type: "paragraph", content: "Scalability starts with explicit boundaries and reliable contracts." },
		],
	},
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed202",
		slug: "future-web-development-2026",
		title: "The Future of Web Development: What to Expect in 2026",
		excerpt: "Exploring upcoming trends and technologies that will shape the web development landscape.",
		authorId: "seed-user-jane",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed002",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed102", "f1843afa-81d3-4b51-aaf4-72a9345ed103"],
		featuredImageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=630&fit=crop",
		status: "published",
		isFeatured: true,
		viewCount: 4210,
		publishedAt: "2026-01-12T09:00:00.000Z",
		blocks: [
			{ id: "h1", type: "heading", content: "Web Development in 2026", meta: { level: 1 } },
			{ id: "p1", type: "paragraph", content: "Tooling quality and platform standards continue to converge." },
		],
	},
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed203",
		slug: "mastering-typescript-advanced",
		title: "Mastering TypeScript: Advanced Patterns and Best Practices",
		excerpt: "Deep dive into TypeScript's advanced features for building robust applications.",
		authorId: "seed-user-alex",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed001",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 3890,
		publishedAt: "2026-01-10T09:00:00.000Z",
		blocks: [
			{ id: "h1", type: "heading", content: "Advanced TypeScript", meta: { level: 1 } },
			{ id: "p1", type: "paragraph", content: "Use discriminated unions and strict inference to reduce runtime bugs." },
		],
	},
];

export const BLOG_SEED_FALLBACK_POST_BY_SLUG = Object.fromEntries(
	BLOG_SEED_POSTS.map((post) => [post.slug, post]),
);
