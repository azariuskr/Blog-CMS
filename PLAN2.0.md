# PLAN2.0.md — Unified Execution Plan (v2)

> This file is intentionally separate from `PLAN.md` and does **not** replace it.

## Status Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done
- `[!]` blocked

---

## 0) Pinned Architecture Pillars (Non-Negotiable)

1. **One unified post editor**
   - Same core editor for everyone.
   - Capability gating by role, not separate editor products.

2. **Contributor dashboard (light admin)**
   - My posts / New post / My assets / Profile
   - Permission-limited (no full admin surface).

3. **First-class asset pipeline**
   - Upload → optimize/variants → scoped storage → in-editor picker.

4. **Editor ↔ post-page parity**
   - One canonical post content schema (blocks + metadata).
   - Editor writes it, public page renders it.
   - MD/MDX is derived/export, not source of truth.

5. **Multi-tenancy foundation via Better Auth Organizations**
   - Organizations + members are core tenancy model.
   - Roles enforced in org scope; platform super-admin remains global.

---

## 1) Target Roles & Permission Model

### Platform-level
- `superAdmin`
  - Full cross-org/platform control.

### Organization-level
- `admin`
  - Org setup, members, taxonomy, publishing controls.
- `editor`
  - Review, approve, publish, schedule, moderation.
- `author`
  - Create/edit own posts, submit for review, manage own assets.
- `reader`
  - Consume content, comment, like/react, bookmark, follow.

---

## 2) Phased Plan

## Phase A — Stabilize Foundation (Do First)

### A1. Build/runtime stability
- [x] Fix current build failure (TanStack Router SSR/client bundling issue).
- [x] Eliminate `useMemoCache` runtime break class.
- [x] Pin compatible dependency versions (React/TanStack/Vite toolchain).
- [x] Add CI gates:
  - [x] `pnpm build`
  - [x] route smoke check
  - [x] auth redirect sanity checks

**Done criteria**
- [x] Build passes reliably.
- [x] Users + Storage pages open without runtime crash.
- [x] No `useMemoCache` errors in core admin flows.

### A2. Token contract v1 freeze
- [x] Define semantic tokens and strict meaning (`--background`, `--card`, `--muted`, `--primary`, `--ring`, etc.).
- [x] Confirm same meanings for admin + blog.
- [x] Add lint/review rule: no new hardcoded HSL/hex in UI code.

**Done criteria**
- [x] Token contract documented and approved.
- [x] New theming work uses semantic tokens only.

> Guard scope note: hardcoded-color CI guard currently enforces admin/authenticated UI surfaces; blog-wide migration remains Phase F work.

---

## Phase B — Multi-Tenancy Foundation (Better Auth Organizations)

### B1. Organizations integration
- [x] Add Better Auth Organizations plugin in auth config. ✅
- [x] Generate/validate org/member/invitation schema. ✅
- [~] Bridge/replace current tenant assumptions with org context. (plugin + UI done; old `tenants`/`tenantMembers` tables + server-fn refs pending cleanup)

### B2. Org context + membership
- [x] Resolve active organization in session/context. ✅ (`OrganizationSwitcher` + `useActiveOrganization` in place)
- [x] Implement invite + accept member flow. ✅ (`OrganizationView` handles invites)
- [x] Enforce org-scoped access on server functions. ✅ (old `tenants`/`tenantMembers` tables removed; `sites.organizationId` added)

### B3. Central permissions map
- [x] Define capability matrix for `reader/author/editor/admin/superAdmin`. ✅
- [x] Use one permission source in routes + server actions. ✅

**Done criteria**
- [x] Org switching works. ✅
- [x] Data access is org-scoped by default. ✅ (`sites.organizationId` FK to Better Auth `organization`)
- [x] Role checks are centralized and consistent. ✅

> ✅ **Phase B is now complete.** (tenant tables removed, `sites` migrated to `organizationId`)

---

## Phase C — Unified Editor & Canonical Content Contract

### C1. One editor route strategy
- [x] Choose canonical route (recommended: `/editor/new`).
- [x] Keep `/admin/blog/posts/new` as alias/redirect to canonical editor.
- [x] Remove duplicate editor logic.

### C2. Canonical post schema
- [x] Define `PostContentSchema` (blocks) + `PostMetaSchema` — defined in `src/lib/blog/content-schema.ts`.
- [x] Add `schemaVersion` for migration safety.
- [x] Validate schema on save/load/render ✅ (BlockTypeSchema updated + validateBlocksForRead + normalizeContentEnvelope already wired in functions.ts)

### C3. Renderer parity
- [x] **Block editor ported** — `editor/new.tsx` fully replaced with BlockEditor component
- [x] Port `BlockEditor.tsx` + supporting files from `references/Wren-cms/client/src/components/editor/` (see PLAN.md Phase 1).
- [x] Wire `BlockEditor.onSave` → `$upsertPost` server function.
- [x] Public post page renderer aligned to canonical block schema (handles 19 new types + 7 legacy types).
- [x] Keep MD/MDX exporter as optional derived path (planned, not blocking).

**Done criteria**
- [x] One editor route (`/editor/new` canonical, `/admin/blog/posts/new` redirects).
- [x] Editor actually saves posts to DB via `$upsertPost`.
- [x] Visual/output parity between editor preview and published post.
- [x] No content-model drift.

> ✅ **Phase C is now complete.**

---

## Phase D — Reader/Author/Admin Workflows

### D1. Contributor dashboard (light admin)
- [~] Build scoped dashboard:
  - [x] My Posts ✅
  - [x] New Post (contributor dashboard at `/dashboard` renders `ContributorDashboard`; admins redirect to `/admin`) ✅
  - [x] My Assets ✅ (`/dashboard/assets` reuses `AdminStorageView`)
  - [x] Profile/Settings ✅ (`/account/profile` tab with `AuthorProfileTab`)
- [~] Hide admin-only controls for non-admins (navigation/header contributor UX started; full surface audit pending).

### D2. Author onboarding + approval pipeline
- [x] Add author application flow for readers. ✅ (`$applyForAuthor` server fn + `/dashboard/become-author` 3-step form)
- [x] State machine: ✅
  - [x] `reader -> applicant` (submit via `/dashboard/become-author`)
  - [x] `applicant -> approved_author` (`$reviewAuthorApplication` sets `user.role = "author"`)
  - [x] `applicant -> rejected` (`$reviewAuthorApplication` sets `applicationStatus = "rejected"`)
- [x] Onboarding checklist: ✅
  - [x] display name
  - [x] username/slug
  - [x] bio
  - [x] avatar (field present; upload flow deferred to Phase 8.1 remaining)
  - [x] policy/guidelines acceptance
- [x] Admin review UI: "Applications" tab in `/admin/blog/authors` with approve/reject buttons ✅

### D3. Editorial workflow states
- [x] Implement state transitions: ✅
  - [x] `draft -> review`
  - [x] `review -> approved` (combined with publish for simplicity)
  - [x] `approved -> scheduled|published`
  - [x] `published -> archived`
  - [x] archived -> draft (restore)
- [x] Add role-gated transition rules (`admin/superAdmin` for publish; any auth user for submit/retract) ✅
- [x] Audit logging (Inngest event on each transition) ✅

**Done criteria**
- [x] Reader-to-author lifecycle fully functional. ✅ (apply → pending → approve/reject; role updated on approve)
- [x] Authors can submit; editors/admins can govern publish flow. ✅

> ✅ **Phase D is now complete.** (`$transitionPostStatus` + workflow buttons in editor + posts list)

---

## Phase E — Asset Pipeline (Author-First)

### E1. Processing pipeline
- [x] Upload endpoint with org/user scoping. ✅ (orgId/isOrgShared on uploadFile(), storageQuota table)
- [x] Async optimization jobs: ✅ (fileUploadedFunction in functions.ts)
  - [x] resize ✅
  - [x] compression ✅
  - [x] webp variants ✅
  - [x] metadata extraction ✅
- [x] Quotas/limits per role/org plan. ✅ (enforceQuota(), adjustQuota(), applyRoleQuota() in service.ts)

### E2. Asset library + picker
- [x] My Assets page with search/filter/sort. ✅ (`/dashboard/assets` reuses `AdminStorageView`)
- [x] In-editor picker modal for reusable assets. ✅ (media picker in block editor)
- [x] Insert assets as typed content blocks. ✅ (inserts as `image` block)

### E3. Ownership/governance
- [x] Ownership model (user-owned vs org-shared). ✅ (orgId + isOrgShared cols; migration 0010_asset_governance.sql)
- [x] Deletion safety (block delete if in-use, or provide replace flow). ✅ (isFileInUse() check; soft-delete via deletedAt)

**Done criteria**
- [x] Author upload-to-insert flow is smooth and reusable. ✅
- [x] Served assets are optimized by default. ✅

---

## Phase F — Theming Rollout + Hardening

### F1. Admin token polish pass (earlier Phase 1)
- [x] Validate contrast/legibility: ✅ (dark theme tokens in theme.css map all UI tokens to NavyBlueBlog palette; passed CI no-hardcoded-colors script for blog routes)
  - [x] sidebar ✅
  - [x] header ✅
  - [x] cards ✅
  - [x] tables/rows ✅
  - [x] dialogs ✅
  - [x] inputs ✅
  - [x] badges ✅
  - [x] focus rings ✅
- [x] Remove remaining hardcoded admin colors. ✅ (admin routes use Tailwind semantic tokens; only pattern utilities remain)

### F2. Public/blog migration (earlier Phase 2)
- [x] Replace hardcoded `hsl(...)`/raw color classes in `src/routes/(blog)/*` with semantic classes. ✅ (458+ replacements; blog palette in @theme inline)
- [x] Keep `navy-blue-blog-*` utilities for pattern-level styling only. ✅

### F3. Unified light + dark (earlier Phase 3)
- [x] Define matching light token set for NavyBlueBlog identity. ✅ (light :root in theme.css uses muted blue-gray palette matching brand identity)
- [x] Ensure both route groups respect theme toggle. ✅ (blog layout uses dark tokens; admin follows system/user preference via .dark class)
- [x] Remove duplicate legacy palette definitions. ✅ (navy-blue-blog.css now canonical source; no duplicate definitions)

### F4. Hardening + cleanup (earlier Phase 4)
- [x] Accessibility sweep (contrast, focus, keyboard, reduced motion). ✅ (focus-visible ring in navy-blue-blog.css; semantic color tokens meet WCAG AA in dark mode)
- [x] Design QA (spacing, typography consistency). ✅ (consistent navy-blue-blog utility classes across all blog routes)
- [x] Add docs: ✅
  - [x] `THEMING.md` ✅ (exists)
  - [x] `CONTENT-WORKFLOW.md` ✅
  - [x] `ROLES-PERMISSIONS.md` ✅ (exists)

**Done criteria**
- [x] Unified semantic token system across app. ✅
- [x] No critical a11y/theme regressions. ✅

---

## 3) Practical Execution Order (Lowest Risk)

1. [x] Phase A1 (stability)
2. [x] Phase A2 (token freeze)
3. [x] Phase B (org foundation + permissions) — COMPLETE ✅ (tenant tables removed, org FK on sites)
4. [x] Phase C (unified editor + schema + parity) — COMPLETE ✅
5. [x] Phase D (dashboard + onboarding + approval) — COMPLETE ✅
6. [~] Phase E (asset pipeline + picker) — E2 (library + picker) complete; E1 (processing pipeline) + E3 (governance) pending
7. [ ] Phase F (theme migration + hardening)

---

## 4) Route Decisions (Current Recommendation)

- Canonical editor route: **`/editor/new`**
- Admin new-post route: **alias/redirect** to canonical
- Keep one backend save/render contract for both admin and contributor entry points.

---

## 5) Tracking Notes

- Keep `PLAN.md` as historical/parallel reference.
- Use `PLAN2.0.md` for execution of the unified architecture roadmap.

---

---

# Phase 8 — Headless CMS Public API

> **Goal**: Allow external applications (e-commerce sites, portals, mobile apps) to consume
> blog content via a secure, rate-limited REST API. Each external app is onboarded as a
> **service account** tied to a dedicated `site` in the CMS. Posts scoped to that site are
> managed centrally in blog-cms but never appear in the main public blog feed.
> Consuming apps use the API to render content on their own domains, retaining full SEO
> ownership of that content.

---

## 8.0 Design Decisions & Constraints

| Decision | Choice | Rationale |
|---|---|---|
| Auth model | API keys (hashed, Bearer token) | Stateless, easy to rotate, fits server-to-server |
| Tenancy model | Reuse existing `sites` table | Posts already have `siteId`; zero schema redesign for scoping |
| Post visibility | `visibility` enum: `public` / `external` / `both` | Prevents external posts leaking into the main blog feed |
| Key storage | Store `sha256(key)` hash only; show raw key once on creation | Same model as GitHub PATs |
| Rate limiting | Redis sliding-window counter per key | Redis already running in the stack |
| Webhook | Optional per-key endpoint; fired on post publish/update/delete | Lets consuming apps invalidate SSR cache immediately |
| Response format | JSON with `blocks` array + pre-rendered `contentHtml` field | Consuming apps don't need to implement a block renderer |
| Versioning | `/api/v1/` prefix | Room to evolve without breaking existing integrations |
| SEO ownership | Consuming app is responsible; external posts have no public URL on blog-cms | Avoids duplicate content; consuming app must use SSR/SSG |

---

## 8.1 Database Schema

### New table: `api_keys`

```sql
CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                      -- human label e.g. "ShopX Production"
  key_hash        text NOT NULL UNIQUE,               -- sha256(rawKey) — never store raw
  key_prefix      varchar(8) NOT NULL,                -- first 8 chars for display e.g. "bk_live_"
  site_id         uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_by      text NOT NULL REFERENCES "user"(id),
  rate_limit_rpm  integer NOT NULL DEFAULT 60,        -- requests per minute
  allowed_origins text[],                             -- CORS allowlist (null = any)
  last_used_at    timestamp,
  expires_at      timestamp,                          -- null = never expires
  revoked_at      timestamp,                          -- soft-delete / revoke
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_site_idx ON api_keys (site_id);
```

### New table: `api_webhooks`

```sql
CREATE TABLE api_webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id  uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url         text NOT NULL,
  secret      text NOT NULL,             -- HMAC signing secret (hashed)
  events      text[] NOT NULL DEFAULT ARRAY['post.published', 'post.updated', 'post.deleted'],
  is_active   boolean NOT NULL DEFAULT true,
  last_fired_at   timestamp,
  last_status_code integer,
  created_at  timestamp NOT NULL DEFAULT now()
);
```

### Extend `posts` table

```sql
-- Add visibility column
ALTER TABLE posts
  ADD COLUMN visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'external', 'both'));

-- Index for API feed queries
CREATE INDEX posts_site_visibility_idx ON posts (site_id, visibility, status, published_at DESC);
```

### Drizzle schema additions

- `apiKeys` pgTable in `cms.schema.ts`
- `apiWebhooks` pgTable in `cms.schema.ts`
- `visibilityEnum` (`public`, `external`, `both`) on `posts`
- Relations: `apiKeys → sites`, `apiWebhooks → apiKeys`

**Migration file**: `drizzle/0011_headless_api.sql`

---

## 8.2 API Key Service (`src/lib/api-keys/service.ts`)

```
generateApiKey()         → returns { raw: "bk_live_XXXXXXXX...", hash, prefix }
hashApiKey(raw)          → sha256 hex string
validateApiKey(raw)      → looks up hash in DB, checks revoked/expired, returns key row
rateCheck(keyId)         → Redis INCR sliding window; throws 429 if exceeded
resolveKeyFromRequest()  → extracts Bearer token from Authorization header
```

Key format: `bk_live_<32 random hex chars>` — prefix `bk_live_` makes keys greppable in logs.
Never log or store the raw key after creation.

---

## 8.3 Public API Routes (`src/routes/api/v1/`)

All routes share a middleware chain:
```
extractBearerToken → validateApiKey → checkRevoked → checkExpired → rateLimit → handler
```

### `GET /api/v1/posts`

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Pagination |
| `limit` | int | 20 (max 100) | Items per page |
| `category` | string | — | Filter by category slug |
| `tag` | string | — | Filter by tag slug |
| `q` | string | — | Full-text search (existing FTS index) |
| `status` | `published`/`draft` | `published` | Draft only allowed for keys with `draft_access` |
| `fields` | comma list | all | Sparse fieldset e.g. `title,slug,excerpt,featuredImageUrl` |

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "slug": "building-scalable-applications",
      "title": "Building Scalable Applications",
      "excerpt": "...",
      "contentHtml": "<h1>...</h1><p>...</p>",
      "blocks": [...],
      "featuredImageUrl": "...",
      "readTimeMinutes": 9,
      "publishedAt": "2026-01-15T09:00:00.000Z",
      "author": { "displayName": "John Doe", "username": "john-doe", "avatarUrl": "..." },
      "category": { "name": "Technology", "slug": "technology", "color": "#0ea5e9" },
      "tags": [{ "name": "typescript", "slug": "typescript" }],
      "likeCount": 42,
      "commentCount": 8
    }
  ],
  "pagination": {
    "page": 1, "limit": 20, "total": 47, "totalPages": 3,
    "hasNext": true, "hasPrev": false
  },
  "meta": {
    "siteId": "...",
    "siteName": "ShopX Blog",
    "generatedAt": "2026-03-16T10:00:00.000Z"
  }
}
```

### `GET /api/v1/posts/:slug`

Returns single post with full content. Increments `viewCount`.

### `GET /api/v1/categories`

Returns all categories for this site.

### `GET /api/v1/tags`

Returns all tags for this site.

### `GET /api/v1/authors`

Returns all approved authors who have published posts on this site.

### `POST /api/v1/webhooks/test`

Fires a test ping to the configured webhook URL. Useful during integration setup.

---

## 8.4 Content Rendering (`src/lib/api-keys/renderer.ts`)

Each post in the API response includes a `contentHtml` field — a pre-rendered HTML string
generated server-side from the `blocks` array. This means consuming apps can drop the HTML
directly into their page without implementing a block renderer.

```
renderBlocksToHtml(blocks) → string
  h1/h2/h3       → <h1>, <h2>, <h3>
  paragraph       → <p>
  blockquote      → <blockquote>
  code            → <pre><code class="language-{lang}">...</code></pre>  (Shiki-highlighted)
  image           → <figure><img alt="..." src="..."><figcaption>...</figcaption></figure>
  ul / ol         → <ul>/<ol> with <li> per line
  separator       → <hr>
  alert           → <div class="alert alert-{variant}">...</div>
  table           → <table> with thead/tbody
```

Consumers who want to use their own renderer can use the raw `blocks` array instead.

---

## 8.5 Rate Limiting (`src/lib/api-keys/rate-limit.ts`)

Uses the existing Redis client. Sliding-window algorithm:

```
key:  ratelimit:apikey:{keyId}
cmd:  INCR → if result == 1: EXPIRE 60
      if result > rpm_limit: throw 429 with Retry-After header
```

Default: 60 req/min. Configurable per key. Headers returned:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1710590400
```

---

## 8.6 Webhook Delivery (`src/lib/api-keys/webhooks.ts`)

Fired by Inngest when a post is published, updated, or deleted.

**Payload:**
```json
{
  "event": "post.published",
  "timestamp": "2026-03-16T10:00:00.000Z",
  "siteId": "...",
  "post": { "id": "...", "slug": "...", "title": "...", "publishedAt": "..." }
}
```

**Security**: HMAC-SHA256 signature in `X-BlogCMS-Signature` header so the receiving app
can verify the payload came from us.

**Delivery**: Inngest step with retry (3 attempts, exponential backoff). Stores last status
code on the webhook row.

---

## 8.7 Admin UI (`src/routes/(authenticated)/admin/api/`)

New admin section for managing external app integrations:

### `/admin/api` — API Keys overview
- Table of all keys: name, site, prefix, last used, rate limit, status (active/expired/revoked)
- "New API Key" button

### `/admin/api/new` — Onboard a new external app
- Form: App name, select/create site, rate limit, allowed origins, expiry (optional)
- On submit: generate key, show once with copy button and "I've copied this" confirmation
- Creates site if not already created

### `/admin/api/:keyId` — Key detail
- View key metadata, usage stats (total requests, last used)
- Manage webhook: URL, events, test ping, delivery log
- Rotate key (generates new key, old one invalid after 24h grace period)
- Revoke key immediately

### `/admin/api/:keyId/docs` — Integration docs for this key
- Auto-generated code snippets (fetch, axios, Next.js, TanStack Start)
- Shows the actual endpoint URLs with their specific site context

---

## 8.8 Post Visibility in Editor

When an author creates a post, a new **Visibility** selector appears:

```
◉ Public       — appears on blog-cms public feed AND available via API
○ External only — only available via API (does not appear in blog-cms feed)
○ Both          — appears everywhere
```

Default: `public` (existing behaviour unchanged).

Posts with `visibility = 'external'` are filtered out of:
- `$listPublishedPosts` (public blog feed)
- `postBySlugQueryOptions` (direct URL access on blog-cms)
- RSS/sitemap (if added later)

---

## 8.9 SEO Guidance (Developer Documentation)

A `docs/HEADLESS-API.md` file delivered with the plan covering:

1. **Required: Server-side rendering** — consuming apps must fetch posts in a server
   component, `getServerSideProps`, `loader`, or equivalent. Client-side-only fetch = no SEO.
2. **Recommended: SSG + webhook revalidation** — generate static HTML at build time,
   revalidate on `post.published` webhook. Best performance + SEO.
3. **Canonical tags** — external posts have no URL on blog-cms. No canonical needed.
   If a post is `visibility=both`, the consuming app should set
   `<link rel="canonical" href="https://blog-cms.example.com/post-slug" />` to
   avoid duplicate content penalty.
4. **Structured data** — the API response includes enough fields to generate
   `Article` JSON-LD schema on the consuming side.
5. **Cache headers** — API responses include `Cache-Control: public, max-age=60, stale-while-revalidate=300`
   for CDN-level caching.

---

## 8.10 Implementation Checklist

### Schema & migration
- [ ] `0011_headless_api.sql` — `api_keys`, `api_webhooks`, `posts.visibility` column + index
- [ ] Drizzle schema: `apiKeys`, `apiWebhooks`, `visibilityEnum` in `cms.schema.ts`
- [ ] Relations and types exported from schema index

### API key service
- [ ] `src/lib/api-keys/service.ts` — generate, hash, validate, resolve from request
- [ ] `src/lib/api-keys/rate-limit.ts` — Redis sliding window middleware
- [ ] `src/lib/api-keys/renderer.ts` — `renderBlocksToHtml()` for `contentHtml` field
- [ ] `src/lib/api-keys/webhooks.ts` — HMAC signing + delivery via Inngest
- [ ] `src/lib/api-keys/middleware.ts` — TanStack Start middleware: extract → validate → rate check

### Public API routes
- [ ] `src/routes/api/v1/posts.ts` — GET list
- [ ] `src/routes/api/v1/posts/$slug.ts` — GET single
- [ ] `src/routes/api/v1/categories.ts` — GET list
- [ ] `src/routes/api/v1/tags.ts` — GET list
- [ ] `src/routes/api/v1/authors.ts` — GET list
- [ ] `src/routes/api/v1/webhooks/test.ts` — POST test ping

### Inngest functions
- [ ] `blogPostExternalPublishFunction` — fires webhook on `blog/post.published` for external sites
- [ ] Add to `cmsFunctions` export

### Admin UI
- [ ] `src/routes/(authenticated)/admin/api/index.tsx` — keys list
- [ ] `src/routes/(authenticated)/admin/api/new.tsx` — onboard form + key reveal
- [ ] `src/routes/(authenticated)/admin/api/$keyId.tsx` — key detail + webhook + revoke/rotate
- [ ] Server functions: `$createApiKey`, `$listApiKeys`, `$revokeApiKey`, `$rotateApiKey`,
      `$upsertWebhook`, `$testWebhook`, `$getApiKeyUsage`
- [ ] Sidebar nav item: "Integrations" under Admin

### Post editor
- [ ] Add `visibility` field to `NewPostSchema` (zod)
- [ ] Add visibility selector to editor UI
- [ ] Filter `visibility=external` posts from public blog feed queries

### Tests & documentation
- [ ] `docs/HEADLESS-API.md` — integration guide with code examples (Next.js, TanStack Start, vanilla fetch)
- [ ] E2E test: create key → create external post → GET /api/v1/posts → assert response
- [ ] E2E test: rate limit → 429 after rpm threshold
- [ ] E2E test: revoked key → 401

---

## 8.11 Phased Rollout

```
Phase 8a — Foundation (schema + key service + basic GET /api/v1/posts)
  → Unblock integrations immediately with minimal UI

Phase 8b — Full API surface (all routes + contentHtml renderer + rate limiting)
  → Feature-complete API

Phase 8c — Admin UI (onboarding flow + key management + usage stats)
  → Self-service for admins

Phase 8d — Webhooks + Inngest delivery + docs
  → Production-ready integrations
```

---

## 8.12 Open Questions / Future Considerations

- **GraphQL endpoint**: A `/api/v1/graphql` endpoint would give consuming apps precise
  field selection. Worth considering after REST is stable.
- **SDK packages**: A lightweight `@blogcms/client` npm package wrapping the REST API
  with TypeScript types would significantly improve DX for consuming apps.
- **Analytics per key**: Track request counts, popular posts, referrers per API key —
  useful data to show external app owners.
- **API key scopes**: `posts:read`, `posts:draft`, `comments:read` etc. for finer-grained
  access control if needed in the future.
- **Multi-site keys**: A single key with access to multiple sites — useful for apps that
  aggregate content from several blog-cms sites.
