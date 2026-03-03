# Project Guidance

## Architecture
- TanStack Router (file-based, `src/routes`) with generated `routeTree.gen.ts`; router created in `src/router.tsx` and SSR/query integration via `@tanstack/react-router-ssr-query`.
- TanStack Query via `src/integrations/tanstack-query/root-provider.tsx`; prefer centralized query/mutation keys from `src/constants.ts`.
- State helpers from TanStack Store are present but not heavily used; favor TanStack Query/Router context.

## Auth & Permissions
- Auth powered by Better Auth (`src/lib/auth/auth.ts` server, `auth-client.ts` client) with drizzle adapter and admin plugin using access control from `src/lib/auth/permissions.ts`.
- Navigation/SEO permissions derive from `routeConfig` in `permissions.ts`; use `canAccessRoute`, `hasMinimumRole`, and `checkPermission` for gating.
- Client hooks from `@daveyplate/better-auth-tanstack` exposed in `src/hooks/auth-hooks.ts` (use `useSession`, `useRole`, `useHasPermission`, `useCanAccessRoute`, etc.).

## Result & Validation Patterns
- Use `src/lib/result.ts` (`Ok`, `Err`, `safe`, `unwrap`, `HttpError` helpers) for async outcomes.
- Prefer Zod validation via `src/lib/validation.ts` (`validate`, `zodValidator`, `isValidationError`, `validationError`).
- Actions should return `Result` and surface messages for toasts where appropriate.

## Actions & Mutations
- Use `src/hooks/use-action.ts` for mutation flows (toast handling, validation error surfacing, cache invalidation). For forms, prefer `useFormAction`.
- To wrap server functions, use `fromServerFn`; to wrap plain async work, use `toAction`/`safe`.

## Navigation & Routing
- Central routes and magic strings in `src/constants.ts`; reuse `ROUTES`, `QUERY_KEYS`, `MUTATION_KEYS`, `MESSAGES`, `ROLES`.
- Navigation is derived from `routeConfig` + `NAV_STRUCTURE` in `src/lib/auth/navigation.ts`; add new routes there for consistent breadcrumbs/sidebar.
- Ensure new routes have matching files under `src/routes` and entries in `routeConfig`/`constants` to avoid dead links.

## SEO
- SEO utilities in `src/lib/seo` (`metadata.config.ts`, `generateMetadata.ts`, `components.tsx`); prefer `getMetadataForRoute`/`createDynamicMetadata` for route metadata.
- Update `siteConfig` with real product values before launch.

## UI & Styling
- UI library: shadcn/ui components under `src/components/ui`; use existing primitives before adding new ones.
- Toasts via `sonner`; icons via `lucide-react`; animations via `tw-animate-css`.
- Tailwind CSS (v4) styles in `src/styles`.

## Testing & Tooling
- Use `pnpm test` (Vitest) for tests; lint/format with Biome (`pnpm lint`, `pnpm format`, `pnpm check`).

## Contribution Notes
- Keep changes consistent with existing patterns; avoid inline comments unless necessary.
- Prefer centralized constants/hooks/utilities over ad-hoc strings or duplicated logic.

---

# Patterns & Methodologies Reference

## Result Pattern (`src/lib/result.ts`)
```typescript
// Type: Result<T, E> = Ok<T> | Err<E>
// Usage:
import { Ok, Err, safe, unwrap } from '@/lib/result'

// Wrap async operations
const result = await safe(asyncOperation())

// Return from actions
return Ok({ data })
return Err({ message: 'Failed' })

// HTTP error helpers
return unauthorized('Not authenticated')
return forbidden('Access denied')
return notFound('Resource not found')
return badRequest('Invalid input')
```

## Validation Pattern (`src/lib/validation.ts`)
```typescript
import { validate, zodValidator, isValidationError } from '@/lib/validation'

// Server-side validation returning Result
const result = validate(schema, data)
if (!result.ok) return Err(result.error)

// Form validators for react-hook-form
zodValidator(schema)

// Check validation errors
if (isValidationError(error)) { /* handle */ }
```

## Action Hooks (`src/hooks/use-action.ts`)
```typescript
import { useAction, useFormAction, fromServerFn, toAction } from '@/hooks/use-action'

// For server functions
const mutation = useAction(fromServerFn($serverFunction), {
  successMessage: MESSAGES.SUCCESS.UPDATED,
  invalidateKeys: [QUERY_KEYS.USERS.LIST],
})

// For forms with error handling
const mutation = useFormAction(fromServerFn($serverFunction), {
  setErrors: form.setError,
})

// For plain async
const mutation = useAction(toAction(asyncFn))
```

## Auth Hooks (`src/hooks/auth-hooks.ts`)
```typescript
import {
  useSession,        // Current session data
  useUser,           // Current user
  useRole,           // User's role
  useIsAuthenticated,
  useHasRole,        // Check specific role
  useHasMinRole,     // Check minimum role level
  useHasPermission,  // Check specific permission
  useCanAccessRoute, // Check route access
  useCapabilities,   // All user capabilities
} from '@/hooks/auth-hooks'
```

## Permissions (`src/lib/auth/permissions.ts`)
```typescript
import {
  canAccessRoute,    // Check if role can access route
  hasMinimumRole,    // Check role hierarchy
  checkPermission,   // Check specific permission
  getRouteConfig,    // Get route metadata
  routeConfig,       // Route configurations
} from '@/lib/auth/permissions'

// Route config structure
routeConfig['/dashboard'] = {
  title: 'Dashboard',
  description: 'User dashboard',
  icon: LayoutDashboard,
  minRole: 'user',
  showInNav: true,
  parent: '/',
}
```

## Navigation (`src/lib/auth/navigation.ts`)
```typescript
import {
  buildNavigation,      // Build nav for user role
  generateBreadcrumbs,  // Build breadcrumbs from path
  NAV_STRUCTURE,        // Sidebar structure definition
} from '@/lib/auth/navigation'

// Build filtered navigation
const navItems = buildNavigation(userRole)
const breadcrumbs = generateBreadcrumbs('/admin/users')
```

## Constants (`src/constants.ts`)
```typescript
import {
  ROUTES,          // Centralized route paths
  QUERY_KEYS,      // TanStack Query keys
  MUTATION_KEYS,   // Mutation identifiers
  MESSAGES,        // Toast/UI messages
  ROLES,           // Role enum
  ROLE_HIERARCHY,  // Role levels
} from '@/constants'

// Usage
navigate(ROUTES.DASHBOARD)
queryKey: QUERY_KEYS.AUTH.SESSION
toast.success(MESSAGES.SUCCESS.SAVED)
```

## SEO (`src/lib/seo/`)
```typescript
import { getMetadataForRoute, createDynamicMetadata } from '@/lib/seo/metadata.config'
import { SeoHead } from '@/lib/seo/components'

// Static route metadata
const meta = getMetadataForRoute('/dashboard')

// Dynamic metadata
const meta = createDynamicMetadata({
  title: 'User Profile',
  description: 'View user profile',
})

// In route component
<SeoHead metadata={meta} />
```

---

# Backend API Coverage

## Admin Management API - FULL COVERAGE

### Server Functions (`src/lib/auth/functions.ts`)

| Function | Description | Method | Permission |
|----------|-------------|--------|------------|
| `$getUser` | Get current authenticated user | GET | Public |
| `$getMyRoleInfo` | Get current user's role and capabilities | GET | Public |
| `$listUsers` | List all users with pagination | GET | `users:read` |
| `$getUserById` | Get single user by ID | POST | `users:read` |
| `$createUser` | Create new user | POST | `users:create` |
| `$updateUser` | Update user details | POST | `users:write` |
| `$deleteUser` | Delete user | POST | `users:delete` |
| `$setUserRole` | Change user role | POST | `users:write` |
| `$setUserPassword` | Set user password | POST | `users:write` |
| `$banUser` | Ban a user | POST | `users:ban` |
| `$unbanUser` | Unban a user | POST | `users:ban` |
| `$listUserSessions` | List user's sessions | POST | `users:read` |
| `$revokeSession` | Revoke single session | POST | `users:write` |
| `$revokeAllUserSessions` | Revoke all user sessions | POST | `users:write` |
| `$impersonateUser` | Impersonate user | POST | `minRole: admin` |
| `$stopImpersonation` | Stop impersonating | POST | Auth required |
| `$checkRouteAccess` | Check route access for user | POST | Public |
| `$clearTrustedDevice` | Clear trusted device cookie | POST | Auth required |

### Validation Schemas
```typescript
BanUserSchema      // { userId, reason?, expiresIn? }
SetRoleSchema      // { userId, role }
UserIdSchema       // { userId }
CreateUserSchema   // { email, password, name, role? }
UpdateUserSchema   // { userId, name?, email? }
SetPasswordSchema  // { userId, newPassword }
RouteSchema        // { route }
SessionTokenSchema // { token }
```

## Frontend Hooks Coverage

### Mutation Hooks (`src/hooks/user-actions.ts`)

| Hook | Server Function | Invalidates |
|------|-----------------|-------------|
| `useCreateUser` | `$createUser` | `QUERY_KEYS.USERS.LIST` |
| `useUpdateUser` | `$updateUser` | `QUERY_KEYS.USERS.LIST` |
| `useDeleteUser` | `$deleteUser` | `QUERY_KEYS.USERS.LIST` |
| `useSetUserPassword` | `$setUserPassword` | - |
| `useSetUserRole` | `$setUserRole` | `QUERY_KEYS.USERS.LIST` |
| `useBanUser` | `$banUser` | `QUERY_KEYS.USERS.LIST` |
| `useUnbanUser` | `$unbanUser` | `QUERY_KEYS.USERS.LIST` |
| `useRevokeSession` | `$revokeSession` | `QUERY_KEYS.USERS.LIST` |
| `useRevokeAllUserSessions` | `$revokeAllUserSessions` | `QUERY_KEYS.USERS.LIST` |
| `useImpersonateUser` | `$impersonateUser` | `QUERY_KEYS.AUTH.SESSION/USER` |
| `useStopImpersonation` | `$stopImpersonation` | `QUERY_KEYS.AUTH.SESSION/USER` |
| `useClearTrustedDevice` | `$clearTrustedDevice` | `QUERY_KEYS.AUTH.USER` |

### Query Hooks (`src/lib/auth/queries.ts`)

| Hook | Query Options | Query Key |
|------|---------------|-----------|
| `useUsersList` | `usersListQueryOptions()` | `QUERY_KEYS.USERS.LIST` |
| `useUserDetail` | `userDetailQueryOptions(userId)` | `QUERY_KEYS.USERS.DETAIL(userId)` |
| `useUserSessions` | `userSessionsQueryOptions(userId)` | `QUERY_KEYS.USERS.SESSIONS(userId)` |
| `useRouteAccess` | `routeAccessQueryOptions(route)` | `QUERY_KEYS.ROUTE_ACCESS(route)` |
| `useRoleInfo` | `roleInfoQueryOptions()` | `QUERY_KEYS.AUTH.ROLE_INFO` |

### Query Options for SSR/Loaders
```typescript
import {
  authQueryOptions,        // Current session
  roleInfoQueryOptions,    // Role info
  usersListQueryOptions,   // Users list
  userDetailQueryOptions,  // Single user
  userSessionsQueryOptions,// User sessions
  routeAccessQueryOptions, // Route access check
} from '@/lib/auth/queries'
```

## Account Management

### Current Implementation
- Account page has 5 tabs: settings, security, appearance, notifications, display
- Settings tab uses Better Auth UI's `AccountSettingsCards`
- Security tab has `TrustedDeviceCard` + `SecuritySettingsCards`
- Other tabs show "Coming soon"

### Better Auth Client Methods (via `auth-client.ts`)
```typescript
// Already exported and available
signIn, signUp, signOut, useSession
changeEmail    // Change user email
deleteUser     // Delete own account
// Admin client methods also available via adminClient plugin
```

---

# Creating New Features Checklist

### Adding a New Route
1. Create route file in `src/routes/` following file-based routing conventions
2. Add route path to `ROUTES` in `src/constants.ts`
3. Add route config to `routeConfig` in `src/lib/auth/permissions.ts`
4. Add to `NAV_STRUCTURE` in `src/lib/auth/navigation.ts` if visible in nav
5. Add metadata to `METADATA` in `src/lib/seo/metadata.config.ts`

### Adding a New Server Function
1. Create function in `src/lib/auth/functions.ts`
2. Use `createServerFn` from TanStack Start
3. Apply `accessMiddleware` for protected routes
4. Use `validate()` for input validation with existing schema or create new one
5. Return `Result` type (`Ok`/`Err`) via `safe()` wrapper
6. Use `adminApi` helpers from `server.ts` for Better Auth operations

### Adding a New Mutation Hook
1. Create server function as above
2. Create hook in `src/hooks/user-actions.ts`
3. Use `useAction` from `use-action.ts`
4. Use keys from `QUERY_KEYS` in constants for invalidation
5. Set `showToast: true` for user feedback

### Adding a New Query Hook
1. Create server function (GET or POST depending on needs)
2. Create query options in `src/lib/auth/queries.ts`
3. Create hook using `useQuery(queryOptions)`
4. Use keys from `QUERY_KEYS` for caching

### Adding UI Components
1. Check `src/components/ui/` for existing shadcn components
2. Use existing primitives before adding new ones
3. Follow existing styling patterns (Tailwind v4)
4. Use `ROLES`/`ROLE_LABELS` from constants instead of hardcoding
