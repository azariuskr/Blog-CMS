# Playwriter UI Review: Users pages

## Pages reviewed
- Reference/inspiration: `http://localhost:5173/users?page=49`
- Project: `http://localhost:3000/admin/users`

## What the 5173 `/users` page demonstrates (worth copying)
- **Table UX shell**: clear page title/description + primary actions (Invite/Add).
- **Table toolbar**:
  - single search box
  - faceted filters (Status, Role)
  - “View” options button
- **Selection + bulk pattern**:
  - row selection uses `[role="checkbox"]` (11 checkboxes detected) including a select-all header.
- **Pagination**:
  - explicit navigation controls exist (“Go to first/previous/next/last page” + numbered pages).
- **Sortable columns**:
  - at least `Username` and `Email` are buttons in the header (suggests explicit sorting).

## What our 3000 `/admin/users` page currently has
- Page title/description: `User Management` + subtitle.
- Filters:
  - search input (`placeholder="Search users..."`)
  - role/status selects (“All roles”, “All statuses”)
  - clear/reset button exists when filters active (from code).
- Table:
  - headers: `User`, `Role`, `Status`, `Created`.
  - no sortable headers detected (`thead th button` = none).
  - no selection/checkbox model.
- Row actions (confirmed by opening the menu):
  - `Change Password`, `Ban User`, `Delete User`.

## Biggest gaps (actionable)
1) **TanStack Table integration** is not active in the live Users page.
   - You already have `src/components/data-table/*` components (pagination, column header, view options, bulk actions), but they’re not wired into `src/components/app-views/users-view.tsx`.

2) **Sorting should be explicit and stable**.
   - Today, role change invalidates/refetches and can reshuffle results.
   - Desired behavior: only change order when user selects a sort column.

3) **Bulk ops + selection** missing.
   - Add row selection + bulk ban/unban/delete/role set (permission-gated).

4) **Missing admin actions**.
   - No impersonation, no per-user sessions view/revoke, no update user (name/email) UI.

5) **Overlay + command palette stores not utilized in canonical layout**.
   - Use overlay store for create/edit/confirm dialogs.
   - Use search store for global command palette (Cmd/Ctrl+K) driven by permission-based nav.
