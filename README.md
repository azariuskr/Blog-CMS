# BlogCMS — Multi-Tenant Publishing Platform

A production-grade publishing platform built on TanStack Start + React 19. Supports Medium-style unified blogs, standalone sites with custom domains, a block-based content editor, and a visual page builder — all from a single codebase.

Derived from `azariuskr/template-main`. All infrastructure (auth, billing, storage, jobs, RBAC) is inherited from the template.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR) + React 19 |
| Router | TanStack Router (file-based, `src/routes/`) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (RBAC, passkeys, sessions, admin) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Data fetching | TanStack Query |
| State | TanStack Store |
| Jobs | Inngest |
| Storage | MinIO (S3-compatible) |
| Cache | Redis |
| Billing | Stripe + Polar |
| Email | Nodemailer |
| i18n | i18next (English + Bulgarian) |
| Editor | Custom dnd-kit block editor + TipTap (inline) |
| Page builder | Puck (structured pages/campaigns) |
| Linting | Biome |
| Container | Docker Compose |
| Base path | `/blog/` (Vite) + `/blog` (TanStack Router) |

---

## Architecture

### The Core Abstraction: `site`, not `blog`

The central entity is a **site**, not a post or a blog. An organization (tenant) can create multiple sites, each with its own mode, domain, theme, and content:

```
organization  (Better Auth Organizations plugin — replaces custom tenants table)
  └── site (mode: blog | product-page | content-hub | campaign | hybrid)
        ├── siteDomains       (custom domains, subdomain routing)
        ├── themeConfig       (primaryColor, fontFamily, layout, darkMode)
        ├── navConfig / footerConfig / seoConfig
        └── posts / pages / categories / tags / media
```

**Multi-tenancy** is provided by the native **Better Auth `organizations()` plugin**:
- `organization` table — the tenant entity (`id`, `name`, `slug`, `logo`, `metadata`, `plan`, `isPersonal`)
- `member` table — users per org with roles: `owner` / `admin` / `editor` / `author` / `contributor`
- `invitation` table — email-based invitations with role, expiry, accept/decline
- `session.activeOrganizationId` — active org context in every session (no manual tenant resolution)
- `better-auth-ui` provides ready-made OrgSwitcher, CreateOrganization, InviteMember components

This enables:
- **Unified blog mode** — Medium/Substack style: one domain, one theme, community authors, tags/categories
- **Standalone site mode** — one product = one page = one domain = custom theme
- **Mixed mode** — `brand.com` as main blog + `launch.brand.com` as campaign page

### Route Structure

```
/(blog)/              Public blog (Wren dark theme — Oxford Blue + Cyan)
  /                   Homepage (hero, topics, featured posts, sidebar)
  /$slug              Post detail page
  /authors            Authors directory
  /@$username         Author profile page
  /topics             Topics / categories
  /search             Full-text search
  /about              About page

/(authenticated)/     Requires login
  /dashboard          Dashboard
  /account/$view      Settings, security, sessions, appearance, notifications
  /editor/new         Write a new post (all roles)
  /billing            User billing (Stripe/Polar)
  /admin/             Admin panel (sidebar layout)
    /users            User management (list, ban, role, impersonate)
    /rbac/{roles,routes,permissions}
    /blog/
      /posts          Post list + CRUD
      /posts/new      New post (admin)
      /posts/$id.edit Edit post (admin)
      /categories     Category management
      /tags           Tag management
      /comments       Comment moderation
      /authors        Author profiles
      /sites          Site builder (Puck)
      /analytics      Blog analytics
    /billing/{index,subscriptions,customers,credits}
    /storage          File manager

/(auth-pages)/        Login, signup, 2FA, magic link, passkey, email OTP
```

### Database Schema

Multi-tenancy tables (`organization`, `member`, `invitation`) are managed by **Better Auth** (auto-generated via `pnpm auth:generate`, do not edit manually).
CMS-specific tables are in `src/lib/db/schema/cms.schema.ts`.

| Table | Source | Purpose |
|---|---|---|
| `organization` | Better Auth | Top-level org/tenant (replaces custom `tenants` table) |
| `member` | Better Auth | Users per org with role: owner/admin/editor/author/contributor |
| `invitation` | Better Auth | Email invitations with role, expiry, status |
| `sites` | CMS schema | A site belonging to an organization (`organizationId` FK) |
| `siteDomains` | CMS schema | Custom domains per site |
| `authorProfiles` | CMS schema | Public author profile (username, bio, social links) |
| `categories` | CMS schema | Hierarchical categories per site |
| `tags` | CMS schema | Tags per site |
| `posts` | CMS schema | Blog posts (MDX text + block JSON + versioning, `isPremium`, `previewBlocks`) |
| `postVersions` | CMS schema | Full version history per post |
| `postTags` | CMS schema | Many-to-many post ↔ tag |
| `pages` | CMS schema | Static pages per site |
| `comments` | CMS schema | Threaded comments with moderation status |
| `reactions` | CMS schema | 5 reaction types (like, love, celebrate, insightful, curious) |
| `bookmarks` | CMS schema | Post bookmarks per user |
| `follows` | CMS schema | User → author follows |
| `media` | CMS schema | Uploaded media per site |
| `newsletterSubscribers` | CMS schema | Newsletter subscribers per site |

Post content is dual-stored:
- `posts.content` — raw MDX string (for git-backed publishing + markdown rendering)
- `posts.blocks` — structured block JSON (for the block editor + direct rendering)

### RBAC (two layers)

**App-level roles** (Better Auth admin plugin — global across all orgs):
```
user → moderator → admin → superAdmin
```

| App Role | Blog permissions |
|---|---|
| user | `posts:create,read,update` (own posts) |
| moderator | `posts:create,read,update,delete` + `comments_mod:read,approve,delete` |
| admin | `posts:create,read,update,delete,publish` + comment moderation |
| superAdmin | Full control including `posts:feature` + `rbac:write` |

**Org-level roles** (Better Auth organizations plugin — scoped per organization):
```
owner → admin → editor → author → contributor
```

| Org Role | Permissions |
|---|---|
| owner | Full org control, billing, delete org |
| admin | Manage members, invitations, sites |
| editor | `posts:create,read,update,delete,publish` |
| author | `posts:create,read,update` (own posts) |
| contributor | `posts:create,read` (submit for review) |

---

## Monetization

The platform supports **premium content gating** — individual posts can be marked as subscriber-only, with a configurable free preview and a paywall UI for non-subscribers.

### Post-level fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `posts.isPremium` | boolean | `false` | Mark post as subscriber-only |
| `posts.previewBlocks` | integer | `3` | Blocks visible before the paywall cutoff |

### Platform subscription (v1)

A single platform-wide subscription unlocks all premium content:
- Uses existing **Stripe / Polar** billing infrastructure
- `user.subscriptionStatus: boolean` tracks active subscription on the auth user record
- `$getPostBySlug` enforces gating server-side: non-subscribers receive only the first `previewBlocks` blocks + `isLocked: true`
- `$createSubscription` server function creates a Stripe/Polar checkout session
- Stripe webhook (`customer.subscription.created/deleted`) flips `user.subscriptionStatus`

### Reader experience

1. Non-subscriber opens a premium post → sees first N blocks (configurable per post)
2. Last visible block gets a **CSS gradient fade** mask (`mask-image: linear-gradient(to bottom, black 60%, transparent 100%)`)
3. A **paywall card** renders below the fade: lock icon + "Subscribe to continue reading" CTA
4. After subscribing → full content renders, no paywall

### Feed

Post cards show a `✦ Premium` badge (accent color) when `isPremium = true`.

### Implementation reference

See `references/next-saas-blog/` for the working implementation of all monetization primitives. Our approach adapts it from Next.js/Supabase RLS to TanStack Start server functions + Drizzle, and adds a gradient-fade preview (vs the reference's hard cut).

### Org-level subscription (v2 — planned)

Future: per-author/org subscription model (Substack style) — each org manages its own Stripe product + price. Deferred until platform-subscription v1 is validated.

---

## Content Editor Architecture

Two editors for two use cases:

### Block Editor (for blog posts / articles)
- **Component**: `src/components/admin/blog/editor/BlockEditor.tsx`
- **Stack**: dnd-kit (drag-drop reorder) + TipTap (inline rich text in paragraphs)
- **Block types**: heading (h1-h6), paragraph, blockquote, alert, code (Shiki), image, video, link card, bullet/numbered/task lists, table, separator, math (LaTeX), diagram (Mermaid), columns, gallery
- **Modes**: Edit / Preview / Split view
- **Auto-save**: every 5 seconds, saves to `postVersions` + `posts`
- **Output**: `Block[]` JSON → stored in `posts.blocks` JSONB; also serialized to MDX string → stored in `posts.content`

### Page Builder (for sites / landing pages / campaigns)
- **Library**: Puck (`measuredco/puck`)
- **Route**: `/admin/blog/sites`
- **Output**: Puck JSON → stored in `pages.blocks` JSONB
- **SSR render**: `<Render config={puckConfig} data={pages.blocks} />` — no editor loaded on the public side

---

## Server Functions

All server functions use the Result pattern and Zod validation.

### Blog (`src/lib/blog/functions.ts`)

| Function | Method | Permission |
|---|---|---|
| `$listPublishedPosts` | GET | Public |
| `$getPostBySlug` | GET | Public |
| `$listAdminPosts` | GET | `content:read` |
| `$upsertPost` | POST | `content:write` |
| `$deletePost` | POST | `content:delete` |
| `$listCategories` | GET | `content:read` |
| `$upsertCategory` | POST | `content:write` |
| `$deleteCategory` | POST | `content:delete` |
| `$listTags` | GET | `content:read` |
| `$createTag` | POST | `content:write` |
| `$deleteTag` | POST | `content:delete` |
| `$listComments` | GET | `content:read` |
| `$approveComment` | POST | `content:write` |
| `$spamComment` | POST | `content:write` |
| `$deleteComment` | POST | `content:delete` |
| `$getAuthorByUsername` | GET | Public |
| `$listAuthors` | GET | Public |
| `$toggleReaction` | POST | Auth required |
| `$toggleBookmark` | POST | Auth required |
| `$toggleFollow` | POST | Auth required |
| `$getFollowStatus` | GET | Auth required |
| `$createSubscription` | POST | Auth required — creates Stripe/Polar checkout for platform subscription |

---

## Key Patterns

### Server function signature
```typescript
export const $myFunction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(MySchema, data))
  .middleware([accessMiddleware({ permissions: { content: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;
      // data.data is now typed
    }, { successMessage: "Saved" });
  });
```

### Result pattern
```typescript
import { Ok, Err, safe } from "@/lib/result";

const result = await safe(asyncOperation());
if (!result.ok) return Err(result.error);
return Ok(result.data);
```

### Query + mutation
```typescript
// Query
const posts = useQuery(QUERY_KEYS.BLOG.POSTS.PAGINATED(params));

// Mutation
const save = useAction(fromServerFn($upsertPost), {
  successMessage: MESSAGES.SUCCESS.SAVED,
  invalidateKeys: [QUERY_KEYS.BLOG.POSTS.PAGINATED_BASE],
});
```

### Adding a new feature checklist
1. Add route path to `ROUTES` in `src/constants.ts`
2. Add route config to `routeConfig` in `src/lib/auth/permissions.ts`
3. Add to `NAV_STRUCTURE` in `src/lib/auth/navigation.ts` if nav-visible
4. Create route file under `src/routes/`
5. Create server function with `createServerFn` + `accessMiddleware` + `validate`
6. Add query options + query hook
7. Add mutation hook with `useAction(fromServerFn(...))`
8. Add query keys to `QUERY_KEYS` in constants

---

## UI Theme

The public blog uses the **Wren** design system — a custom dark theme distinct from the admin's shadcn theme.

| Token | Value |
|---|---|
| Background | `hsl(222,47%,11%)` — Oxford Blue |
| Surface | `hsl(222,44%,13%)` |
| Accent | `hsl(199,89%,49%)` — Sky Cyan |
| Accent 2 | `hsl(180,70%,45%)` — Teal |
| Text primary | `hsl(216,100%,95%)` |
| Text muted | `hsl(217,24%,59%)` |

CSS utility classes: `wren-btn`, `wren-card`, `wren-badge`, `wren-gradient-text`, `wren-section`, `headline`, `headline-1/2/3`, `btn-icon`

---

## Blog data modes & seeding

The blog query layer supports three data modes via `BLOG_DATA_MODE` (or `VITE_BLOG_DATA_MODE` on the client):

- `live` — use database-backed blog queries only
- `mock` — force seed/fallback data only
- `hybrid` — default; use live data first and fall back to seed data when the live query fails

Useful commands:

```bash
# Seed blog data with asset uploads enabled (default)
pnpm seed:blog

# Seed blog data without uploading remote assets into storage
pnpm seed:blog:no-assets

# Example: force mock mode locally
BLOG_DATA_MODE=mock pnpm dev
```

# Development

```bash
# Install
pnpm install

# Dev server (inside Docker)
docker-compose up -d web

# Or local dev
pnpm dev

# Database
pnpm db:migrate      # Run migrations
pnpm db:studio       # Drizzle Studio UI

# Auth
pnpm auth:secret     # Generate Better Auth secret
pnpm auth:generate   # Regenerate auth schema

# Quality
pnpm lint
pnpm format
pnpm check
pnpm test
```

### Environment
Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — auth secret
- `REDIS_URL` — Redis connection string
- `MINIO_*` — MinIO/S3 config
- `STRIPE_*` / `POLAR_*` — billing (optional)
- `INNGEST_*` — job queue

### Docker
```bash
# Full stack (includes postgres, redis, minio, inngest, pgadmin, traefik)
docker-compose up -d

# Rebuild web only
docker-compose build web && docker-compose up -d web
```

Exposed at: `https://kris-hp-400.taile0e81a.ts.net/blog/` (Tailscale)

---

## References

- `references/Wren-cms/` — Complete HonoCMS prototype. Working `BlockEditor.tsx`, `blockTypes.ts`, `content-collections.ts`, full admin + public blog. **Primary reference for the block editor, block types, and MDX pipeline.**
- `references/next-saas-blog/` — Next.js SaaS blog with full Stripe subscription + premium content gating. **Primary reference for Phase 2.9 monetization.** Key files:
  - Schema design: `lib/types/index.ts`, `lib/types/supabase.ts` (`is_premium`, `is_published`, `subscription_status`, `stripe_customer_id`)
  - Admin toggles: `app/dashboard/blog/components/BlogTable.tsx` + `SwitchForm.tsx` (reusable `<Switch>` per row for premium/publish)
  - Content gating: `app/(home)/blog/[id]/components/Content.tsx` (null-check → `<Checkout />` paywall)
  - Paywall CTA: `components/stripe/Checkout.tsx` (login-gated → Stripe checkout button)
  - Billing portal: `components/stripe/ManageBill.tsx`
  - Stripe server actions: `lib/actions/stripe.ts` (`checkout()`, `manageBillingPortal()`)
  - Stripe webhook: `app/api/stripe/webhook/route.ts` (`customer.updated` + `customer.subscription.deleted`)
- `references/medium-clone/` — Medium-clone (React + Node + MongoDB) — UI/UX patterns for reader-facing experience.
- `references/blog-test/` — Integration guide for Result pattern, useAction, deduplication.
- `references/idea.md` — Original platform vision document (multi-tenant, site-centric model).
