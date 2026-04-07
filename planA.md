# Plan A — Roles, Subscriptions, Author Flow, and Site Owner Platform

> Last updated: 2026-04-05  
> Status: Design approved, implementation pending

---

## 1. Current State Audit

### What exists
| Area | Status | Notes |
|------|--------|-------|
| Author application flow | ✅ Built | Multi-step form → admin review → role set to `author` in DB |
| Billing module | ⚠️ Stub | Stripe + Polar configured but provider = `"none"`. Plans are generic SaaS (AI msgs, storage) — not blog-specific |
| Role hierarchy | ✅ Built | `user → author → moderator → admin → superAdmin` — linear |
| Sites CRUD | ✅ Built | Admin-only, no ownership, no self-serve |
| Site owner flow | ❌ Missing | Doesn't exist |
| Payment gate on author | ❌ Missing | Author approval is manual, no subscription required |
| Site dashboard (scoped) | ❌ Missing | All sites are in a single shared admin view |
| Post isolation (site vs main) | ⚠️ Partial | `siteId` field exists, API filters by it, but write path doesn't enforce isolation |
| Post visibility for API | 🐛 Bug | New posts default to `visibility: 'public'` which is excluded from API results. Need `'external'` or `'both'` |
| `pagesRelations` in schema | 🐛 Fixed | Was missing — caused sites list to silently fail |

---

## 2. New Role / Subscription Model

### Roles (unchanged in code, new `reader` added)
```
reader (default on signup)
author   (platform writers — main blog)
moderator
admin
superAdmin
```
- Add `reader` to `ROLES` constant and `ROLE_HIERARCHY` (between `user` and `author`)
- Rename current `user` role to `reader` OR keep `user` as an alias
- `reader` can read, comment, follow, bookmark — no write access

### Subscription Plans (replace current generic plans)

| Plan ID | Display Name | Price | Role granted | Capability |
|---------|-------------|-------|-------------|------------|
| `free` | Reader | $0 | `reader` | Read, comment, follow |
| `author` | Author | $5/mo or $50/yr | `author` | Write on main blog, author profile, analytics |
| `author_premium` | Author Premium | $10/mo or $100/yr | `author` | All author + verified badge, featured placement |
| `site_basic` | Site Basic | $10/mo or $100/yr | `reader` or `author` | 1 site, API keys, site dashboard |
| `site_pro` | Site Pro | $30/mo or $300/yr | `reader` or `author` | 5 sites, API keys, priority support |

**Key design rule**: Site plans stack ON TOP of any role. A developer can have `site_basic` without being an author. An author can have `site_pro` to run their own headless blog. These are independent capabilities.

### User record additions
```sql
-- Add to user table:
plan          TEXT DEFAULT 'free'         -- active subscription plan id
plan_expires_at TIMESTAMP                 -- null = no expiry (lifetime)
plan_sites_limit INTEGER DEFAULT 0        -- 0=none, 1=basic, 5=pro
is_verified   BOOLEAN DEFAULT false       -- verified badge (author_premium)
```

---

## 3. Billing Plan Redesign

### Replace `src/lib/billing/plans.ts` plans array with:
```ts
{ id: "free",           priceMonthly: 0,    priceYearly: 0     }
{ id: "author",         priceMonthly: 500,  priceYearly: 5000  }  // $5/mo
{ id: "author_premium", priceMonthly: 1000, priceYearly: 10000 }  // $10/mo
{ id: "site_basic",     priceMonthly: 1000, priceYearly: 10000 }  // $10/mo, 1 site
{ id: "site_pro",       priceMonthly: 3000, priceYearly: 30000 }  // $30/mo, 5 sites
```

### PlanLimits model (replace generic SaaS limits):
```ts
interface PlanLimits {
  canWriteMainBlog: boolean;        // author, author_premium
  isVerified: boolean;              // author_premium
  sitesAllowed: number;             // 0 = none, 1 = site_basic, 5 = site_pro
  apiKeysPerSite: number;           // 2 = site_basic, 10 = site_pro
  storageBytes: number | null;
}
```

### Webhook handlers (Stripe / Polar)
On subscription created/updated:
1. Lookup user by `customerId`
2. Set `user.plan` = new plan id
3. If plan grants `author` role → set `user.role = 'author'`
4. If plan includes `sitesAllowed > 0` → set `user.planSitesLimit`
5. On subscription cancelled → downgrade plan, revoke role if applicable

---

## 4. Author Subscription Flow (New)

### Current flow (broken/incomplete):
`Register → Fill application form → Admin approves manually → Role set`

### New flow:
```
Register (reader role)
  ↓
"Become an Author" CTA in dashboard
  ↓
[Step 1] Choose plan: Author $5/mo | Author Premium $10/mo
  ↓
[Step 2] Checkout (Stripe/Polar) — payment AUTHORIZED (not captured yet)
  ↓
[Step 3] Profile setup: username, display name, bio, avatar (existing multi-step form)
  ↓
[Step 4] Accept platform policy
  ↓
[Step 5] Payment CAPTURED / subscription activated
  ↓
Webhook fires → role set to `author` → redirect to editor
```

**Alternative (simpler, less ideal)**: Pay → profile setup → done. No "authorize then capture" complexity.
**Decision**: Use the simpler approach: pay first, profile setup second. If user abandons after paying, they still have the subscription and can complete their profile later. The profile is required before they can publish (but not before they can access the editor).

### Author approval: REMOVE manual admin approval
- Author subscription payment = the approval gate
- Admin still has override ability to revoke/ban authors
- Remove `applicationStatus` pending/approved/rejected from the flow (keep the DB column for historical data, but new signups bypass it)

---

## 5. Site Owner Flow (New)

### Entry points:
1. **From dashboard**: "Add a Site" CTA, visible to all logged-in users
2. **From pricing page**: Site Basic / Site Pro plan cards
3. **From author dashboard**: Upsell banner "Power your external website with our headless CMS"

### Flow:
```
"Add a Site" clicked
  ↓
If user has no site plan:
  → Show plan picker: Site Basic $10/mo | Site Pro $30/mo
  → Checkout (Stripe/Polar)
  → Webhook: user.planSitesLimit set (1 or 5)
  ↓
If user already has site plan with available slots:
  → Skip payment, go straight to site creation
  ↓
[Site Creation Form]
  - Site name
  - URL slug
  - Description (optional)
  - Domain (optional, can add later)
  ↓
Site created with ownerId = user.id
  ↓
Auto-generate first API key for the site
  ↓
Show "Getting Started" guide:
  - API key (reveal once)
  - Link to /developers docs
  - Create first post CTA
  - Theme setup CTA
```

### Site limit enforcement:
```ts
// Before creating a site, check:
const ownedSites = await db.select().from(sites).where(eq(sites.ownerId, userId));
if (ownedSites.length >= user.planSitesLimit) {
  throw Error("Site limit reached. Upgrade to Site Pro for more sites.");
}
```

---

## 6. Database Changes Required

### `sites` table — add `ownerId`:
```sql
ALTER TABLE sites ADD COLUMN owner_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX sites_owner_idx ON sites(owner_id);
```

### `user` table — add plan fields:
```sql
ALTER TABLE "user" ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "user" ADD COLUMN plan_expires_at TIMESTAMP;
ALTER TABLE "user" ADD COLUMN plan_sites_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
```

### Posts — `visibility` default fix:
```sql
-- Current default is 'public' (internal only). For site posts, should be 'external'.
-- Enforce at write time: if post.siteId IS NOT NULL → set visibility = 'external'
```

---

## 7. Site Owner Dashboard (Scoped)

### Navigation — site owners see a "My Sites" section in sidebar:
```
My Sites
  ├── [Site Name] ← active site selector dropdown
  │     ├── Posts (site-scoped)
  │     ├── API Keys
  │     ├── Webhooks
  │     ├── Theme & Appearance
  │     └── Site Settings
  └── Add a Site (if under limit)
```

### Implementation:
- Same admin shell, same components
- All server functions get a `siteId` context param
- `$listPosts` and `$upsertPost` enforce: if you're a site owner, you can only access posts where `siteId IN (your owned sites)`
- Site owners cannot see the main blog posts list unless they also have `author` role

### Post editor — site owner context:
- `siteId` is auto-populated from their active site (not editable)
- `visibility` is locked to `external` for site posts
- `status` options: draft / scheduled / published (no review required for site owners)
- Preview mode: renders post using the site's `themeConfig`

---

## 8. Post Isolation Rules

| Post type | `siteId` | `visibility` | Appears in | API accessible |
|-----------|----------|-------------|------------|----------------|
| Main blog post | NULL | `public` | Main website | No |
| Main blog post (shared) | NULL | `both` | Main website | Yes |
| Site post | set | `external` | API only | Yes (for that site) |
| Site post (also on main) | set | `both` | Both | Yes |

**Enforcement points:**
1. `$upsertPost` — if `siteId` is set, force `visibility = 'external'` unless admin override
2. Public blog feed queries — filter `WHERE site_id IS NULL OR visibility IN ('public', 'both')`
3. API — filter `WHERE site_id = $apiKey.siteId AND visibility IN ('external', 'both')`

---

## 9. Theme + Embed Templates

### `themeConfig` (already on `sites` table):
```ts
{
  primaryColor: string;    // CSS color
  accentColor: string;
  fontFamily: string;
  layout: "classic" | "magazine" | "minimal" | "portfolio";
  darkMode: boolean;
}
```

### What to build:
1. **Theme editor UI** — color pickers, font selector in Site Settings tab
2. **2 embed templates** (npm package or copy-paste):
   - `<BlogCard />` — post card with title, excerpt, featured image, author, date
   - `<BlogPage />` — full post render with blocks → HTML
   - Both accept `themeConfig` as prop for styling via CSS variables
   - Tweakcn-based component library foundation
3. **Preview in editor** — "Preview with site theme" button in post editor for site owners
4. **Base theme** — default Tweakcn dark theme matching the platform aesthetic

---

## 10. Developer Documentation

### Public route: `/developers` (no auth required)

Pages:
- **Overview** — what the API does, authentication
- **Authentication** — Bearer token, rate limits
- **Endpoints reference** — `GET /api/v1/posts`, `GET /api/v1/posts/:slug`, etc.
- **Post object schema** — full JSON type reference
- **Webhooks** — payload format, event types, retry policy
- **Embed templates** — quickstart code (React, Vanilla JS, Next.js)
- **Theme customization** — `themeConfig` API

---

## 11. Implementation Phases

### Phase 1 — Fix immediate bugs (DONE / IN PROGRESS)
- [x] `pagesRelations` added to schema
- [x] `$listSites` — remove broken `with: { pages }` query
- [x] `new.tsx` API key page — fix data extraction bug
- [ ] Post `visibility` default bug — site posts must default to `external`

### Phase 2 — Role model + DB schema
- [ ] Add `reader` to `ROLES` constant and hierarchy
- [ ] Add `plan`, `planSitesLimit`, `isVerified` to user table (migration)
- [ ] Add `ownerId` to sites table (migration)
- [ ] Update Drizzle schema + run migration

### Phase 3 — Billing plans redesign
- [ ] Replace `plans.ts` with blog-specific plans
- [ ] Connect Stripe (or Polar) webhook handler
- [ ] Webhook handler: on subscription created → set user.plan, conditionally set user.role
- [ ] Billing portal: user can manage subscription from account settings

### Phase 4 — Author subscription flow
- [ ] Remove manual admin approval requirement (keep admin override)
- [ ] Add plan selector step to "Become an Author" flow
- [ ] Checkout → profile setup → done (subscription activates after profile completed)
- [ ] Verified badge for `author_premium` plan

### Phase 5 — Site owner flow + scoped dashboard
- [ ] "My Sites" sidebar section (gated by `planSitesLimit > 0`)
- [ ] Site creation form with plan check + ownership assignment
- [ ] Auto-generate first API key on site creation
- [ ] Scoped post list (site owner sees only their posts)
- [ ] Post editor: auto-set siteId + lock visibility to `external`
- [ ] Site limit enforcement on create

### Phase 6 — Theme + preview
- [ ] Theme editor UI in Site Settings
- [ ] Post editor "Preview with site theme" mode
- [ ] 2 embed components (BlogCard + BlogPage) with Tweakcn styling

### Phase 7 — Developer docs
- [ ] `/developers` public route
- [ ] Endpoint reference, JSON schema, webhook docs
- [ ] Embed template quickstart examples

---

## 12. Open Questions / Decisions Made

| Question | Decision |
|----------|---------|
| Pay before or after profile setup? | **Pay first.** Subscription activates on payment. Profile setup is post-payment step. If abandoned, subscription stays active and user can complete profile later. |
| Manual admin approval for authors? | **Removed.** Payment = approval gate. Admin can still revoke/ban. `applicationStatus` field kept for historical data only. |
| Author AND site owner — same account? | **Yes. Plans stack.** A user can hold `author` plan + `site_basic` simultaneously. No bundled plan needed for now — revisit if demand warrants a discount bundle. |
| Billing provider? | **Stripe.** Polar plugin stays in codebase but `BILLING_PROVIDER=stripe`. |
| Where to become a site owner? | Dashboard CTA + pricing page. No separate signup. |
| Separate app for site owners? | No. Same app, scoped "My Sites" section in sidebar. |
| Site owner posts on main blog? | No, by default. Site posts = `visibility: external` = API only. Admin can override. |
| Multiple sites management? | Site selector dropdown in site owner dashboard header. |
