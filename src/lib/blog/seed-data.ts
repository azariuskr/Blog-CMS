// =============================================================================
// Blog seed data — expanded rich dataset
// All inserts are idempotent (conflict on stable IDs → update or ignore)
// =============================================================================

export type BlogSeedAuthor = {
	id: string;
	name: string;
	email: string;
	username: string;
	bio: string;
	avatarUrl: string;
	role?: "admin" | "user";
	twitterHandle?: string;
	githubHandle?: string;
	website?: string;
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

export type BlogSeedBlock = {
	id: string;
	type: string;
	content: string;
	meta?: Record<string, unknown>;
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
	readTimeMinutes?: number;
	publishedAt: string;
	blocks: BlogSeedBlock[];
};

export type BlogSeedComment = {
	id: string;
	postId: string;
	authorId: string;
	content: string;
	status: "approved";
};

export type BlogSeedReaction = {
	postId: string;
	userId: string;
	type: "like";
};

// =============================================================================
// AUTHORS  (6 total — first is seeded as admin/owner)
// =============================================================================

export const BLOG_SEED_AUTHORS: BlogSeedAuthor[] = [
	{
		id: "seed-user-john",
		name: "John Doe",
		email: "john.seed@blogcms.local",
		username: "john-doe",
		bio: "Platform architect with 12 years building distributed systems. Currently obsessed with event-driven design and making complex systems boring in the best possible way.",
		avatarUrl: "https://i.pravatar.cc/300?img=1",
		role: "admin",
		twitterHandle: "johndoe_dev",
		githubHandle: "johndoe",
		website: "https://johndoe.dev",
	},
	{
		id: "seed-user-jane",
		name: "Jane Smith",
		email: "jane.seed@blogcms.local",
		username: "jane-smith",
		bio: "Frontend engineer obsessed with developer experience, React internals, and making UI feel effortless. I write about things I wish someone had explained to me sooner.",
		avatarUrl: "https://i.pravatar.cc/300?img=2",
		twitterHandle: "janesmith_ui",
		githubHandle: "janesmith",
	},
	{
		id: "seed-user-alex",
		name: "Alex Johnson",
		email: "alex.seed@blogcms.local",
		username: "alex-johnson",
		bio: "TypeScript and tooling enthusiast. I spend my days making the compiler catch bugs before they reach production — and writing about the lessons learned along the way.",
		avatarUrl: "https://i.pravatar.cc/300?img=3",
		githubHandle: "alexjohnson",
	},
	{
		id: "seed-user-sarah",
		name: "Sarah Chen",
		email: "sarah.seed@blogcms.local",
		username: "sarah-chen",
		bio: "Staff engineer turned engineering manager. I write about the messy, human side of software careers — from IC to leadership, imposter syndrome to growth frameworks.",
		avatarUrl: "https://i.pravatar.cc/300?img=5",
		twitterHandle: "sarahchen_eng",
		githubHandle: "sarahchen",
		website: "https://sarahchen.io",
	},
	{
		id: "seed-user-marcus",
		name: "Marcus Williams",
		email: "marcus.seed@blogcms.local",
		username: "marcus-williams",
		bio: "DevOps/platform engineer specialising in Kubernetes, GitOps, and zero-downtime deployments. If you can automate it, you should automate it.",
		avatarUrl: "https://i.pravatar.cc/300?img=8",
		githubHandle: "marcuswilliams",
		twitterHandle: "marcus_devops",
	},
	{
		id: "seed-user-emma",
		name: "Emma Rodriguez",
		email: "emma.seed@blogcms.local",
		username: "emma-rodriguez",
		bio: "Design systems lead and accessibility advocate. I bridge the gap between designers and engineers, writing about CSS, component architecture, and building inclusive interfaces.",
		avatarUrl: "https://i.pravatar.cc/300?img=9",
		twitterHandle: "emmarodriguez_ds",
		githubHandle: "emmarodriguez",
		website: "https://emmadesigns.dev",
	},
];

// =============================================================================
// CATEGORIES  (6 total)
// =============================================================================

export const BLOG_SEED_CATEGORIES: BlogSeedCategory[] = [
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed001", name: "Technology",          slug: "technology",          description: "Engineering, architecture, and systems thinking",   color: "#0ea5e9" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed002", name: "Development",         slug: "development",         description: "Practical coding, patterns, and frameworks",         color: "#14b8a6" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed003", name: "Design",              slug: "design",              description: "UI design, CSS, and design systems",                color: "#8b5cf6" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed004", name: "Career",              slug: "career",              description: "Growth, leadership, and the developer journey",       color: "#f59e0b" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed005", name: "Tools & Productivity", slug: "tools",              description: "Dev tools, workflows, and productivity techniques",   color: "#10b981" },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed006", name: "Open Source",         slug: "open-source",         description: "Community, contributions, and collaboration",         color: "#f97316" },
];

// =============================================================================
// TAGS  (12 total)
// =============================================================================

export const BLOG_SEED_TAGS: BlogSeedTag[] = [
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed101", name: "typescript",    slug: "typescript"    },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed102", name: "react",         slug: "react"         },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed103", name: "tanstack",      slug: "tanstack"      },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed104", name: "architecture",  slug: "architecture"  },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed105", name: "css",           slug: "css"           },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed106", name: "performance",   slug: "performance"   },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed107", name: "devops",        slug: "devops"        },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed108", name: "career",        slug: "career"        },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed109", name: "git",           slug: "git"           },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed110", name: "open-source",   slug: "open-source"   },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed111", name: "nodejs",        slug: "nodejs"        },
	{ id: "f1843afa-81d3-4b51-aaf4-72a9345ed112", name: "testing",       slug: "testing"       },
];

// =============================================================================
// POSTS  (10 total — 3 existing with full content + 7 new)
// =============================================================================

export const BLOG_SEED_POSTS: BlogSeedPost[] = [
	// -------------------------------------------------------------------------
	// POST 1 — Building Scalable Applications (expanded)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed201",
		slug: "building-scalable-applications",
		title: "Building Scalable Applications with Modern Architecture",
		excerpt: "Learn how to design and implement scalable systems that can handle millions of users — from service boundaries to event-driven patterns.",
		authorId: "seed-user-john",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed001",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed104", "f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop",
		status: "published",
		isFeatured: true,
		viewCount: 5420,
		readTimeMinutes: 9,
		publishedAt: "2026-01-15T09:00:00.000Z",
		blocks: [
			{ id: "s1-h1", type: "h1", content: "Building Scalable Applications with Modern Architecture" },
			{ id: "s1-p1", type: "paragraph", content: "Scalability is not a feature you bolt on at the end — it is a set of decisions you make from day one. The most common mistake teams make is designing for the load they have today rather than planning the seams that will allow the system to grow." },
			{ id: "s1-h2a", type: "h2", content: "Start With Explicit Boundaries" },
			{ id: "s1-p2", type: "paragraph", content: "Every scalable system begins by asking: what are the natural seams in this domain? A seam is a place where two concerns meet but remain separable. Order management and inventory are different concerns even when they share data. Model them separately from the start and you buy yourself the option to scale them independently later." },
			{ id: "s1-bq1", type: "blockquote", content: "Make it work, make it right, make it fast — in that order. But design the boundaries before step one." },
			{ id: "s1-h2b", type: "h2", content: "Event-Driven Communication" },
			{ id: "s1-p3", type: "paragraph", content: "Once you have your service boundaries, the next question is how they communicate. Synchronous REST calls seem obvious but they couple services at runtime — if the inventory service is slow, your order service slows down too. Events decouple this. A service publishes something that happened; other services react in their own time." },
			{ id: "s1-code1", type: "code", content: `// Publishing a domain event
await eventBus.publish({
  type: "order.placed",
  payload: {
    orderId: order.id,
    customerId: order.customerId,
    lineItems: order.lineItems,
    placedAt: new Date().toISOString(),
  },
});

// Inventory service handler — decoupled, async
eventBus.on("order.placed", async (event) => {
  await inventory.reserveItems(event.payload.lineItems);
  await eventBus.publish({
    type: "inventory.reserved",
    payload: { orderId: event.payload.orderId },
  });
});`, meta: { language: "typescript" } },
			{ id: "s1-h2c", type: "h2", content: "The CQRS Pattern" },
			{ id: "s1-p4", type: "paragraph", content: "Command Query Responsibility Segregation separates reads from writes at the model level. Your write model is optimised for consistency and invariant enforcement; your read model is optimised for the specific shape that UIs and APIs need. The two can be scaled independently — reads almost always dominate traffic." },
			{ id: "s1-ul1", type: "ul", content: "- Write side: enforces business rules, emits events\n- Read side: materialised views built from events\n- Sync: event handlers update projections asynchronously\n- Result: read replicas can scale horizontally without touching write DB" },
			{ id: "s1-h2d", type: "h2", content: "Database Considerations" },
			{ id: "s1-p5", type: "paragraph", content: "A single relational database will take you a very long way — do not reach for distributed databases until you genuinely need them. When you do hit limits, the usual progression is: read replicas → connection pooling → selective caching (Redis) → sharding or partitioning. Each step has a cost; take them only when data proves you need to." },
			{ id: "s1-alert1", type: "alert", content: "Premature optimisation kills more systems than under-optimisation. Profile before you partition.", meta: { variant: "warning" } },
			{ id: "s1-h2e", type: "h2", content: "Observability From Day One" },
			{ id: "s1-p6", type: "paragraph", content: "You cannot scale what you cannot measure. Structured logs, distributed traces, and RED metrics (Rate, Errors, Duration) per service boundary are non-negotiable. Add them before you need them — retrofitting observability into a running system is painful." },
			{ id: "s1-sep", type: "separator", content: "---" },
			{ id: "s1-p7", type: "paragraph", content: "Scalability is ultimately about keeping options open. Explicit boundaries, event-driven communication, and good observability give you the freedom to change any piece without rewriting everything around it." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 2 — Future of Web Development (expanded)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed202",
		slug: "future-web-development-2026",
		title: "The Future of Web Development: What to Expect in 2026",
		excerpt: "From React Server Components to edge runtimes and AI-assisted coding — a grounded look at which trends are real and which are hype.",
		authorId: "seed-user-jane",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed002",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed102", "f1843afa-81d3-4b51-aaf4-72a9345ed103"],
		featuredImageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=630&fit=crop",
		status: "published",
		isFeatured: true,
		viewCount: 4210,
		readTimeMinutes: 7,
		publishedAt: "2026-01-12T09:00:00.000Z",
		blocks: [
			{ id: "s2-h1", type: "h1", content: "The Future of Web Development: What to Expect in 2026" },
			{ id: "s2-p1", type: "paragraph", content: "Every year someone publishes a hot-take about the technologies that will 'define the next decade'. Most of it ages poorly. This piece tries to be different — focusing on shifts that are already underway and have proven real-world traction." },
			{ id: "s2-h2a", type: "h2", content: "Server Components Are Changing the Mental Model" },
			{ id: "s2-p2", type: "paragraph", content: "React Server Components (RSC) are not just another rendering strategy — they fundamentally change where logic lives. Data fetching, authentication checks, and heavy computation belong on the server. The component tree becomes a description of both server and client behaviour, unified in one language." },
			{ id: "s2-code1", type: "code", content: `// Server Component — runs only on the server
// No bundle size impact, direct DB access
async function PostList() {
  const posts = await db.query.posts.findMany({
    where: eq(posts.status, "published"),
    orderBy: desc(posts.publishedAt),
    limit: 10,
  });

  return (
    <ul>
      {posts.map(post => (
        // Client Component receives serialised props
        <PostCard key={post.id} post={post} />
      ))}
    </ul>
  );
}`, meta: { language: "tsx" } },
			{ id: "s2-h2b", type: "h2", content: "The Edge Is Getting Real" },
			{ id: "s2-p3", type: "paragraph", content: "Running code at the edge — 50–100ms from most users instead of 200ms+ from a central data centre — is no longer experimental. Cloudflare Workers, Vercel Edge Functions, and Deno Deploy have production traffic. The constraint is still the lack of full Node.js APIs, but that gap is closing." },
			{ id: "s2-h2c", type: "h2", content: "TypeScript Is the Default" },
			{ id: "s2-p4", type: "paragraph", content: "TypeScript crossed a tipping point sometime around 2024. New projects without it are now the exception, not the rule. The ecosystem followed: Drizzle, tRPC, Zod, and TanStack all treat TypeScript as a first-class citizen. The compiler has become a form of documentation that never goes stale." },
			{ id: "s2-h2d", type: "h2", content: "AI Assistance: Useful, Not Magic" },
			{ id: "s2-p5", type: "paragraph", content: "AI coding assistants are genuinely useful for boilerplate, tests, and exploration. They are not useful for architecture, security-sensitive code, or anything requiring deep domain context. The developers who extract the most value treat them as a pair-programming partner — useful for suggestions, but requiring review." },
			{ id: "s2-bq1", type: "blockquote", content: "The skill isn't using AI. The skill is knowing when to trust it and when to override it." },
			{ id: "s2-h2e", type: "h2", content: "What to Actually Learn Right Now" },
			{ id: "s2-ol1", type: "ol", content: "1. React Server Components and the App Router mental model\n2. Edge runtime constraints and opportunities\n3. TypeScript's structural type system at depth\n4. Observability — structured logging, tracing, OpenTelemetry\n5. SQL: it never went away and it matters more than ever" },
			{ id: "s2-sep", type: "separator", content: "---" },
			{ id: "s2-p6", type: "paragraph", content: "The fundamentals compound. Invest in understanding HTTP, databases, and how browsers work. Frameworks change; these do not." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 3 — Mastering TypeScript (expanded)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed203",
		slug: "mastering-typescript-advanced",
		title: "Mastering TypeScript: Advanced Patterns and Best Practices",
		excerpt: "Discriminated unions, template literal types, conditional types, and the patterns that genuinely reduce runtime bugs.",
		authorId: "seed-user-alex",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed002",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 3890,
		readTimeMinutes: 8,
		publishedAt: "2026-01-10T09:00:00.000Z",
		blocks: [
			{ id: "s3-h1", type: "h1", content: "Mastering TypeScript: Advanced Patterns and Best Practices" },
			{ id: "s3-p1", type: "paragraph", content: "Most TypeScript tutorials stop at interfaces and basic generics. That is a shame because the real power of the type system kicks in when you start using discriminated unions, conditional types, and mapped types to eliminate entire categories of runtime bugs." },
			{ id: "s3-h2a", type: "h2", content: "Discriminated Unions" },
			{ id: "s3-p2", type: "paragraph", content: "The single most impactful TypeScript pattern for application code. Model every state your data can be in — including loading, error, and empty — as a union member, and the compiler will force you to handle every case." },
			{ id: "s3-code1", type: "code", content: `type ApiResult<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function UserProfile({ result }: { result: ApiResult<User> }) {
  // TypeScript forces you to handle every branch
  switch (result.status) {
    case "idle":    return <Placeholder />;
    case "loading": return <Spinner />;
    case "error":   return <ErrorBanner error={result.error} />;
    case "success": return <Profile user={result.data} />;
  }
}`, meta: { language: "typescript" } },
			{ id: "s3-h2b", type: "h2", content: "Template Literal Types" },
			{ id: "s3-p3", type: "paragraph", content: "Template literal types let you construct string types programmatically. This is particularly useful for event systems, CSS-in-JS, and API route typing." },
			{ id: "s3-code2", type: "code", content: `type EventName = "click" | "focus" | "blur";
type HandlerName = \`on\${Capitalize<EventName>}\`;
// HandlerName = "onClick" | "onFocus" | "onBlur"

type Route = "/users" | "/posts" | "/comments";
type ApiRoute = \`/api\${Route}\`;
// ApiRoute = "/api/users" | "/api/posts" | "/api/comments"`, meta: { language: "typescript" } },
			{ id: "s3-h2c", type: "h2", content: "Conditional and Mapped Types" },
			{ id: "s3-p4", type: "paragraph", content: "These are the power tools of the TypeScript type system. Conditional types let you branch on what a type is; mapped types let you transform every property in a type." },
			{ id: "s3-code3", type: "code", content: `// Conditional type: extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Mapped type: make all properties optional and nullable
type Patchable<T> = {
  [K in keyof T]?: T[K] | null;
};

// Combine them: build a partial update from any model
type UpdatePayload<T> = Patchable<Omit<T, "id" | "createdAt">>;`, meta: { language: "typescript" } },
			{ id: "s3-h2d", type: "h2", content: "The satisfies Operator" },
			{ id: "s3-p5", type: "paragraph", content: "Introduced in TypeScript 4.9, satisfies lets you validate a value against a type while preserving the narrowest inferred type. This is perfect for config objects where you want both type safety and IDE autocomplete on the specific values." },
			{ id: "s3-code4", type: "code", content: `const palette = {
  red:   [255, 0, 0],
  green: "#00ff00",
  blue:  [0, 0, 255],
} satisfies Record<string, string | number[]>;

// palette.red is inferred as number[] (not string | number[])
// palette.green is inferred as string (not string | number[])
palette.red.map(v => v * 2);   // ✅ works — TypeScript knows it's an array
palette.green.toUpperCase();   // ✅ works — TypeScript knows it's a string`, meta: { language: "typescript" } },
			{ id: "s3-alert1", type: "alert", content: "Use strict mode. Always. The non-strict defaults exist for migration paths, not for new code.", meta: { variant: "info" } },
			{ id: "s3-sep", type: "separator", content: "---" },
			{ id: "s3-p6", type: "paragraph", content: "The TypeScript type system is a proof system. Every type annotation is a claim about your program. The more precise your types, the fewer claims the runtime needs to make at your expense." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 4 — React Server Components (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed204",
		slug: "understanding-react-server-components",
		title: "Understanding React Server Components: A Practical Guide",
		excerpt: "React Server Components are the biggest shift in React's history. Here's what they actually are, what they replace, and how to think about the client/server boundary.",
		authorId: "seed-user-jane",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed002",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed102", "f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=1200&h=630&fit=crop",
		status: "published",
		isFeatured: true,
		viewCount: 6130,
		readTimeMinutes: 10,
		publishedAt: "2026-02-03T09:00:00.000Z",
		blocks: [
			{ id: "s4-h1", type: "h1", content: "Understanding React Server Components: A Practical Guide" },
			{ id: "s4-p1", type: "paragraph", content: "React Server Components (RSC) have been available in Next.js since v13 and are increasingly shipping in other frameworks. Despite the docs, many developers are still fuzzy on what they actually are — so let's start from first principles." },
			{ id: "s4-h2a", type: "h2", content: "What Problem Do They Solve?" },
			{ id: "s4-p2", type: "paragraph", content: "The classic React model sends JavaScript to the browser and runs everything there. This has two costs: bundle size (more JS = slower initial load) and waterfall fetches (component renders, fetches data, child renders, fetches its data, etc.). Server Components solve both by running those components on the server — zero contribution to bundle size, direct access to databases and services." },
			{ id: "s4-h2b", type: "h2", content: "The Three Types of Components" },
			{ id: "s4-ul1", type: "ul", content: "- **Server Components** (default): run on the server, can be async, have direct DB/file access, add nothing to the JS bundle\n- **Client Components** (`'use client'`): run on both server (for HTML) and client (for interactivity), can use hooks and event handlers\n- **Shared Components**: no hooks, no server APIs — can run either place" },
			{ id: "s4-h2c", type: "h2", content: "The Composition Model" },
			{ id: "s4-p3", type: "paragraph", content: "The key insight is that Server Components can pass Client Components as children — even though the Server Component runs on the server. The slot is filled on the server; the interactivity runs on the client. This is what makes the composition model work." },
			{ id: "s4-code1", type: "code", content: `// ✅ Server Component — fetches data directly
async function PostPage({ slug }: { slug: string }) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.slug, slug),
    with: { author: true, comments: true },
  });

  if (!post) notFound();

  return (
    <article>
      <PostHeader post={post} />        {/* Server Component */}
      <PostBody content={post.content} /> {/* Server Component */}
      {/* LikeButton is a Client Component — needs onClick */}
      <LikeButton postId={post.id} initialCount={post.likeCount} />
    </article>
  );
}

// 'use client' — interactive, runs in browser
"use client";
function LikeButton({ postId, initialCount }: { postId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return (
    <button onClick={() => { setCount(c => c + 1); toggleLike(postId); }}>
      ♥ {count}
    </button>
  );
}`, meta: { language: "tsx" } },
			{ id: "s4-h2d", type: "h2", content: "Common Mistakes" },
			{ id: "s4-ol1", type: "ol", content: "1. Marking everything `'use client'` — defeats the purpose; keep the boundary as low as possible\n2. Passing non-serialisable props across the boundary (functions, class instances)\n3. Importing server-only code (DB clients, secrets) into Client Components\n4. Forgetting that `async` components only work as Server Components" },
			{ id: "s4-h2e", type: "h2", content: "When to Use Each" },
			{ id: "s4-p4", type: "paragraph", content: "Default to Server Components. Add `'use client'` only when you need: useState, useEffect, event handlers, browser APIs, or third-party libraries that require the DOM. The rule of thumb: if it responds to user interaction, it's a Client Component. Everything else can be a Server Component." },
			{ id: "s4-bq1", type: "blockquote", content: "Push the client boundary as far down the tree as possible. A single interactive button doesn't need to make its parent a Client Component." },
			{ id: "s4-sep", type: "separator", content: "---" },
			{ id: "s4-p5", type: "paragraph", content: "RSC is a mental model shift, not a syntax change. Once you internalise where code runs and why, the patterns click. Start with the server as the default and reach for the client only when interactivity requires it." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 5 — CSS Container Queries (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed205",
		slug: "css-container-queries-layout-revolution",
		title: "CSS Container Queries: The Layout Revolution We've Been Waiting For",
		excerpt: "Media queries respond to the viewport. Container queries respond to the component's own available space. This changes how we think about responsive design entirely.",
		authorId: "seed-user-emma",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed003",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed105"],
		featuredImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 3240,
		readTimeMinutes: 6,
		publishedAt: "2026-02-10T09:00:00.000Z",
		blocks: [
			{ id: "s5-h1", type: "h1", content: "CSS Container Queries: The Layout Revolution We've Been Waiting For" },
			{ id: "s5-p1", type: "paragraph", content: "For years, responsive design meant responding to the viewport. We wrote media queries like `@media (min-width: 768px)` and tied component behaviour to the screen size. This works fine for full-page layouts, but breaks down for reusable components that appear in different contexts with different widths." },
			{ id: "s5-h2a", type: "h2", content: "The Problem Media Queries Can't Solve" },
			{ id: "s5-p2", type: "paragraph", content: "Imagine a card component. In a sidebar it should stack vertically. In a main content grid it should lay out horizontally. With media queries, you can't know which context it's in — you only know the viewport width. With container queries, the card itself can ask: 'how much space do I have?' and respond accordingly." },
			{ id: "s5-h2b", type: "h2", content: "The Syntax" },
			{ id: "s5-code1", type: "code", content: `/* Step 1: declare a containment context on the parent */
.card-wrapper {
  container-type: inline-size;
  container-name: card;   /* optional — useful for nested contexts */
}

/* Step 2: query the container, not the viewport */
.card {
  display: grid;
  grid-template-columns: 1fr;   /* stack by default */
  gap: 1rem;
}

@container card (min-width: 400px) {
  .card {
    grid-template-columns: auto 1fr;  /* side-by-side when space allows */
  }

  .card__image {
    width: 120px;
    aspect-ratio: 1;
  }
}`, meta: { language: "css" } },
			{ id: "s5-h2c", type: "h2", content: "Container Query Units" },
			{ id: "s5-p3", type: "paragraph", content: "Container queries also ship with relative units — `cqi`, `cqb`, `cqw`, `cqh` — that work like `vw`/`vh` but relative to the container instead of the viewport. This lets you size typography and spacing proportionally to the component's available space." },
			{ id: "s5-code2", type: "code", content: `/* Font scales relative to the card's width, not the viewport */
@container (min-width: 300px) {
  .card__title {
    font-size: clamp(1rem, 4cqi, 1.5rem);
  }
}`, meta: { language: "css" } },
			{ id: "s5-h2d", type: "h2", content: "Style Queries (Emerging)" },
			{ id: "s5-p4", type: "paragraph", content: "Style queries — querying CSS custom property values on a container — are beginning to ship. They let child elements respond to theme state set on an ancestor, unlocking a new way to do contextual theming without class-name juggling." },
			{ id: "s5-h2e", type: "h2", content: "Browser Support" },
			{ id: "s5-alert1", type: "alert", content: "Container queries (size) are baseline available as of late 2023. Style queries are still in early adoption. Check caniuse.com before shipping style queries to production.", meta: { variant: "info" } },
			{ id: "s5-sep", type: "separator", content: "---" },
			{ id: "s5-p5", type: "paragraph", content: "Container queries don't replace media queries — they complement them. Use media queries for page-level layout decisions; use container queries for component-level responsiveness. Together they give you true separation of concerns in CSS." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 6 — Zero-Downtime Deployment (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed206",
		slug: "zero-downtime-deployment-pipeline",
		title: "Building a Zero-Downtime Deployment Pipeline",
		excerpt: "How to design a CI/CD pipeline that deploys continuously without ever taking your service offline — blue/green, rolling updates, feature flags, and database migration safety.",
		authorId: "seed-user-marcus",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed001",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed107", "f1843afa-81d3-4b51-aaf4-72a9345ed104"],
		featuredImageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 4870,
		readTimeMinutes: 11,
		publishedAt: "2026-02-17T09:00:00.000Z",
		blocks: [
			{ id: "s6-h1", type: "h1", content: "Building a Zero-Downtime Deployment Pipeline" },
			{ id: "s6-p1", type: "paragraph", content: "Downtime during deployments is not inevitable. With the right pipeline design, you can ship to production multiple times a day without users ever noticing. This post covers the core techniques and the gotchas that trip up teams doing it for the first time." },
			{ id: "s6-h2a", type: "h2", content: "Blue/Green Deployments" },
			{ id: "s6-p2", type: "paragraph", content: "The classic pattern: maintain two identical production environments. Blue is live. You deploy to Green, run smoke tests, then switch the load balancer. Instant cutover; instant rollback by switching back. The tradeoff is resource cost — you're running two full environments during deployment." },
			{ id: "s6-h2b", type: "h2", content: "Rolling Updates" },
			{ id: "s6-p3", type: "paragraph", content: "Kubernetes rolling updates replace pods one at a time, keeping the service available throughout. The risk is that old and new versions run simultaneously during the rollout — your API and schema must be backward compatible during this window." },
			{ id: "s6-code1", type: "code", content: `# k8s deployment with rolling update strategy
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # max pods above desired count during rollout
    maxUnavailable: 0    # never take a pod down without bringing one up

# Health checks — crucial for zero-downtime
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3`, meta: { language: "yaml" } },
			{ id: "s6-h2c", type: "h2", content: "The Database Migration Problem" },
			{ id: "s6-p4", type: "paragraph", content: "This is where zero-downtime deployments get genuinely hard. Your app is live during deployment. If you drop a column in migration and old pods are still running, those pods crash. The solution is the expand/contract pattern: every schema change takes three deployments." },
			{ id: "s6-ol1", type: "ol", content: "1. **Expand**: add the new column (nullable), deploy app that writes to both old and new column\n2. **Migrate**: backfill existing rows, deploy app that reads from new column\n3. **Contract**: drop the old column once all pods are running the new code" },
			{ id: "s6-h2d", type: "h2", content: "Feature Flags" },
			{ id: "s6-p5", type: "paragraph", content: "Feature flags decouple deployment from release. Ship the code off by default, test it in production with a percentage of traffic, roll it out gradually, roll it back instantly if something goes wrong — all without a deployment." },
			{ id: "s6-code2", type: "code", content: `// LaunchDarkly / GrowthBook / Unleash — same idea
const newCheckoutEnabled = await flags.getBooleanValue(
  "new-checkout-flow",
  ctx.userId,
  false  // default
);

return newCheckoutEnabled
  ? <NewCheckout cart={cart} />
  : <LegacyCheckout cart={cart} />;`, meta: { language: "tsx" } },
			{ id: "s6-bq1", type: "blockquote", content: "Separate deployment from release. Ship often. Release deliberately." },
			{ id: "s6-sep", type: "separator", content: "---" },
			{ id: "s6-p6", type: "paragraph", content: "Zero-downtime deployment is a discipline, not a product. It requires your app code, database schema, and infrastructure to be designed with simultaneous old/new version compatibility in mind. The overhead pays off the first time you ship a fix at 2am without a maintenance window." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 7 — From Junior to Senior (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed207",
		slug: "from-junior-to-senior-what-nobody-tells-you",
		title: "From Junior to Senior: What Nobody Tells You",
		excerpt: "The technical skills are the easy part. Here's what actually changes as you grow — and why the gap between senior engineers isn't about code at all.",
		authorId: "seed-user-sarah",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed004",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed108"],
		featuredImageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 8920,
		readTimeMinutes: 8,
		publishedAt: "2026-02-24T09:00:00.000Z",
		blocks: [
			{ id: "s7-h1", type: "h1", content: "From Junior to Senior: What Nobody Tells You" },
			{ id: "s7-p1", type: "paragraph", content: "I spent the first three years of my career convinced that becoming a senior engineer meant knowing more things. More design patterns, more languages, more frameworks. I was wrong. The jump from mid to senior is almost entirely about a different set of skills — and most of them have nothing to do with code." },
			{ id: "s7-h2a", type: "h2", content: "You Stop Solving Problems and Start Preventing Them" },
			{ id: "s7-p2", type: "paragraph", content: "Junior and mid-level engineers are firefighters. Good ones, often heroic ones. Senior engineers look at the fire risk before the fire starts. They ask why this bug category keeps appearing, why deployments are fragile, why estimates are consistently wrong. The goal is to not need heroics." },
			{ id: "s7-bq1", type: "blockquote", content: "The best senior engineers I know are boring. Their systems don't page. Their code doesn't surprise. Their PRs merge cleanly. Boring is the goal." },
			{ id: "s7-h2b", type: "h2", content: "Scope Expands" },
			{ id: "s7-p3", content: "Mid-level: you own the implementation of a ticket. Senior: you own the outcome. This means caring about whether the feature solves the problem it was designed to solve, whether the estimate was realistic, whether the docs are updated, and whether the on-call engineer can understand what you built at 3am.", type: "paragraph" },
			{ id: "s7-h2c", type: "h2", content: "Communication Becomes Load-Bearing" },
			{ id: "s7-p4", type: "paragraph", content: "I used to think 'senior engineers write great code'. The reality is senior engineers make everyone around them more effective. The clearest leverage point is written communication — design docs, PR descriptions, ADRs, postmortems. Writing forces clarity of thought and creates a record that outlasts any Slack thread." },
			{ id: "s7-h2d", type: "h2", content: "Confidence Without Certainty" },
			{ id: "s7-p5", type: "paragraph", content: "Junior engineers often wait to speak until they're certain. Senior engineers speak with confidence while openly acknowledging uncertainty. 'I think X is the right approach and here's my reasoning, but I could be wrong about the latency assumptions — let's validate that.' This is not hedging; it is how good decisions get made." },
			{ id: "s7-h2e", type: "h2", content: "The Technical Skills Still Matter" },
			{ id: "s7-p6", type: "paragraph", content: "None of this means you stop caring about technical depth. System design intuition, debugging complex concurrency issues, knowing when an abstraction hurts more than it helps — these compound with experience. But they are necessary, not sufficient. The engineers who plateau at senior for years are usually excellent technically and have neglected everything else." },
			{ id: "s7-ol1", type: "ol", content: "1. Take ownership of outcomes, not just implementation\n2. Write everything down — design docs, decisions, lessons learned\n3. Invest in the people around you, not just your own skills\n4. Make your systems boring, observable, and debuggable by others\n5. Give feedback early, directly, and kindly" },
			{ id: "s7-sep", type: "separator", content: "---" },
			{ id: "s7-p7", type: "paragraph", content: "The title changes, but the work becomes more human. Lean into that." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 8 — Git Workflows for Modern Teams (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed208",
		slug: "git-workflows-modern-teams",
		title: "Git Workflows for Modern Teams: Trunk-Based vs. Gitflow",
		excerpt: "Gitflow vs trunk-based development vs GitHub Flow — a practical comparison of branching strategies and how to choose the right one for your team.",
		authorId: "seed-user-alex",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed005",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed109", "f1843afa-81d3-4b51-aaf4-72a9345ed107"],
		featuredImageUrl: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 2980,
		readTimeMinutes: 7,
		publishedAt: "2026-03-03T09:00:00.000Z",
		blocks: [
			{ id: "s8-h1", type: "h1", content: "Git Workflows for Modern Teams: Trunk-Based vs. Gitflow" },
			{ id: "s8-p1", type: "paragraph", content: "Nothing causes more friction in a development team than disagreement about branching strategy. Pick a workflow, stick with it, and optimise around it. Here's a principled comparison to help you choose." },
			{ id: "s8-h2a", type: "h2", content: "Trunk-Based Development" },
			{ id: "s8-p2", type: "paragraph", content: "Everyone commits to main (or a very short-lived branch) multiple times per day. The key enablers: feature flags to hide incomplete work, a fast CI pipeline, and a culture of small incremental commits. This is what Google, Meta, and most high-velocity engineering organisations use." },
			{ id: "s8-code1", type: "code", content: `# Trunk-based workflow
git checkout -b feat/add-search    # branch lives hours, not days
# make small focused changes
git commit -m "feat: add search index to posts table"
git push origin feat/add-search
# open PR → CI runs → 1-2 reviews → merge → delete branch
# No long-lived branches. No merge hell.`, meta: { language: "bash" } },
			{ id: "s8-h2b", type: "h2", content: "Gitflow" },
			{ id: "s8-p3", type: "paragraph", content: "Gitflow uses long-lived `develop`, `release`, and `hotfix` branches alongside `main`. It made sense in an era of infrequent releases on a schedule. For teams shipping continuously it introduces merge conflicts, stale branches, and a false sense of stability that comes from keeping things off `main`." },
			{ id: "s8-h2c", type: "h2", content: "GitHub Flow" },
			{ id: "s8-p4", type: "paragraph", content: "A simplification of Gitflow: only `main` and short-lived feature branches. Create a branch, commit, open a PR, merge to main, deploy. No `develop`, no `release`. Works well for teams deploying continuously but not doing feature flag-driven development." },
			{ id: "s8-h2d", type: "h2", content: "How to Choose" },
			{ id: "s8-ul1", type: "ul", content: "- **Trunk-based**: high-trust team, fast CI, feature flags in place, deploy multiple times/day\n- **GitHub Flow**: small team, clear PR reviews, deploy on merge\n- **Gitflow**: scheduled releases, multiple supported versions, regulatory release management" },
			{ id: "s8-h2e", type: "h2", content: "Commit Message Conventions" },
			{ id: "s8-p5", type: "paragraph", content: "Whatever branching model you choose, Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) pay dividends. They enable automated changelogs, semantic versioning, and a git history that actually communicates intent." },
			{ id: "s8-code2", type: "code", content: `# Conventional commit examples
git commit -m "feat(auth): add magic link sign-in"
git commit -m "fix(api): handle null user in session middleware"
git commit -m "docs: update deployment guide for k8s setup"
git commit -m "perf(db): add index on posts.published_at"

# Breaking change
git commit -m "feat!: remove deprecated v1 API endpoints

BREAKING CHANGE: /api/v1/* routes have been removed.
Migrate to /api/v2/* — see migration guide in README."`, meta: { language: "bash" } },
			{ id: "s8-sep", type: "separator", content: "---" },
			{ id: "s8-p6", type: "paragraph", content: "The best branching strategy is the one your team actually follows consistently. Start simple, add process only when a real pain point demands it." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 9 — Writing Tests That Help (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed209",
		slug: "writing-tests-that-actually-help",
		title: "Writing Tests That Actually Help",
		excerpt: "Most test suites pass when the app is broken. Here's how to write tests that catch real bugs, document behaviour, and survive refactors.",
		authorId: "seed-user-jane",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed002",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed112", "f1843afa-81d3-4b51-aaf4-72a9345ed101"],
		featuredImageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 3560,
		readTimeMinutes: 9,
		publishedAt: "2026-03-08T09:00:00.000Z",
		blocks: [
			{ id: "s9-h1", type: "h1", content: "Writing Tests That Actually Help" },
			{ id: "s9-p1", type: "paragraph", content: "I've worked in codebases with 90% test coverage where deployments still broke prod weekly. Test coverage is a proxy metric, not the goal. The goal is confidence that the software does what it should. Here's how to get there." },
			{ id: "s9-h2a", type: "h2", content: "Test Behaviour, Not Implementation" },
			{ id: "s9-p2", type: "paragraph", content: "The most brittle tests check how something is implemented — which function was called, in what order, with what arguments. These tests break every refactor even when behaviour is unchanged. Test the observable output for a given input instead." },
			{ id: "s9-code1", type: "code", content: `// ❌ Implementation test — breaks on any refactor
it("calls hashPassword then insertUser", async () => {
  const hashSpy = jest.spyOn(crypto, "hashPassword");
  const insertSpy = jest.spyOn(db, "insert");
  await createUser({ email: "a@b.com", password: "secret" });
  expect(hashSpy).toHaveBeenCalledWith("secret");
  expect(insertSpy).toHaveBeenCalled();
});

// ✅ Behaviour test — survives any implementation change
it("stores a hashed password, never the raw one", async () => {
  const user = await createUser({ email: "a@b.com", password: "secret" });
  const stored = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });
  expect(stored?.password).not.toBe("secret");
  expect(stored?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
});`, meta: { language: "typescript" } },
			{ id: "s9-h2b", type: "h2", content: "The Testing Trophy, Not the Pyramid" },
			{ id: "s9-p3", type: "paragraph", content: "Kent C. Dodds' testing trophy is more accurate than the pyramid for modern applications: a thin layer of unit tests for pure functions, a thick band of integration tests against a real database and real HTTP, a thin E2E layer for critical user journeys, and static analysis (TypeScript + ESLint) doing the work that tests used to do." },
			{ id: "s9-h2c", type: "h2", content: "Integration Tests Against a Real Database" },
			{ id: "s9-p4", type: "paragraph", content: "The most impactful tests I've ever written are integration tests that spin up a test database, run a migration, execute server functions, and assert on the database state. They catch ORM bugs, migration errors, and constraint violations that unit tests never will." },
			{ id: "s9-code2", type: "code", content: `// Vitest + a test Postgres instance
describe("createPost", () => {
  beforeEach(async () => {
    await db.delete(posts);  // clean state
  });

  it("publishes a post and increments author post count", async () => {
    const post = await createPost({
      title: "Test Post",
      content: "Hello world",
      status: "published",
      authorId: testAuthor.id,
    });

    const [author] = await db
      .select({ postCount: authorProfiles.postCount })
      .from(authorProfiles)
      .where(eq(authorProfiles.userId, testAuthor.id));

    expect(post.status).toBe("published");
    expect(author.postCount).toBe(1);
  });
});`, meta: { language: "typescript" } },
			{ id: "s9-h2d", type: "h2", content: "Tests as Documentation" },
			{ id: "s9-p5", type: "paragraph", content: "A well-written test file is better documentation than any README. It shows exactly what inputs produce what outputs, how edge cases are handled, and what the system's invariants are. Write test descriptions that read like specifications, not code comments." },
			{ id: "s9-alert1", type: "alert", content: "If a test is hard to write, it's usually a signal that the code under test has too many dependencies or responsibilities — not that you should mock more aggressively.", meta: { variant: "info" } },
			{ id: "s9-sep", type: "separator", content: "---" },
			{ id: "s9-p6", type: "paragraph", content: "Write tests to remove fear. Fear of refactoring, fear of deploys, fear of touching the legacy module. When tests accomplish that, you've done it right." },
		],
	},

	// -------------------------------------------------------------------------
	// POST 10 — Node.js Performance Profiling (NEW)
	// -------------------------------------------------------------------------
	{
		id: "f1843afa-81d3-4b51-aaf4-72a9345ed210",
		slug: "nodejs-performance-profiling",
		title: "Node.js Performance Profiling: Finding and Fixing Bottlenecks",
		excerpt: "CPU profiles, heap snapshots, event loop lag, and the tools to track down the real cause of your Node.js performance problems.",
		authorId: "seed-user-john",
		categoryId: "f1843afa-81d3-4b51-aaf4-72a9345ed001",
		tagIds: ["f1843afa-81d3-4b51-aaf4-72a9345ed111", "f1843afa-81d3-4b51-aaf4-72a9345ed106"],
		featuredImageUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&h=630&fit=crop",
		status: "published",
		viewCount: 2760,
		readTimeMinutes: 10,
		publishedAt: "2026-03-10T09:00:00.000Z",
		blocks: [
			{ id: "s10-h1", type: "h1", content: "Node.js Performance Profiling: Finding and Fixing Bottlenecks" },
			{ id: "s10-p1", type: "paragraph", content: "Performance problems in Node.js fall into three categories: CPU-bound work blocking the event loop, memory leaks growing the heap, and I/O waiting on slow external dependencies. Each requires a different tool and a different fix." },
			{ id: "s10-h2a", type: "h2", content: "Measuring Event Loop Lag" },
			{ id: "s10-p2", type: "paragraph", content: "The event loop should cycle in microseconds. When it takes milliseconds, every request queued behind a blocking operation waits. Measure lag first — it tells you whether you have a CPU problem at all." },
			{ id: "s10-code1", type: "code", content: `import { monitorEventLoopDelay } from "perf_hooks";

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();

setInterval(() => {
  console.log({
    mean:   (histogram.mean / 1e6).toFixed(2) + "ms",
    p99:    (histogram.percentile(99) / 1e6).toFixed(2) + "ms",
    max:    (histogram.max / 1e6).toFixed(2) + "ms",
  });
  histogram.reset();
}, 5000);`, meta: { language: "typescript" } },
			{ id: "s10-h2b", type: "h2", content: "CPU Profiling with --prof" },
			{ id: "s10-p3", type: "paragraph", content: "Node's built-in V8 profiler samples the call stack and writes an isolate log. Run your app with `--prof`, apply load, stop, process the log, and you get a flamegraph showing exactly where CPU time goes." },
			{ id: "s10-code2", type: "code", content: `# Collect a CPU profile
node --prof server.js

# Apply load (ab, wrk, k6...)
wrk -t4 -c100 -d30s http://localhost:3000/api/posts

# Stop the server, then process the log
node --prof-process isolate-*.log > profile.txt

# Or use clinic.js for a nicer flamegraph
npx clinic flame -- node server.js`, meta: { language: "bash" } },
			{ id: "s10-h2c", type: "h2", content: "Heap Snapshots for Memory Leaks" },
			{ id: "s10-p4", type: "paragraph", content: "Memory leaks in Node.js are almost always caused by unintended object retention — event listeners not removed, closures capturing large objects, global caches that never expire. Take two heap snapshots (before and after load) and diff them to find what's growing." },
			{ id: "s10-code3", type: "code", content: `import v8 from "v8";
import fs from "fs";

// Route only available in dev/staging
app.get("/_debug/heap-snapshot", (req, res) => {
  const filename = \`heap-\${Date.now()}.heapsnapshot\`;
  v8.writeHeapSnapshot(filename);
  res.json({ file: filename });
});

// Then open in Chrome DevTools → Memory → Load Snapshot`, meta: { language: "typescript" } },
			{ id: "s10-h2d", type: "h2", content: "Common Culprits" },
			{ id: "s10-ul1", type: "ul", content: "- **JSON.parse / JSON.stringify on large payloads**: move to streaming parsers\n- **Synchronous crypto operations**: use async variants\n- **Unindexed database queries**: EXPLAIN ANALYSE before optimising in code\n- **N+1 queries**: dataloader or join — never query inside a loop\n- **Missing `await`**: async work runs but errors are silently swallowed" },
			{ id: "s10-bq1", type: "blockquote", content: "Profile first. Optimise second. Never guess." },
			{ id: "s10-sep", type: "separator", content: "---" },
			{ id: "s10-p5", type: "paragraph", content: "Most Node.js performance problems are not algorithmic. They are an N+1 query, a missing index, or a synchronous operation on a hot path. Find the actual bottleneck before writing a single line of optimisation code." },
		],
	},
];

// =============================================================================
// COMMENTS  (approved, seed directly — 2-3 per key post)
// =============================================================================

export const BLOG_SEED_COMMENTS: BlogSeedComment[] = [
	// Post 1 — Building Scalable Applications
	{ id: "c1843afa-0001-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", authorId: "seed-user-jane",   content: "The expand/contract pattern for schema migrations is something every team should standardise on. We got badly burned before we learned this lesson.",                              status: "approved" },
	{ id: "c1843afa-0002-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", authorId: "seed-user-sarah",  content: "Great point on observability. One thing I'd add — define your SLOs before you instrument, not after. It focuses what you actually measure.",                                   status: "approved" },
	// Post 2 — Future of Web Development
	{ id: "c1843afa-0003-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", authorId: "seed-user-alex",   content: "The section on AI assistance being useful but not magic is exactly the framing teams need. It's a powerful junior, not a senior architect.",                               status: "approved" },
	{ id: "c1843afa-0004-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", authorId: "seed-user-marcus", content: "Edge runtimes are genuinely exciting but the lack of Node.js compatibility is still a real pain point. Worth noting Cloudflare Workers has node_compat mode now.",            status: "approved" },
	// Post 3 — TypeScript
	{ id: "c1843afa-0005-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed203", authorId: "seed-user-emma",   content: "The `satisfies` operator example finally made it click for me. I'd been using `as const` for this which is much less precise.",                                           status: "approved" },
	{ id: "c1843afa-0006-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed203", authorId: "seed-user-jane",   content: "Template literal types changed how I write event systems. The autocomplete you get when event names are typed is worth the upfront complexity.",                          status: "approved" },
	// Post 4 — React Server Components
	{ id: "c1843afa-0007-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", authorId: "seed-user-john",   content: "The 'push the client boundary as far down as possible' principle is the single most important RSC heuristic. Took our team a while to really internalise it.",           status: "approved" },
	{ id: "c1843afa-0008-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", authorId: "seed-user-alex",   content: "Question: how do you handle authentication in Server Components? Do you call the session function directly or pass it down through context?",                            status: "approved" },
	{ id: "c1843afa-0009-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", authorId: "seed-user-marcus", content: "The waterfall fetch problem is real. We had a component tree that was doing 6 sequential fetches on page load. RSC collapsed that to one round-trip. Huge win.",        status: "approved" },
	// Post 5 — Container Queries
	{ id: "c1843afa-0010-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", authorId: "seed-user-jane",   content: "Finally! I've been waiting for container queries to become baseline for years. The card example is exactly the use case that sold me on them.",                         status: "approved" },
	{ id: "c1843afa-0011-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", authorId: "seed-user-sarah",  content: "The `cqi` unit is underrated. Typography that scales with the container rather than the viewport makes so much more sense for component libraries.",                    status: "approved" },
	// Post 6 — Zero Downtime Deployment
	{ id: "c1843afa-0012-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", authorId: "seed-user-john",   content: "The three-deployment expand/contract for database changes is the right approach. One thing to add: keep a checklist of which stage each in-flight migration is at.",  status: "approved" },
	{ id: "c1843afa-0013-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", authorId: "seed-user-sarah",  content: "Feature flags deserve their own post. Especially the gotchas — stale flag cleanup is its own whole discipline.",                                                       status: "approved" },
	// Post 7 — Junior to Senior
	{ id: "c1843afa-0014-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", authorId: "seed-user-marcus", content: "The 'boring systems' point hit hard. Our most reliable systems were built by the least dramatic engineers. Alarm fatigue is real.",                                   status: "approved" },
	{ id: "c1843afa-0015-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", authorId: "seed-user-emma",   content: "Written communication being load-bearing is so true. I started treating my design docs as seriously as my code and it changed how other teams perceived my work.",      status: "approved" },
	{ id: "c1843afa-0016-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", authorId: "seed-user-alex",   content: "Confidence without certainty is the hardest thing to learn. Still working on it honestly.",                                                                           status: "approved" },
	// Post 8 — Git Workflows
	{ id: "c1843afa-0017-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed208", authorId: "seed-user-jane",   content: "Switched to trunk-based 18 months ago and never going back. The key enabler was getting CI under 4 minutes. Above that, people stop waiting for green.",             status: "approved" },
	{ id: "c1843afa-0018-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed208", authorId: "seed-user-john",   content: "Conventional commits are underrated. Once you have them, generating changelogs and bumping semver automatically is trivial.",                                           status: "approved" },
	// Post 9 — Writing Tests
	{ id: "c1843afa-0019-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", authorId: "seed-user-marcus", content: "The 'test behaviour not implementation' principle took me years to really get. Mocking internals is seductive but it means your tests are testing the test, not the code.", status: "approved" },
	{ id: "c1843afa-0020-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", authorId: "seed-user-sarah",  content: "Integration tests against a real database are non-negotiable for any data-layer code. I've seen too many in-memory mock databases that don't match production constraints.", status: "approved" },
	// Post 10 — Node.js Performance
	{ id: "c1843afa-0021-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed210", authorId: "seed-user-emma",   content: "The N+1 query point can't be said enough. Profiling our GraphQL API found an N+1 that was making 80 queries per request. Turned into 1 with dataloader.",             status: "approved" },
	{ id: "c1843afa-0022-4b51-aaf4-72a9345ed001", postId: "f1843afa-81d3-4b51-aaf4-72a9345ed210", authorId: "seed-user-alex",   content: "Clinic.js flame is fantastic for visualising the CPU profile. The autoclave tool is also worth looking at for leaks if heap snapshots feel too low-level.",             status: "approved" },
];

// =============================================================================
// REACTIONS  (likes distributed across posts and authors)
// =============================================================================

export const BLOG_SEED_REACTIONS: BlogSeedReaction[] = [
	// Post 1
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", userId: "seed-user-sarah",  type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", userId: "seed-user-marcus", type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed201", userId: "seed-user-emma",   type: "like" },
	// Post 2
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", userId: "seed-user-marcus", type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed202", userId: "seed-user-emma",   type: "like" },
	// Post 3
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed203", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed203", userId: "seed-user-sarah",  type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed203", userId: "seed-user-emma",   type: "like" },
	// Post 4
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", userId: "seed-user-sarah",  type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", userId: "seed-user-marcus", type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed204", userId: "seed-user-emma",   type: "like" },
	// Post 5
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed205", userId: "seed-user-sarah",  type: "like" },
	// Post 6
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", userId: "seed-user-sarah",  type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed206", userId: "seed-user-emma",   type: "like" },
	// Post 7
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", userId: "seed-user-marcus", type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed207", userId: "seed-user-emma",   type: "like" },
	// Post 8
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed208", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed208", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed208", userId: "seed-user-sarah",  type: "like" },
	// Post 9
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", userId: "seed-user-john",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", userId: "seed-user-alex",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", userId: "seed-user-marcus", type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed209", userId: "seed-user-emma",   type: "like" },
	// Post 10
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed210", userId: "seed-user-jane",   type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed210", userId: "seed-user-sarah",  type: "like" },
	{ postId: "f1843afa-81d3-4b51-aaf4-72a9345ed210", userId: "seed-user-emma",   type: "like" },
];

export const BLOG_SEED_FALLBACK_POST_BY_SLUG = Object.fromEntries(
	BLOG_SEED_POSTS.map((post) => [post.slug, post]),
);
