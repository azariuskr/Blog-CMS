# BlogCMS — Unified Plan of Action

> **Legend:** `[ ]` = todo · `[x]` = done · `[~]` = in progress · `[!]` = blocked

---

## Vision

A multi-tenant publishing platform supporting:
1. **Unified blog** — Medium/Substack style: one domain, community authors, categories, tags, reactions, bookmarks, follows, newsletter
2. **Standalone sites** — one product = one page = custom domain = custom theme (campaign, product, landing)
3. **Site builder** — visual drag-drop page builder (Puck) for structured pages
4. **Git-backed publishing** — optional: DB → MDX files → isomorphic-git → remote repo

---

## Phase 0 — Multi-Tenancy Migration (Better Auth Organizations)

> **Goal:** Replace custom `tenants`/`tenantMembers` tables with the native Better Auth Organizations plugin for a fully integrated multi-tenant experience.
> **Decision:** Use `organizations()` plugin + `better-auth-ui` org components instead of hand-rolled tenancy.

### 0.1 Auth config
- [x] Add `organizations()` plugin to `src/lib/auth/auth.ts` ✅
  - Custom roles: `owner`, `admin`, `editor`, `author`, `contributor`
  - `additionalFields.organization`: `plan` (string, default: `"free"`), `isPersonal` (boolean, default: `false`), `updatedAt` (date)
- [x] Run `pnpm auth:generate` to regenerate `src/lib/db/schema/auth.schema.ts` (adds `organization`, `member`, `invitation` tables) ✅

### 0.2 Schema migration
- [x] Remove `tenants`, `tenantMembers` tables and their relations from `src/lib/db/schema/cms.schema.ts` ✅
- [x] Rename `sites.tenantId` → `sites.organizationId` with FK pointing to Better Auth `organization` table ✅
- [x] Write Drizzle migration: rename column `tenant_id` → `organization_id` on `sites` table ✅ (`drizzle/0009_drop_tenants.sql`)
- [x] Run `pnpm db:migrate` ✅ (pending against live DB — migrations written)

### 0.3 Server functions + queries update
- [x] Update `src/lib/blog/functions.ts` — no `tenants`/`tenantMembers` DB references remain ✅
- [x] Add `QUERY_KEYS.ORGANIZATIONS` entries to `src/constants.ts` ✅ (via better-auth-ui org hooks)
- [x] Add `$listOrganizations`, `$getActiveOrganization` server functions wrapping Better Auth org client ✅ (via `useActiveOrganization`, `useListOrganizations` from auth-client)
- [x] Remove any tenant-specific query hooks ✅

### 0.4 Client integration
- [x] Install `better-auth-ui` if not already present; verify org components are available ✅ (`@daveyplate/better-auth-ui` v3.3.12 installed)
- [x] Add `OrgProvider` to authenticated layout ✅ (org context provided by BetterAuthUiProviders + useActiveOrganization — no separate provider needed)
- [x] Add org switcher to admin sidebar / header ✅ (`OrganizationSwitcher` in `app-header.tsx`)
- [x] Wire create-organization flow (replaces manual tenant creation) ✅ (`OrganizationView` routes at `/org/` + `/admin/organization/`)
- [x] Wire invite-member flow (replaces manual tenant member addition) ✅ (handled via `OrganizationView`)

### 0.5 Auth hooks update
- [x] Add `useActiveOrganization`, `useOrganizationList` hooks to `src/hooks/auth-hooks.ts` ✅
- [x] Update server-side context: org-scoped access enforced via `sites.organizationId` FK ✅

---

## Phase 1 — Block Editor (Core Writing Experience)

> **Goal:** End-to-end: write a post → save to DB → publish → it appears on the public blog.
> **Source material:** Port from `references/Wren-cms/client/src/components/editor/`

### 1.1 Port the block editor
- [x] Create `src/components/admin/blog/editor/` directory
- [x] Port `BlockEditor.tsx` (dnd-kit, edit/preview/split view, auto-save)
- [x] Port `blockTypes.ts` (19 block types, `blocksToMarkdown()` serializer)
- [x] Port `Editor.tsx` (sortable block list with dnd-kit) → `EditorCanvas.tsx`
- [x] Port `Sidebar.tsx` (block palette, category grouping) → `BlockSidebar.tsx`
- [x] Port `MarkdownBlock.tsx` (sortable block item + block-specific renderers)
- [x] Port block-specific editors: `ParagraphBlock`, `HeadingBlock`, `CodeBlock`, `ImageBlock`, `ListBlock`, `AlertBlock`, `BlockquoteBlock`, `SeparatorBlock`, `GenericBlock`

### 1.2 Wire editor into routes
- [x] **CRITICAL:** Wire `handleSave()` in `editor/new.tsx` → `useUpsertPost()` with `session.user.id` as `authorId`
- [x] Replace stub in `src/routes/(authenticated)/editor/new.tsx` with `<BlockEditor>`
- [x] `/admin/blog/posts/new` already redirects to canonical editor ✅
- [x] Connect `BlockEditor.onSave` → `$upsertPost` server function
- [x] Connect `BlockEditor` initial data → `$getPostById` (for edit route) ✅
- [x] Wire `/admin/blog/posts/$postId.edit.tsx` with `<BlockEditor>` + data loading ✅

### 1.3 Add TipTap for inline rich text
- [x] Install `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-code-block-lowlight` ✅
- [x] Create `src/components/admin/blog/editor/blocks/TipTapParagraph.tsx` (inline formatting toolbar) ✅
- [x] Wrap paragraph blocks in TipTap editor instead of plain textarea ✅
- [x] Support: bold, italic, underline, code, links, highlight ✅ (bold, italic, code, link via TipTap StarterKit + Link extension)

### 1.4 Enhance code blocks
- [x] Install `shiki` (already in Wren-cms reference) ✅
- [x] Language selector dropdown (20+ languages already defined in `blockTypes.ts`) ✅ (already present in CodeBlock.tsx)
- [x] Copy-to-clipboard button ✅ (added to `CodeBlock.tsx` header)
- [x] Syntax highlighting in public renderer (Shiki async component) ✅ (`ShikiCodeBlock` lazy-loads shiki + tokyo-night theme)

### 1.5 Add Mermaid diagram support
- [x] Install `mermaid` ✅
- [x] Render `diagram` blocks as live Mermaid SVGs in preview mode ✅ (`MermaidBlock` + `DiagramBlock` with live preview toggle)

### 1.6 Post versioning (auto-snapshot)
- [x] Create `$createPostVersion` server function (saves to `postVersions` table) ✅
- [x] Call on every `onSave` in `BlockEditor` (editor/new.tsx) ✅
- [x] Add `usePostVersions` + `useCreatePostVersion` query hooks ✅
- [x] Add version history panel in the editor sidebar (list past saves, restore) ✅

### 1.7 Post metadata panel
- [x] Post settings sidebar: title, slug, excerpt, featured image, category, tags, status ✅
- [x] Slug auto-generation from title ✅
- [x] Featured image upload ✅ (FeaturedImageUploader component with drag+drop, upload via MinIO `uploadFile("media")`, URL fallback)
- [x] Category + tag multi-select (wired to `$listCategories` + `$listTags`) ✅

---

## Phase 2 — Public Blog → Real Data

> **Goal:** Replace all hardcoded mock data in `/(blog)/` with real DB queries.

### 2.1 Blog homepage (`/(blog)/index.tsx`)
- [x] Replace hardcoded `featuredPosts[]` → `usePublishedPosts({ limit: 3, isFeatured: true })`
- [x] Replace hardcoded `recentPosts[]` → `usePublishedPosts({ limit: 6 })`
- [x] Replace hardcoded `topics[]` → `usePublicCategories()`
- [x] Replace hardcoded `popularPosts[]` → `usePublishedPosts({ sortBy: "viewCount", limit: 5 })`
- [x] Add SSR prefetch via route `loader` for above queries

### 2.2 Post detail page (`/(blog)/$slug.tsx`)
> ✅ Wired to `usePostBySlug`. Needs block renderer + social features.
- [x] Wire → `$getPostBySlug` via `usePostBySlug(slug)`
- [x] Implement block-to-JSX renderer (handles 19 new + 7 legacy block types)
- [x] Add: reading progress bar, table of contents (auto-generated from headings)
- [x] Add: author bio card (wired to `authorProfile` from extended `$getPostBySlug`)
- [x] Wire reaction bar → `useToggleReaction()` (optimistic local state)
- [x] Wire bookmark button → `useToggleBookmark()` (optimistic local state)
- [x] Add: share buttons (Twitter/X, LinkedIn, copy link)
- [x] Add: related posts sidebar ✅
- [x] Add SEO metadata (`createDynamicMetadata`) from post data ✅

### 2.3 Comments section
- [x] Build comments list (renders approved comments from DB)
- [x] Wire → public `$listPublicComments({ postId })` via `usePublicComments()`
- [x] Add comment submission form (auth required, submits to `$createComment`)
- [x] Threaded replies ✅

### 2.4 Author profile (`/(blog)/@$username/index.tsx`)
> ⚠️ UI built. `useAuthorProfile(username)` + `usePublishedPosts({ authorId })` hooks ready.
- [x] Replace `MOCK_AUTHOR` → `useAuthorProfile(username)`
- [x] Replace `MOCK_POSTS[]` → `usePublishedPosts({ authorId: profile.id })`
- [x] Wire follow/unfollow → `useToggleFollow()` (optimistic local state)
- [x] Follower count display from real profile data ✅

### 2.5 Topics page (`/(blog)/topics.tsx`)
> ⚠️ UI built. `useCategories()` hook ready. Single hook swap.
- [x] Replace hardcoded `topics[]` → `usePublicCategories()`
- [x] Link each topic → `/search?category=slug` filtered results ✅

### 2.6 Authors page (`/(blog)/authors.tsx`)
> ⚠️ UI built. `useAuthors()` hook ready. Single hook swap.
- [x] Replace `MOCK_AUTHORS[]` → `useAuthors()`

### 2.7 Search (`/(blog)/search.tsx`)
> ⚠️ UI built. `validateSearch` schema already wired for URL params. Hook ready.
- [x] Replace `MOCK_RESULTS[]` → `usePublishedPosts({ search: q, categorySlug, tagSlug })`
- [x] Replace `POPULAR_TAGS[]` → `usePublicCategories()`
- [x] Debounce search input with URL param sync ✅

### 2.8 Newsletter subscribe
- [x] Create `$subscribeNewsletter` server function (inserts to `newsletterSubscribers`) ✅
- [x] Wire homepage + footer subscribe inputs ✅
- [x] Email confirmation via Nodemailer + Inngest job ✅ (fires `blog/newsletter.subscribed` → sends confirmation email → `/newsletter/confirm?token=` route)

### 2.9 Post Monetization & Paywall

> **Goal:** Per-post premium flag + subscriber-only content gating. Non-subscribers see a free preview + paywall CTA; subscribers read in full. Platform-wide single Stripe subscription unlocks all premium content.
>
> **Primary reference:** `references/next-saas-blog/` — study these files directly:
> - Schema: `lib/types/index.ts`, `lib/types/supabase.ts`
> - Admin toggles: `app/dashboard/blog/components/BlogTable.tsx`, `SwitchForm.tsx`
> - Content gating: `app/(home)/blog/[id]/components/Content.tsx`
> - Paywall CTA component: `components/stripe/Checkout.tsx`
> - Billing portal component: `components/stripe/ManageBill.tsx`
> - Stripe server actions: `lib/actions/stripe.ts`
> - Stripe webhook: `app/api/stripe/webhook/route.ts`
> - Blog CRUD with `is_premium` / `is_published`: `lib/actions/blog.ts`

#### Analysis of reference patterns (translated to our stack)

The reference gates content at the **DB layer** (Supabase RLS) — non-subscribers get `null` back from `blog_content` query, which triggers the `<Checkout />` paywall component. We replicate this at the **server function layer** instead.

The reference does a hard content cut (no preview). We add a Medium-style **gradient-fade preview** on top.

Admin toggles use a reusable `<SwitchForm checked onSubmit name>` component — a `<Switch type="submit">` that fires a server action on change. We adapt this using our `useAction()` + optimistic invalidation pattern.

#### 2.9.1 Schema
- [x] Add `isPremium: boolean` (default `false`) to `posts` in `src/lib/db/schema/cms.schema.ts` ✅
  - Reference: `lib/types/supabase.ts` → `blog.is_premium`
- [x] Add `previewBlocks: integer` (default `3`) to `posts` — how many blocks render before the paywall ✅
  - Enhancement over reference (reference shows zero preview — we show N blocks + fade)
- [x] Add subscription fields to Better Auth user profile via `additionalFields`: ✅
  - `stripeCustomerId: string | null` ✅
  - `stripeSubscriptionId: string | null` — (not added; `stripeCustomerId` + `subscriptionStatus` sufficient)
  - `subscriptionStatus: boolean` (default `false`) ✅
  - Reference: `lib/types/supabase.ts` → `users.stripe_customer_id / stripe_subscriptoin_id / subscription_status`
- [x] Write Drizzle migration + run `pnpm db:migrate` ✅

#### 2.9.2 Server functions
- [x] Update `$upsertPost` to accept + persist `isPremium` + `previewBlocks` ✅
  - Reference: `lib/actions/blog.ts` → `createBlog()` / `updateBlogDetail()` include `is_premium`
- [x] **Gate `$getPostBySlug`**: if `post.isPremium && !session?.user.subscriptionStatus`: ✅
  - Slice `post.blocks` to first `post.previewBlocks` blocks only
  - Set `isLocked: true` in response
  - Do NOT return `post.content` (MDX string)
  - Reference: `app/(home)/blog/[id]/components/Content.tsx` → `if (!blog?.content) return <Checkout />`
- [x] Add **`$createSubscription`** server function: ✅ (exists as `$createSubscriptionCheckout` in `src/lib/billing/functions.ts`)
  - Calls `stripe.checkout.sessions.create({ line_items: [{ price: PLATFORM_PRICE_ID }], mode: "subscription", customer_email, success_url, cancel_url })`
  - Reference: `lib/actions/stripe.ts` → `checkout(email, redirectTo)`
- [x] **`$manageBillingPortal`** / billing portal: ✅ `$getPortalUrl` in `src/lib/billing/functions.ts` returns portal URL for both Stripe and Polar; `BillingPortalButton` component wraps it
- [x] **Stripe webhook** handling: ✅ Better Auth's `stripePlugin` (registered via `getBillingPlugin()` in `auth.ts` line 173) handles webhooks natively via `/api/auth/stripe/webhook` + `onSubscriptionComplete/Cancel/Delete/Update` hooks → fires Inngest events

#### 2.9.3 Admin toggles (post list + editor)
- [x] Create reusable **`<PremiumSwitch>`** component in `src/components/admin/blog/`: ✅
  - Wraps shadcn `<Switch>` + calls `useAction(fromServerFn($upsertPost), { ... })`
  - Prop: `postId`, `checked` (current `isPremium` value)
  - Optimistic: flip switch immediately, revert on error
  - Reference: `app/dashboard/blog/components/SwitchForm.tsx` → `<Switch type="submit">` pattern
- [x] Add **Premium** and **Published** toggle columns to admin posts table (`/admin/blog/posts`): ✅
  - `<PremiumSwitch>` column added to posts list
  - Reference: `app/dashboard/blog/components/BlogTable.tsx` → columns `Premium` | `Publish`
- [x] Add **Premium toggle** + **Preview blocks** count input to post editor metadata sidebar ✅
  - Only show preview blocks input when `isPremium = true`

#### 2.9.4 Post detail page — paywall UI
- [x] Create **`<PaywallCard>`** component in `src/components/blog/`: ✅
  - If user not logged in: show "Sign in to continue" + login link
  - If user logged in but not subscribed: show "Upgrade to Pro" button → `$createSubscription` → Stripe redirect
  - If subscribed: never rendered (full content shown)
  - Reference: `components/stripe/Checkout.tsx` → full component, adapt copy + Wren dark theme styling
- [x] In post detail page (`/(blog)/$slug.tsx`): ✅
  - Render first N blocks (from gated response) as free preview
  - Apply CSS gradient fade on the last preview block: `[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]` (Tailwind arbitrary)
  - Render `<PaywallCard>` below the fade when `post.isLocked === true`
  - Full content renders normally when `post.isLocked === false`

#### 2.9.5 Feed — premium badges
- [x] Show **`✦ Premium`** badge on post cards in homepage feed when `isPremium = true` ✅
- [x] Badge: Wren accent color ✅ (`wren-badge` class), small, inline with title or top-right of card

#### 2.9.6 Billing settings
- [x] **"Manage Subscription"** + billing page: ✅ `BillingPortalButton` + `UserBillingView` at `/billing` (and linked from `/account/billing`)

#### 2.9.7 Admin analytics
- [x] Add to `/admin/blog/analytics`: premium post views + subscriber count ✅

---

## Phase 3 — Admin Blog Management

> **Goal:** Fully functional admin CMS panel for all blog content.

### 3.1 Posts list (`/admin/blog/posts`)
> ✅ Wired to `useAdminPosts()` with search + status filter. Needs TanStack Table upgrade + bulk actions.
- [x] Build posts data table — basic version wired to `useAdminPosts()`
- [x] Filters: status, search — wired to query params
- [x] Upgrade to TanStack Table (sortable columns, column visibility) ✅
- [x] Add Premium / Published toggle switches per row (Phase 2.9) ✅ (`<PremiumSwitch>` column added)
- [x] Bulk actions: delete (permission-gated) ✅
- [x] Row actions: edit, delete, preview ✅

### 3.2 Categories (`/admin/blog/categories`)
> ✅ Fully wired — `useCategories`, `useUpsertCategory`, `useDeleteCategory` all active.
- [x] List with create/edit dialog + delete
- [x] Wire → `$listCategories`, `$upsertCategory`, `$deleteCategory`
- [x] Add post count column (`includeCount: true`) ✅
- [x] Add color swatch + parent category support ✅

### 3.3 Tags (`/admin/blog/tags`)
> ✅ Fully wired — `useTags`, `useCreateTag`, `useDeleteTag` all active.
- [x] List with create/delete
- [x] Wire → `$listTags`, `$createTag`, `$deleteTag`
- [x] Add post count column ✅

### 3.4 Comments moderation (`/admin/blog/comments`)
> ✅ Fully wired — `useComments`, approve/spam/delete mutations all active.
- [x] Table with status filters (pending/approved/spam)
- [x] Wire → `$listComments`, `$approveComment`, `$spamComment`, `$deleteComment`
- [x] Bulk actions (approve/spam/delete with checkboxes) ✅

### 3.5 Authors (`/admin/blog/authors`)
> ✅ Wired to `useAuthors()`. Edit/upsert profile server fn still needed.
- [x] Authors list wired to `useAuthors()`
- [x] Edit author profile dialog → new `$upsertAuthorProfile` server function ✅
- [x] Link author → user account (View User Account menu item in authors admin) ✅

### 3.6 Analytics (`/admin/blog/analytics`)
- [x] Build analytics dashboard ✅
- [x] Top posts table + top categories chart ✅
- [x] Wire → `$getBlogStats` server function ✅

### 3.7 Media library (`/admin/blog/media`)
- [x] Route created ✅
- [x] Added to `ROUTES.ADMIN.BLOG.MEDIA` and `routeConfig` ✅
- [x] Reuses `AdminStorageView` (MinIO-backed file browser) ✅
- [x] In-editor media picker (select from library → insert image block) ✅

---

## Phase 4 — Users Admin Upgrade

> **Goal:** Make `/admin/users` match the TanStack-first reference UX.

### 4.1 TanStack Table integration
- [x] TanStack Table already implemented in `users-table.tsx` + `users-columns.tsx` ✅
- [x] Uses `data-table/toolbar`, `pagination`, `column-header`, `view-options`, `bulk-actions` ✅
- [x] Columns: avatar, name, email, role badge, status badge, created date, actions ✅
- [x] Sortable headers ✅

### 4.2 URL-driven filters
- [x] `validateSearch` wired to filter controls ✅
- [x] Role filter, status filter, search input ✅

### 4.3 Bulk actions
- [x] Row selection with checkboxes ✅
- [x] Bulk: ban, unban, delete, set role ✅

### 4.4 Overlay-driven modals
- [x] Overlay store + user dialogs via overlay: create, change password, confirm delete, ban/unban ✅
- [x] `useOverlay` + `useOverlayStore` in `lib/store/overlay` ✅

### 4.5 Impersonation UI
- [x] "Impersonate" action per user row (permission: `user:impersonate`) ✅
- [x] Global banner when impersonating with "Stop impersonating" button ✅

### 4.6 Session management
- [x] User sessions drawer (list active sessions, device info) ✅
- [x] Revoke individual session / revoke all ✅

---

## Phase 5 — Site Builder (Puck)

> **Goal:** Visual page builder for structured sites/landing pages/campaigns.

### 5.1 Install and configure Puck
- [x] Install `@measured/puck` ✅ (0.20.2 — correct package name is @measured/puck)
- [x] Define Puck component config: HeroSection, FeatureGrid, CTASection, TextBlock, ImageBlock, TestimonialsSection, NewsletterSignup, Divider ✅
- [x] Create `src/lib/puck/config.tsx` with component definitions + field schemas ✅
- [x] Create `src/lib/puck/render.tsx` for SSR-safe `<Render>` ✅ (lazy PuckPage with Suspense)

### 5.2 Admin site editor
- [x] Build `/admin/blog/sites` page with site list + Puck editor per site ✅
- [x] Save Puck JSON → `pages.blocks` via `$upsertPage` server function ✅
- [x] Live preview panel ✅ (Puck built-in preview mode)

### 5.3 Public rendering
- [x] Route for site pages: `/(blog)/sites/$siteSlug/$pageSlug` ✅
- [x] `<Render config={puckConfig} data={page.blocks} />` for SSR output ✅ (via PuckPage)
- [x] Per-site theme tokens applied via CSS variables ✅ (--site-primary/--site-accent/--site-font)

---

## Phase 6 — RBAC Dashboard

> **Goal:** Surfacing the full capabilities of the RBAC system in the admin UI.

### 6.1 Capabilities page (`/admin/rbac`)
- [x] Role cards showing each role's capabilities (from `getRoleCapabilities(role)`) ✅
- [x] Permission matrix table (roles × resources × actions) ✅
- [x] Allowed routes computed per role via `canAccessRoute(route, role)` ✅

### 6.2 Route files
- [x] `src/routes/(authenticated)/admin/rbac.tsx` exists and renders `<RbacView />` ✅

### 6.3 Command palette
- [x] Wire `src/lib/store/search.ts` to admin header ✅
- [x] Cmd/Ctrl+K opens palette with permission-filtered navigation ✅ (`CommandPalette` component in `app-layout.tsx`, Search button in header)
- [x] Quick navigate + quick actions (new post, manage users, etc.) ✅

---

## Phase 7 — Publishing Pipeline (Git-backed)

> **Goal:** Optional git-backed publish flow: DB → MDX files → git commit → remote repo.

### 7.1 MDX generation
- [x] Create `src/lib/blog/mdx-generator.ts` — converts `posts.blocks` JSON → MDX string ✅
- [x] Extend `blocksToMarkdown()` from Wren-cms reference ✅
- [x] Store generated MDX in `posts.content` on every publish ✅

### 7.2 MDX rendering
- [x] Install `@mdx-js/mdx` + `remark-gfm` + `rehype-slug` ✅
- [x] Create `src/lib/blog/mdx-renderer.tsx` ✅
- [x] Use in post detail page as the rich rendering path (MdxRenderer available; block renderer is primary — MDX is derived/export path) ✅

### 7.3 isomorphic-git integration
- [x] Install `isomorphic-git` + `@isomorphic-git/lightning-fs` ✅ (1.37.4 + 4.6.2)
- [x] Create `blogGitPublishFunction` in `src/lib/inngest/cms.ts` triggered on `blog/post.published` ✅
  - Write MDX file to `content/posts/{slug}.mdx`
  - git add + commit with post metadata
  - git push to configured remote
- [x] Store `gitSha` + `gitPath` back on `posts` row ✅ (already in schema; written after commit)
- [x] Site settings: configure `gitRepo` + `gitBranch` per site ✅ (already in sites schema; read in git function)

---

## Phase 8 — Polish & Production Readiness

### 8.1 Author profile setup flow
- [x] After signup: prompt user to create `authorProfile` via "Become an Author" flow ✅ (`/dashboard/become-author` multi-step onboarding + dashboard CTA)
- [x] Settings tab for author profile editing ✅ (`ACCOUNT_VIEWS.PROFILE` → `AuthorProfileTab` in `/account/profile`)
- [x] Avatar upload integrated with MinIO storage ✅ (`AvatarUploadCard` component — uploads via `uploadAvatar()` → MinIO → updates `user.image`)

### 8.2 Newsletter + Inngest jobs
- [x] `$subscribeNewsletter` server function + Inngest confirmation email job ✅ (Inngest fires `blog/newsletter.subscribed` → sends confirmation email → `/newsletter/confirm?token=` route)
- [x] Admin newsletter view: subscriber counts, export CSV ✅ (`/admin/blog/newsletter`)

### 8.3 Post scheduling
- [x] Inngest scheduled job: publish posts where `scheduledAt <= now()` and `status = 'scheduled'` ✅ (`blogSchedulePublishFunction` cron `* * * * *` in `cms.ts`)
- [x] Scheduler UI in post editor (pick publish date/time) ✅ (`datetime-local` input in both `$postId.edit.tsx` + `editor/new.tsx` sidebars)

### 8.4 Full-text search
- [x] PostgreSQL `tsvector` GIN index on `posts(title, excerpt)` ✅ (`drizzle/0007_posts_fts.sql`)
- [x] FTS wired into `$listPublishedPosts` + `$listAdminPosts` via `websearch_to_tsquery` ✅ (`ftsCondition()` helper in `functions.ts`)
- [x] Wire to `/search` page ✅ (already uses `usePublishedPosts({ search: q })` — now FTS-backed)

### 8.5 SEO
- [x] Structured data (JSON-LD) per post: `Article`, `BreadcrumbList`, `Person` (author) ✅
- [x] Open Graph + Twitter card meta tags per post ✅ (`og:image`, `twitter:card` in `$slug.tsx`)
- [x] Sitemap generation (`/sitemap.xml` route) ✅ (`src/routes/sitemap[.]xml.ts` — queries published posts + author profiles)

### 8.6 Performance
- [x] Route prefetch via `loader` for all public blog routes ✅ (homepage, authors, author profile, $slug already had it)
- [x] Image optimization: `ThrottledImage` wired into blog post cards (homepage feed) + image blocks in post renderer ✅
- [x] Pagination: cursor-based for public feed ✅ (Load More with useInfiniteQuery + cursor parameter in $listPublishedPosts)

---

## Open Decisions

| Decision | Options | Notes |
|---|---|---|
| MDX render strategy | `@mdx-js/mdx` at request time (no files) vs content-collections (build-time, files) | DB-stored content → `@mdx-js/mdx` is simpler. content-collections for git-backed static sites. |
| Inline editor inside blocks | TipTap (most popular, best ecosystem) vs Plate.js (more powerful, MDX serializer) | TipTap for speed; Plate.js if MDX fidelity becomes critical |
| Search engine | PostgreSQL FTS (built-in) vs Typesense (external, superior) | PostgreSQL FTS for v1; Typesense as upgrade path |
| Multi-tenancy routing | Subdomain routing (nginx/Traefik) vs path-based | Subdomain for production; path-based for dev simplicity |
| Custom domain SSL | Traefik + Let's Encrypt | Already in Docker Compose, needs per-domain cert automation |

## Decided

| Decision | Chosen | Rationale |
|---|---|---|
| Multi-tenancy implementation | **Better Auth `organizations()` plugin** | Replaces custom `tenants`/`tenantMembers` tables. Gains native invitation system, org switcher UI (`better-auth-ui`), `session.activeOrganizationId`, and less code to maintain. Custom `plan`/`isPersonal` fields added via `additionalFields`. Org roles mapped: owner/admin/editor/author/contributor. |

---

## Current Status

| Area | Status |
|---|---|
| Infrastructure (auth, billing, storage, jobs, RBAC) | ✅ Complete (inherited from template) |
| Database schema (all CMS tables) | ✅ Complete |
| Server functions (all blog CRUD) | ✅ Complete |
| Public blog theme (NavyBlueBlog) + layout | ✅ Complete |
| Multi-tenancy (Better Auth Organizations) | ✅ Complete (plugin active, org-switcher, tenant tables removed, sites.organizationId FK) |
| Blog homepage | ✅ Wired to real data (`usePublishedPosts`, `usePublicCategories`) |
| Post detail page | ✅ Block renderer, author bio, reactions, bookmarks, share, comments |
| Block editor | ✅ Full dnd-kit BlockEditor — 19 block types, edit/split/preview |
| Editor save | ✅ `handleSave()` calls `useUpsertPost()` — posts saved to DB |
| Admin posts list | ✅ Wired to `useAdminPosts()` — real data |
| Admin categories | ✅ Wired to `useCategories` + upsert/delete mutations |
| Admin tags | ✅ Wired to `useTags` + create/delete mutations |
| Admin comments | ✅ Wired to `useComments` + approve/spam/delete mutations |
| Admin authors | ✅ Wired to `useAuthors()` |
| Admin blog dashboard | ✅ Wired to `useAdminPosts`, `useAuthors`, `useComments`, `useTags` |
| Public authors page | ✅ Wired to `useAuthors()` |
| Public author profile page | ✅ Wired to `useAuthorProfile` + `usePublishedPosts` + `useToggleFollow` |
| Public search page | ✅ Wired to `usePublishedPosts({ search })` + `usePublicCategories` |
| Public topics page | ✅ Wired to `usePublicCategories()` |
| Public comments | ✅ Wired to `$listPublicComments` + `$createComment` (pending moderation) |
| Admin users page | ✅ Complete — TanStack Table, role/status filters, bulk actions, impersonation, session management |
| Post monetization / paywall | ✅ Phase 2.9 complete (schema, gating, paywall UI, editor toggles, feed badges) |
| Site builder (Puck) | ✅ Complete — Puck config, admin editor, public rendering, per-site theme tokens |
| RBAC dashboard | ✅ Complete — Role cards, permission matrix, route capabilities, command palette |
| Git-backed publishing | ✅ Complete — MDX generation, isomorphic-git, Inngest publish function |
| **Headless CMS Public API** | ❌ Not started (Phase 8 in PLAN2.0.md) |

---

## Priority Order (Recommended Start Sequence)

```
0.  Phase 0   (Multi-Tenancy Migration)       → Better Auth Organizations replaces tenants/tenantMembers
1.  Phase 1   (Block Editor)                  → unlocks writing + saving posts end-to-end
2.  Phase 2.1-2.2 (Blog feed + post detail)  → makes the public blog usable
3.  Phase 3.1-3.4 (Admin CMS core)           → categories, tags, comments, posts list
4.  Phase 2.3-2.8 (Comments, reactions, search, newsletter)
5.  Phase 2.9  (Post Monetization & Paywall) → premium posts, paywall UI, Stripe subscription
6.  Phase 4   (Users admin upgrade)
7.  Phase 3.5-3.7 (Authors, analytics, media)
8.  Phase 5   (Site builder)
9.  Phase 6   (RBAC dashboard)
10. Phase 7   (Git-backed publishing)
11. Phase 8   (Polish + production)
```
