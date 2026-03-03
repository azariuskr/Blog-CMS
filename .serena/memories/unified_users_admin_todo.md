# Unified Admin/Users + Integration Plan (Summary)

## Context / Goals
- Make `/admin/users` as smooth and capable as the reference UI (`http://localhost:5173/users`).
- Stay consistent with project patterns: TanStack Router/Query, `useFilters`, `useAction`/`useFormAction`, `Result`/Zod validation, shadcn/ui primitives.
- **Avoid** introducing provider-style architectures from the reference (context providers for dialogs/table state), unless already established in this repo.

---

## Done / Verified
### Reference folder review (`src/components/admin/users/**`)
- Reviewed all key files.
- Determined it is a **standalone demo** and cannot be adopted directly without major rewiring.
- Found correctness issues inside the reference folder itself:
  - `src/components/admin/users/components/users-provider.tsx`: uses `<UsersContext value={...}>` instead of `<UsersContext.Provider ...>` → `useUsers()` would fail.
  - `src/components/admin/users/components/users-dialogs.tsx`: `onOpenChange` ignores the boolean and forces `setOpen('add'|'edit'...)` → dialogs won’t close properly.
  - `src/components/admin/users/components/users-table.tsx`: depends on a missing/foreign pattern (`useTableUrlState`) + demo-only URL state approach.
  - `src/components/admin/users/components/users-action-dialog.tsx`: depends on `react-hook-form` + extra UI components not aligned with this project’s patterns.

### Users/admin improvement work that already exists in this repo (current state)
- `/admin/users` already uses TanStack Table + shared DataTable components.
- Column “View” menu toggling has been addressed in `src/components/data-table/view-options.tsx` (menu items toggle column visibility).
- Permissions mismatch for `users:*` actions was addressed in `src/lib/auth/permissions.ts` (server middleware + UI permission checks align).
- `UserFiltersSchema` was expanded to accept array values for `role`/`status` (faceted multi-select support).

---

## Current Gaps / What’s Left
### A) Users page UX/behavior parity vs reference (`/admin/users`)
- Ensure these are solid and consistent:
  - Search input reflects URL state and does not “fight” navigation updates.
  - Faceted filters (Status/Role) update URL and table correctly.
  - Pagination and page number buttons behave consistently and don’t land on empty pages after filtering.
  - Rows-per-page select updates page size reliably.
  - Column visibility menu is usable and does not close unexpectedly.

### B) Missing admin user-management UI (high priority)
- Add/complete UI flows that are currently missing or incomplete:
  - Create user modal (name/email/password/role) using `useFormAction(fromServerFn($createUser))`.
  - Edit user modal (name/email/role + optional set password) using `useFormAction`.
  - Ban/Unban confirmation modal with reason/expires inputs (if supported) using existing server fns.
  - Impersonation: confirm modal + “stop impersonation” UX.
  - Delete user confirm modal.
  - Bulk operations (optional): multi-delete, bulk ban/unban, bulk role assign.

### C) Sorting/reordering policy (per your requirement)
- When a user’s role/status changes, the list **must not auto-reorder** unless the user explicitly sorts.
- Implement stable ordering when `sorting.length === 0` (keep order stable across mutations) and only reorder when the user sorts by a column.

### D) Capabilities / roles transparency page (recommended)
- Add an admin page that lists:
  - Roles → permissions (capabilities)
  - Roles → allowed routes (based on `routeConfig` / `canAccessRoute`)
  - Descriptions/tooltips for permissions
- This helps verify RBAC quickly and matches the “admin dashboard” feel.

### E) Data source & performance considerations
- Current `$listUsers` returns the full list (no server-side filtering/pagination).
- Decide on approach:
  - Short-term: keep client-side table, but make UI state rock-solid.
  - Medium-term: if Better Auth admin API supports params, implement server-side pagination/filtering and wire to query keys (best performance at scale).

### F) Overlay/store integration (optional but useful)
- Evaluate `src/lib/store/**` and `src/lib/filters/**` usage:
  - Use overlay store for consistent modals (create/edit/confirm) if it matches existing patterns.
  - Ensure filter state is centralized (URL + `useFilters`) and reused across pages.

### G) Navigation + SEO integration check
- Verify `/admin/users` entry is consistent with:
  - `routeConfig` permissions (showInNav, parent)
  - `NAV_STRUCTURE` / breadcrumbs
  - metadata config for route title/description

---

## Proposed Execution Plan (Phased)
1) **Stabilize table state**: search/filters/pagination/page-size/columns all deterministic and URL-synced.
2) **Add missing CRUD + admin actions**: Create/Edit/Delete/Ban/Unban/Impersonate with confirmations (modals).
3) **Polish UX**: unify header, reduce duplicated titles, adopt reference-style toolbar buttons, improve empty/error states.
4) **RBAC visibility page**: roles/capabilities/routes matrix.
5) **Performance upgrade (optional)**: server-side list/filter/sort/paginate if supported by backend.

---

## Notes about inspiration folders
- `src/components/admin/users/**` remains **inspiration only**; it is not aligned to this repo’s route/layout/auth patterns and contains internal bugs.
- Similar “inspiration-only” folders (dashboard/dashboard2/layout/etc.) should be audited later to extract UX ideas without importing their architecture.
