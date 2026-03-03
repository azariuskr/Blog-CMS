# Unified Plan of Action (Master)

This is the consolidated plan combining:
- codebase review findings
- filter/store integration gaps
- RBAC/capabilities needs
- Playwriter UI review comparing `:5173/users` vs `:3000/admin/users`

No repo changes are made by this document.

---

## Guiding decisions (to prevent drift)
1) **Canonical app folders** (live):
   - `src/routes/*`
   - `src/components/app-layout/*`
   - `src/components/app-views/*`
   - `src/lib/auth/*`, `src/lib/filters/*`, `src/lib/store/*`

2) **Inspiration/legacy folders** (not imported into routes unless explicitly migrated):
   - `src/components/dashboard/*`
   - `src/components/dashboard2/*`
   - most of `src/components/layout/*`
   - `src/components/admin/users/*` (use as inspiration; refactor required if reused)

---

## Phase 1 — Make `/admin/users` the reference “TanStack-first” screen
Goal: match the strong UX of the 5173 reference while staying consistent with your architecture.

### 1.1 TanStack Table integration (core)
- Replace the current plain table in `src/components/app-views/users-view.tsx` with a TanStack Table implementation.
- Reuse existing table UI utilities:
  - `src/components/data-table/toolbar.tsx`
  - `src/components/data-table/pagination.tsx`
  - `src/components/data-table/column-header.tsx`
  - `src/components/data-table/view-options.tsx`
  - `src/components/data-table/bulk-actions.tsx`

### 1.2 Filters = URL search params (already started; tighten)
- Keep Router `validateSearch` for `/admin/users` (already exists).
- Drive filtering from URL search using `useFilters()`.
- Replace ad-hoc filter controls with `src/components/common/filters/*` (currently unused).

### 1.3 Sorting must be explicit + stable (fix “role change reshuffles list”)
- Add explicit sortable headers (click to sort) using `DataTableColumnHeader`.
- Ensure mutations do NOT change ordering unexpectedly:
  - Prefer **optimistic cache updates** for role/ban/unban/delete so the list doesn’t refetch and reorder.
  - Alternatively enforce a stable default sort (email asc or createdAt desc) and never change it on mutation.

### 1.4 Selection + bulk operations
- Add row selection (checkbox column) and bulk actions (ban/unban/delete/role set), permission-gated.

### 1.5 Route-level prefetch for performance
- In the route `beforeLoad`/loader for `/admin/users`, prefetch `usersListQueryOptions()` to speed navigation/SSR hydration.

**Acceptance criteria (Phase 1)**
- `/admin/users` has: toolbar (search + role/status), view options, sortable columns, pagination, selection, bulk actions.
- List order does not change when role changes unless a sort is active.

---

## Phase 2 — Overlay store becomes the modal system
Goal: consistent dialogs/drawers across the admin experience.

### 2.1 Mount overlay container once
- Mount `src/components/overlay-container.tsx` in a root shell (authenticated layout is ideal).

### 2.2 Migrate user modals to overlays
- Convert local dialog state in users page to overlay-driven flows:
  - create user
  - change password
  - confirm delete
  - confirm ban/unban
  - (optional) edit user drawer

**Acceptance criteria (Phase 2)**
- No duplicated dialog state per component; overlays are opened via `overlayActions.open(id, data)`.

---

## Phase 3 — Activate unused admin features (already implemented server-side)
Goal: leverage Better Auth admin plugin fully.

### 3.1 Impersonation
- Add action per user row: “Impersonate” (permission-gated).
- Add global banner/button when impersonating: “Stop impersonating”.

### 3.2 Session management UI
- Add a UI for:
  - list user sessions
  - revoke one
  - revoke all

### 3.3 Update user (name/email)
- Add edit user UI using `useUpdateUser`.

---

## Phase 4 — RBAC visibility pages (capabilities + routes)
Goal: a page that clearly shows what each role can do.

### 4.1 RBAC section routes
- Add missing route files for configured RBAC routes (they exist in `routeConfig`/nav but not in `src/routes`).

### 4.2 Capabilities + allowed routes dashboard
- Implement a super-admin-only RBAC page that shows:
  - role hierarchy
  - capabilities from `getRoleCapabilities(role)`
  - permission statements (access control)
  - allowed routes computed via `canAccessRoute(route, role)` and `routeConfig`

SEO alignment:
- Metadata already derives from `routeConfig` (`src/lib/seo/metadata.config.ts`), so adding route files + configs keeps nav/SEO consistent.

---

## Phase 5 — Command palette & global search
Goal: bring the best parts of the reference UX into your canonical layout.

- Wire `src/lib/store/search.ts` into the canonical header/layout.
- Add Cmd/Ctrl+K command palette driven by permission-filtered nav (`buildNavigation(role)`).

---

## Phase 6 — Cleanup / consolidation (after features work)
- Consolidate duplicate/legacy patterns:
  - decide what to do with `src/components/dashboard*`, `src/components/layout/*`, `src/components/admin/users/*` (keep as inspiration, or delete later).
  - resolve duplicate trusted device hook (`useClearTrustedDevice`).

---

## Open decisions (you pick before implementation)
1) Users list: server-side pagination/filtering now or later?
2) Default stable order: `email asc` vs `createdAt desc`?
3) Should sort/filter state be encoded into the URL (shareable) or stored locally?
4) Should command palette be core UX everywhere or admin-only?
