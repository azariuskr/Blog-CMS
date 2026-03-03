# Unified Integration Plan v2 (performance + UX)

This expands `integration_review_todo.md` with your new requirements: user management UX (create/ban/unban), role capability visibility, explicit sorting (no surprise reordering), bulk ops, overlay + search store utilization, and missing pages.

---

## Current state (verified)

### User management UI (already exists)
- `src/components/app-views/users-view.tsx` already includes:
  - Create user UI (`CreateUserDialog`)
  - Change password UI (`ChangePasswordDialog`)
  - Per-row actions including ban/unban, delete, set role via `use*` hooks in `src/hooks/user-actions.ts`.

What’s missing is **cohesion** (URL filters + table model + sorting model + modals) and some admin features (impersonation, sessions, update user).

### Role capabilities data exists
- `src/lib/auth/permissions.ts` provides `getRoleCapabilities(role)`.
- `src/hooks/auth-hooks.ts` exposes `useCapabilities()` and `useHasCapability()`.

### Admin/RBAC routes exist in config but not as route files
- `routeConfig` and `NAV_STRUCTURE` mention RBAC routes (`/admin/rbac/*`).
- Under `src/routes/(authenticated)/admin/` only `users.tsx` exists (plus route/index).

### Store utilization
- `layoutStore` and `appStore` are integrated.
- `searchStore` is only used by legacy/inspiration layout components.
- `overlayStore` exists but isn’t mounted/used in the real app.

---

## Key UX issue: “changing role reorders the list”
Likely cause:
- Role change mutation invalidates `QUERY_KEYS.USERS.LIST`, triggering a refetch.
- The server (Better Auth admin listUsers) may return a different order after changes, or the UI uses whatever order arrives.

Goal:
- Default list order should be stable.
- Reordering should only occur when the user explicitly sorts (by email/name/role/etc).

Best fixes (in descending preference):
1) **Optimistic cache patching** for role/ban/unban/delete so the list doesn’t refetch/reorder.
2) **Stable default sort** (e.g., createdAt desc or email asc) enforced in the UI (or server) so refetches don’t reshuffle.
3) **Persist current order** in memory/store keyed by user IDs and reapply when new data arrives.

---

## Unified plan of action (TanStack-first)

### Phase 0 — Decide what is “live”
- Canonical layout/views: `src/components/app-layout/*` + `src/components/app-views/*` + `src/routes/*`.
- Treat `src/components/dashboard/*`, `src/components/dashboard2/*`, `src/components/layout/*`, and `src/components/admin/users/*` as inspiration only unless explicitly migrated.

### Phase 1 — Make Users page the reference implementation
Make `/(authenticated)/admin/users` the “gold” screen demonstrating Router + Query + Table + permissions.
- **Table**: adopt TanStack Table (`@tanstack/react-table`) and reuse `src/components/data-table/*`:
  - sorting headers (`column-header.tsx`)
  - pagination (`pagination.tsx`)
  - toolbar (`toolbar.tsx`)
  - view options (`view-options.tsx`)
  - bulk actions (`bulk-actions.tsx`)
- **Filters**: replace ad-hoc filter UI with `src/components/common/filters/*` and keep them synced with Router search via `useFilters`.
- **Sorting model**:
  - default sorting should be stable (or none) and not affected by mutations.
  - user-initiated sorting should be explicit (click header).
  - optionally sync sorting state into URL (so it’s shareable) but do not change it on mutations.
- **Query performance**:
  - add route prefetch (`ensureQueryData(usersListQueryOptions())`) so navigation/SSR hydration is faster.
  - consider `keepPreviousData` when pagination is introduced.

### Phase 2 — Fix mutation UX with overlay store (modal system)
Goal: remove scattered local modal state and use one overlay system.
- Mount `src/components/overlay-container.tsx` once at a root (authenticated shell or root route).
- Define overlays:
  - create user (drawer)
  - edit user (modal)
  - confirm delete (modal)
  - confirm ban/unban (modal)
  - user details (drawer)
  - filters (drawer on mobile)
- Users page should open overlays via `overlayActions.open(id, data)`.

### Phase 3 — Bulk operations
- Use `DataTableBulkActions` UX:
  - bulk delete
  - bulk ban/unban
  - bulk role set
- Add/extend server fns for bulk actions only when needed; keep them permission-gated.

### Phase 4 — RBAC “Capabilities” pages
You asked for a page that shows what roles can do.
- Implement a super-admin-only RBAC area that shows:
  - roles and their capabilities from `getRoleCapabilities`
  - role hierarchy (`ROLE_HIERARCHY`)
  - allowed routes computed from `routeConfig` + `canAccessRoute(route, role)`
  - permissions statements (from the Better Auth access control definitions)
- This aligns nav + SEO because routeConfig already contains titles/descriptions and `metadata.config.ts` derives from it.

### Phase 5 — Activate unused admin powers
- Add per-user actions:
  - impersonate user + global “stop impersonating” banner/button
  - view sessions for a user + revoke one + revoke all
  - update user (name/email) UI using `useUpdateUser`

### Phase 6 — Search store integration (command palette)
- Decide: global Cmd/Ctrl+K command palette is core UX.
- Wire `searchStore` into the canonical app header/layout.
- Use `buildNavigation(role)` (permission-filtered nav) as the command palette source.

---

## What to reuse from inspiration folders
- dashboard/dashboard2: reuse visuals (card composition, spacing, typography), but migrate into `app-views` components.
- components/admin/users: reuse the ban confirm dialog pattern and row layout ideas, but refactor to shadcn selects + `QUERY_KEYS` + queryOptions pattern.

---

## Open decisions (need your answers before implementation)
1) Should users list be server-side paginated/filterable now, or later?
2) For stable ordering: which default order do you want (createdAt desc, email asc, name asc)?
3) Should table sorting/filter state be encoded into the URL (shareable) or kept local?
4) Should impersonation be visible only to super admins, and should it be “obvious” (banner) when active?
