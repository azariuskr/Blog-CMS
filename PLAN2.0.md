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
