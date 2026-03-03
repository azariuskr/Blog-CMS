# better-tanstart-template

## Purpose
TanStack Start/Router starter with Better Auth (RBAC/admin) + TanStack Query + shadcn/ui + Tailwind v4, with file-based routing under `src/routes`.

## Key Architecture
- Router: TanStack Router file-based (`src/routes`, generated `src/routeTree.gen.ts`, router in `src/router.tsx` with `@tanstack/react-router-ssr-query` integration)
- Data: TanStack Query integration in `src/integrations/tanstack-query/`
- Auth: Better Auth with permissions/navigation helpers in `src/lib/auth/`
- UI: shadcn components in `src/components/ui`, layout in `src/components/app-layout`

## Notable patterns in repo
- Central constants: `src/constants.ts` (routes, query keys, roles, messages)
- URL-search filters helpers: `src/lib/filters/*`
- TanStack Store helpers: `src/lib/store/*`
