# Unified Integration Review + Next Steps (no code changes yet)

## High-level verdict
- **Canonical app implementation** is under `src/components/app-layout/*`, `src/components/app-views/*`, and `src/routes/*`.
- `src/components/dashboard/*`, `src/components/dashboard2/*`, and most of `src/components/layout/*` are **inspiration/legacy** and currently **not part of the authenticated route tree**.
- `src/components/admin/users/*` exists and has useful UI ideas, but is **unused** and also **doesn’t follow current project patterns** (hardcoded query key, Base UI Select, direct server fn call).

## Will Playwriter help?
Yes, if you give Playwriter access it can improve the verdict by:
- Verifying what is actually rendered per route (`/(authenticated)/dashboard`, `/(authenticated)/admin/users`, etc.).
- Catching UI/UX issues you can’t see in code: sidebar collapse/mobile behavior, command palette keyboard handling, focus traps, hydration edge cases.
- Validating accessibility and interaction flows (dialogs, overlays, keyboard nav).

It won’t replace code review, but it helps confirm what’s *really* live and how it behaves.

---

## What’s integrated vs not (important)

### Filters (`src/lib/filters/*`)
- ✅ Integrated for Users route: `validateSearch` in `src/routes/(authenticated)/admin/users.tsx` + `useFilters()` in `src/components/app-views/users-view.tsx`.
- ❌ Filter UI primitives exist but are unused anywhere: `src/components/common/filters/*`.
- ❌ `buildFilterQuery()` currently unused.
- ❌ `OrganizationFiltersSchema` / `SessionFiltersSchema` currently unused.

### Stores (`src/lib/store/*`)
- ✅ `appStore` (theme) is used (`__root.tsx`, `ThemeToggle`, `sonner`).
- ✅ `layoutStore` is used by the real layout (`src/components/app-layout/*`).
- ❌ `searchStore` is only used by legacy/inspiration components under `src/components/layout/*`; it is **not wired into the real app layout**.
- ❌ `overlayStore` is effectively unused: `src/components/overlay-container.tsx` exists but nothing mounts it; no calls to open overlays were found.

### Admin/server capabilities usage
- ✅ Used in real UI today: ban/unban, set role, delete user, create user, set password (all used from `src/components/app-views/users-view.tsx`).
- ❌ Not used in real UI today: `useUpdateUser`, `useRevokeSession`, `useRevokeAllUserSessions`, impersonation (`useImpersonateUser`, `useStopImpersonation`).
- ⚠️ Duplicate hook smell: `useClearTrustedDevice` appears in `src/hooks/user-actions.ts` and also another file `src/hooks/use-clearTrustedDevice.ts`.

---

## Dashboard/dashboard2/layout: should we reuse anything?

### `src/components/dashboard/*`
- Treat as **design inspiration only** for now.
- It hardcodes routes that don’t exist and doesn’t integrate with the permission-based nav.

### `src/components/dashboard2/*`
- Good for **visual direction** (cards, spacing, “finance-like” dashboard), but **not integrated** with Router/permissions/nav.
- If you like this look, the best path is: **extract purely presentational pieces** (cards, table styling, toolbar layout) into reusable components *inside the canonical app layout/views*, and delete/ignore the old route-less shell later.

### `src/components/layout/*`
- Mostly legacy/inspiration.
- Some files reference missing modules (e.g. `~/hooks/navigation/use-filtered-sidebar`), so it’s not a reliable foundation.
- Keep only if you explicitly want a second layout system; otherwise plan to deprecate.

### `src/components/admin/users/*`
- Contains useful UX building blocks (ban confirm dialog, role cell, row layout).
- But it’s currently **unused** and mismatched to current conventions:
  - `useSuspenseQuery({ queryKey: ['users'] })` instead of `QUERY_KEYS.USERS.LIST`.
  - Calls `$listUsers()` directly instead of query options (`usersListQueryOptions`).
  - Uses `@base-ui/react/select` (different UI stack than shadcn components used elsewhere).

Recommendation: **mine it for patterns**, but don’t wire it in directly without refactor.

---

## Performance-first integration plan (TanStack ecosystem maximized)

### Phase 1 — Make “canonical” paths explicit
- [ ] Decide: **canonical layout** = `src/components/app-layout/*` (recommended).
- [ ] Decide: keep `dashboard/dashboard2/layout/admin/users` as inspiration only (recommended).
- [ ] Add a short internal doc (or memory note) listing which folders are “live” vs “inspiration” to prevent accidental imports.

### Phase 2 — Users admin becomes the reference implementation
Goal: one route that demonstrates Router + Query + Table + URL filters + permissions.
- [ ] Convert `UsersView` to TanStack Table (`@tanstack/react-table`) using existing `src/components/data-table/*` components.
- [ ] Replace ad-hoc filter controls with `src/components/common/filters/*` (SearchInput/SelectFilter/FilterBar).
- [ ] Connect filtering to URL search params (already in place via `useFilters` + `validateSearch`).
- [ ] Add route-level prefetch via loader/beforeLoad: `ensureQueryData(usersListQueryOptions())` for faster navigation and SSR hydration.
- [ ] Add a clear mapping between `UserFiltersSchema` and either:
  - client-side filtering (cheap now, but scales poorly), or
  - server-side filtering (best for performance at scale).

### Phase 3 — Server-side list performance (optional but recommended)
- [ ] Extend `$listUsers` to accept `{ page, limit, search, role, status, sortBy, sortOrder }`.
- [ ] Update `QUERY_KEYS.USERS.LIST` to include filters (or add `QUERY_KEYS.USERS.PAGINATED(filters)`), so caching works correctly.
- [ ] Use TanStack Query to cache per-filter pages; use Router search params as the source of truth.

### Phase 4 — Activate unused admin powers (impersonation + sessions)
- [ ] Add impersonation UI entry points (button per user row + global “stop impersonating” banner).
- [ ] Add session management UI using existing server fns/hooks:
  - list sessions per user
  - revoke session
  - revoke all
- [ ] Add permission gating using `useHasPermission` / `useRole`.

### Phase 5 — Command palette and search store
- [ ] Decide: do you want command palette globally? If yes:
  - move/port the working `CommandMenu` concept into `src/components/app-layout/*` and wire it to `useSearch()`.
  - base its contents on `buildNavigation(role)` from `src/lib/auth/navigation.ts`.

### Phase 6 — Overlay store (only if you want centralized dialogs)
- [ ] Mount `src/components/overlay-container.tsx` once in a root layout.
- [ ] Replace scattered dialog open state with `overlayActions.open()`.
- [ ] Keep overlays type-safe and permission-gated.

---

## Concrete “missing integration” checklist
- [ ] `src/components/common/filters/*` are unused → wire into UsersView first.
- [ ] `src/components/data-table/*` exist → make UsersView use them (becomes the reference).
- [ ] `src/lib/store/search.ts` not used in canonical layout → decide and integrate or remove.
- [ ] `src/lib/store/overlay.ts` not mounted → decide and integrate or remove.
- [ ] Impersonation/session hooks exist but no UI → plan UI surfaces.
- [ ] Duplicate trusted-device hook → consolidate later.

---

## Questions you should answer before we implement
1) Do you want **server-side pagination/filtering** now, or is client-side ok until user count grows?
2) Should the dashboard be **admin-ops** (users, sessions, security) or more “product analytics”?
3) Do you want a **command palette** globally (Cmd/Ctrl+K) as a core feature?
4) Should dialogs be **local state** (simple) or **overlay store** (centralized)?
