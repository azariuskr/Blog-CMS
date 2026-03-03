# WORKLOG

## 2026-02-03

### Setup/Infra
- Project exposed at: https://kris-hp-400.taile0e81a.ts.net/template/
- Base path configured: Vite base `/template/` + TanStack Router basepath `/template`
- Docker web container now loads .env.local + overrides VITE_BASE_URL/BETTER_AUTH_URL/INNGEST_APP_URL to avoid localhost.
- PgBouncer healthcheck fixed (nc-based) so it reports healthy.

### Next focus
- Auth/register/login functional tests (agent-browser)
- Comprehensive codebase review; convert findings into Kanban cards + PR plan.

## 2026-02-05

### Smoke testing (hosted behind /template)
- Signup (new user) + email verification: works. Verification email link points to `/template/auth/callback/verify-email?...` and redirects to `/template/auth/login`.
- Login (role=user): successful, but UX/security issues found:
  - ~~**Home CTA "Go to Dashboard" leads to `/template/dashboard` which returns 403** for role=user.~~ **FIXED** - Hero CTA now routes admins to Dashboard, regular users to Account Profile.
  - ~~**Non-admin user sees Admin navigation links** (Users, etc.).~~ **FIXED** - Navigation already filters by role via `canAccessRoute()`; also fixed sidebar header to show role-appropriate link/text.
  - ~~**Critical: role=user can access `/template/admin/users`** and view user list~~ **FIXED** - Changed `/admin/users` to require `minRole: ROLES.ADMIN` and removed `users: ["read"]` from user role.

### Security fixes applied
- `/admin/users` now requires `minRole: admin` instead of `permissions: { users: ["read"] }`
- Removed `users: ["read"]` permission from base `user` role
- Added `.dockerignore` with `docker/data` directory excluded
- Parameterized Tailscale hostname in docker-compose.yml (`TRAEFIK_HOST` env var)
- Dockerfile now runs as non-root user (`nodejs:nodejs`)
- Documented pgAdmin root user workaround with alternatives

### UX fixes applied
- Hero CTA button now shows "Go to Dashboard" for admins, "Go to Account" for regular users (routes to `/account` which redirects to settings)
- Sidebar header now shows role-appropriate link (Dashboard vs Account) and text ("Admin Panel" vs "Your Settings")
- Vite `allowedHosts` simplified to `true` (Traefik handles host validation)

### Code quality fixes applied
- `.env.example`: Uses realistic development defaults (postgres/password, minioadmin, etc.)
- `src/lib/storage/local.ts`: Fixed path traversal vulnerability with proper validation (normalize + resolve + basePath check)
- `src/lib/navigation/navigation.ts`: Removed commented-out code blocks
- `package.json`: Moved `@faker-js/faker` and `drizzle-kit` to devDependencies
- `src/lib/inngest/functions.ts`: Removed commented-out R2 case from getPublicUrl
- `src/lib/storage/service.ts`: Added error logging to all silent `.catch(() => {})` blocks
- `src/lib/storage/server.ts`: Added error logging to avatar cleanup catches
- `src/routes/api/storage/files/$.ts`: Added NaN validation for parseInt of expires parameter

### Claude Code integration
- `claude` binary was missing initially on server.
- Installed Claude Code; CLI is now available (tested `claude --version` shows 2.1.x). Login flow requires interactive auth.

## 2026-02-07

### Ecommerce module status
- Large ecommerce module built (uncommitted on main):
  - **Schema**: `src/lib/db/schema/ecommerce.schema.ts`
  - **Server functions**: cart, checkout, coupons, customers, inventory, orders, products, reviews, variants (`src/lib/ecommerce/functions/`)
  - **Queries**: `src/lib/ecommerce/queries.ts`
  - **Actions hook**: `src/hooks/ecommerce-actions.ts`
  - **Admin UI**: products CRUD, orders management, coupons, customers, inventory, reviews, shipping (`src/components/admin/ecommerce/`)
  - **Routes**: products (list/new/edit), orders (list/detail), coupons, customers, inventory, reviews, shipping
  - **Overlays**: stock adjustment, order cancel/ship, product delete, coupon form, review management
  - **Supporting**: cache layer (`src/lib/cache/`), inngest ecommerce events, URL utilities
- **Known issue**: Order detail view stuck in loading state (queryStatus: pending, data: undefined)
- **Billing**: Provider configured as `none` (Stripe/Polar not enabled)

### Inspiration repos cloned
- `~/projects/nextjs-starter-kit` (michaelshimeles/nextjs-starter-kit)
  - Next.js + Shadcn/Tailwind, dashboard with interactive charts + trend cards, billing (Stripe), R2 image uploads, chatbot
  - Useful patterns: section-cards with trend badges, sidebar nav, chart components
- `~/projects/e-commerce-ui` (safak/e-commerce-ui)
  - Next.js 15 + Tailwind CSS 4 + React 19 (minimal starter, mostly design assets)
  - Design direction: yellow/gold + dark modern aesthetic, wave/blob shapes, bold typography
  - Assets: product images (8 items), logo (shopping bag icon), featured hero banner, payment logos (Stripe, Klarna, Mastercard, Visa)
  - No components built yet - blank canvas with visual direction defined

### Kanban updated
- 7 new [ECOM] cards added to Backlog in local-kanban (project: infra/template)
- Task list created with dependency chain:
  1. Verify DB schema & seed data (first - unblocks 2,3,4)
  2. Test & fix product CRUD
  3. Test & fix order management
  4. Test & fix coupons, inventory, reviews, shipping, customers
  5. Design storefront UI (e-commerce-ui inspiration)
  6. Build customer-facing store pages (blocked by 5)
  7. Commit & PR ecommerce module (blocked by 2,3,4)

### Fixes applied
- **Critical**: Installed missing `nanoid` dependency (broke ALL server function bundling via Vite dep scan)
- Installed missing `redis` dependency
- Fixed `toISOString()` on serialized Date in `inngest/ecommerce.ts` (wrapped with `new Date()`)
- Fixed `Select defaultValue` → `value` in shipping-view.tsx
- Removed unused imports across cart.ts, checkout.ts, products.ts, ecommerce.schema.ts, shipping-view.tsx
- Zero ecommerce-specific TypeScript errors remaining

### Committed to feat/ecommerce branch
- `62e3ba6` - Improve infrastructure, security, and UX (16 files)
- `c64836a` - Add ecommerce module with admin management (96 files, ~13,300 lines)
- `d5bea8e` - Add project worklog
- Kanban: 8 cards moved to Done (5 ECOM tasks + 3 previously fixed bugs)

### Next focus
- Task #5: Design storefront UI (e-commerce-ui inspiration)
- Task #6: Build customer-facing store pages
