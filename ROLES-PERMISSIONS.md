# ROLES-PERMISSIONS.md

## Source of Truth
Role/permission checks are centralized in:
- `src/lib/auth/permissions.ts`
- `src/lib/auth/middleware.ts`
- `src/lib/auth/server.ts`

Route-level access is defined via `routeConfig` in `permissions.ts` and enforced by:
- `canAccessRoute()` in route guards
- `accessMiddleware()` in server functions

## Current Runtime Roles
- `user`
- `moderator`
- `admin`
- `superAdmin`

These are mapped in Better Auth access control (`roles` export) and used by client + server checks.

## Platform vs Organization Scope
- `superAdmin` = platform-wide authority.
- Organization actions are handled through Better Auth Organizations plugin and scoped by active organization context.

## Target Product Roles (Roadmap)
Product-facing naming target remains:
- `reader`, `author`, `editor`, `admin`, `superAdmin`

Current runtime roles already cover admin/platform needs.
Reader/author/editor split is planned as a product-layer refinement in later phases without introducing a second permission source.

## Guard Rails
- Do not add ad-hoc role checks in random components/actions.
- Use helpers from `permissions.ts` (`checkPermission`, `hasMinimumRole`, `canAccessRoute`).
- For server functions, prefer `accessMiddleware({...})`.
