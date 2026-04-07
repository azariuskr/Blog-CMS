# PLAN4.0.md — Sites, API Keys, Gifting & Org Wiring

> Continuation of `PLAN3.0.md` (UI/UX phases 9-18).
> This plan covers **Phase 19–22**: fixing the sites/API-key layer, user-facing sites dashboard,
> admin gifting flow, and wiring organisations to site ownership.
> All decisions locked in conversation session `aaf9d435` (Apr 2026).

## Status Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done
- `[!]` blocked

---

## 0) Context & Decisions

### What already exists
- `sites` + `api_keys` tables in `cms.schema.ts`; AES-256-GCM key encryption helpers in `src/lib/api-keys/`
- `$rotateApiKey` / `$upsertWebhook` server functions in `src/lib/api-keys/functions.ts` — both broken (wrong permissions; webhook is insert-only)
- `$listSites` in `src/lib/blog/functions.ts` — returns ALL sites with no ownership/org scoping
- `OrganizationSwitcher` from `@daveyplate/better-auth-ui` active in sidebar (`app-sidebar.tsx:56`)
- Org management UI at `/org/$organizationView` via `OrganizationView` component
- `sites.organizationId` FK + `sites.ownerId` FK both exist (nullable)
- `posts` already pass `activeOrganizationId` on create
- Admin sites page at `src/routes/(authenticated)/admin/blog/sites.tsx` — no ownership assignment or gifting

### Decisions locked
| Topic | Decision |
|-------|---------|
| API key copy | Permanent copy button (masked display `sk-live-xxxx…`); server fn decrypts AES-256-GCM on demand; key never shown in full in UI |
| Key rotation | Keep rotate button, but fix permission so **site owner** can rotate their own keys |
| Webhook | Fix to true upsert (`onConflictDoUpdate`); allow site owner, not just admin |
| Admin gifting | Admin creates site + assigns to a user; `grantedByAdmin: true`, optional `grantedUntil` timestamp; bypasses `planSitesLimit` check |
| Org ↔ Sites | Sites created while an org is active get `organizationId`; personal sites get `ownerId`; `$listSites` filters accordingly |
| Site plan check | Normal (non-gifted) site creation checks `user.planSitesLimit` vs current site count |

---

## Phase 19 — Sites & API Key Infrastructure

**Goal:** Database schema changes, permission fixes, and server function corrections.
Nothing user-visible yet — purely backend correctness.

### 19.1 Schema — `api_keys` table

Add `keyEncrypted text` column (stores AES-256-GCM ciphertext of the full raw key):

```sql
ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "key_encrypted" text;
```

Drizzle schema field:
```typescript
keyEncrypted: text("key_encrypted"),
```

After adding: backfill is NOT needed for existing keys — they will simply lack a copy button until rotated.

### 19.2 Schema — `sites` table

Add admin-gifting metadata columns:

```sql
ALTER TABLE "sites"
  ADD COLUMN IF NOT EXISTS "granted_by_admin" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "granted_until"    timestamp;
```

Drizzle schema fields:
```typescript
grantedByAdmin: boolean("granted_by_admin").notNull().default(false),
grantedUntil:   timestamp("granted_until"),
```

Add migration file: `drizzle/0018_phase19_api_key_encrypted_site_gifting.sql`

### 19.3 Fix `$rotateApiKey` — allow site owner

File: `src/lib/api-keys/functions.ts`

Current: `minRole: "admin"` — blocks site owners.

Change: remove role guard; instead verify the calling user owns the site (ownerId match OR org membership) **before** rotating. Pattern:

```typescript
// Fetch site, check ownerId === session.user.id  OR  site.organizationId is in user's orgs
const site = await db.query.sites.findFirst({ where: eq(sites.id, data.siteId) });
if (!site) throw new Error("Site not found");
const isOwner = site.ownerId === session.user.id;
const isOrgMember = site.organizationId !== null && userOrgIds.includes(site.organizationId);
if (!isOwner && !isOrgMember && userRole !== "admin" && userRole !== "superAdmin") {
  throw new Error("Forbidden");
}
```

### 19.4 Fix `$upsertWebhook` — true upsert + owner permission

File: `src/lib/api-keys/functions.ts`

Current: `onConflictDoNothing` — webhooks can only ever be inserted, never updated.

Change:
1. Apply same ownership check as 19.3 (owner or org member or admin)
2. Replace `onConflictDoNothing()` with `onConflictDoUpdate({ target: apiWebhooks.apiKeyId, set: { url: sql`excluded.url`, events: sql`excluded.events` } })`
   - **Do NOT regenerate the secret on update** — preserve the existing one so the webhook receiver doesn't break. Secret is only set at insert time.
   - Current code generates a new `randomBytes(32)` secret on every call, but `onConflictDoNothing` silently discards it. The fix: move secret generation inside the insert branch only.

### 19.5 Fix `$listSites` — scope to owner/org

File: `src/lib/blog/functions.ts`

Current: returns ALL sites — any user with `content:read` sees every site.

Change: filter by:
- `ownerId = session.user.id` (personal sites), **OR**
- `organizationId IN (user's active org ids)` (org sites)
- Admins/superAdmins see all (no filter)

```typescript
const userRole = (session?.user as any)?.role;
const isAdmin = ["admin", "superAdmin"].includes(userRole);

const items = isAdmin
  ? await db.query.sites.findMany({ orderBy: [desc(sites.createdAt)] })
  : await db.query.sites.findMany({
      where: or(
        eq(sites.ownerId, session!.user.id),
        inArray(sites.organizationId, userOrgIds),
      ),
      orderBy: [desc(sites.createdAt)],
    });
```

### 19.6 Add `$copyApiKey` server function

New server function that accepts `{ apiKeyId }`, fetches the encrypted key, decrypts it with `API_KEY_ENCRYPTION_SECRET`, and returns the plaintext. Only callable by site owner / org member / admin.

File: `src/lib/api-keys/functions.ts`

```typescript
export const $copyApiKey = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ apiKeyId: z.string() })))
  .middleware([accessMiddleware({ permissions: { content: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      // 1. fetch api key + site
      // 2. ownership check (same as rotate)
      // 3. decrypt keyEncrypted
      // 4. return plaintext
    });
  });
```

### 19.6b Create `src/lib/api-keys/encryption.ts` (new file)

No encryption helper exists yet. Create it:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env/server";

const ALGO = "aes-256-gcm";

export async function encryptKey(raw: string): Promise<string> {
  const key = Buffer.from(env.API_KEY_ENCRYPTION_SECRET, "hex"); // 32-byte hex
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(24hex) + tag(32hex) + ciphertext(hex)
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export async function decryptKey(stored: string): Promise<string> {
  const key = Buffer.from(env.API_KEY_ENCRYPTION_SECRET, "hex");
  const iv = Buffer.from(stored.slice(0, 24), "hex");
  const tag = Buffer.from(stored.slice(24, 56), "hex");
  const ciphertext = Buffer.from(stored.slice(56), "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
```

Requires `API_KEY_ENCRYPTION_SECRET` env var (64-char hex = 32 bytes). Add to `.env.example`.

### 19.7 Wire `keyEncrypted` into key generation

When a new API key is generated or rotated, store the encrypted value alongside the hash:

File: `src/lib/api-keys/functions.ts` — `$createApiKey` / `$rotateApiKey`

```typescript
import { encryptKey } from "@/lib/api-keys/encryption"; // created in 19.6b
// After generating rawKey:
const keyEncrypted = await encryptKey(rawKey);
// Insert/update: { ..., keyEncrypted }
```

### 19.8 Add `$createSite` server function (new — doesn't exist yet)

File: `src/lib/blog/functions.ts`

```typescript
export const $createSite = createServerFn({ method: "POST" })
  .inputValidator(validate(CreateSiteSchema))
  .middleware([accessMiddleware({ permissions: { content: ["read"] } })])
  .handler(async ({ data, context }) => {
    return safe(async () => {
      const session = context.session;
      const userRole = (session?.user as any)?.role;
      const isAdmin = ["admin", "superAdmin"].includes(userRole);
      const activeOrgId = (session?.user as any)?.activeOrganizationId ?? null;

      // Plan limit check (skip for admin)
      if (!isAdmin) {
        const planLimit = (session?.user as any)?.planSitesLimit ?? 0;
        const count = await db.$count(sites, eq(sites.ownerId, session!.user.id));
        if (count >= planLimit) throw { status: 403, message: "Site limit reached. Upgrade your plan." };
      }

      const [inserted] = await db.insert(sites).values({
        name: data.name,
        domain: data.domain ?? null,
        allowedOrigins: data.allowedOrigins ?? null,
        ownerId: activeOrgId ? null : session!.user.id,
        organizationId: activeOrgId,
      }).returning();

      return inserted;
    });
  });
```

### Checklist — Phase 19
- [ ] Write migration SQL `drizzle/0018_phase19_api_key_encrypted_site_gifting.sql`
- [ ] Add `keyEncrypted` to `api_keys` Drizzle schema
- [ ] Add `grantedByAdmin`, `grantedUntil` to `sites` Drizzle schema
- [ ] Create `src/lib/api-keys/encryption.ts` with `encryptKey` / `decryptKey`
- [ ] Add `API_KEY_ENCRYPTION_SECRET` to `.env.example` and server env schema
- [ ] Fix `$rotateApiKey` — ownership check, remove `minRole: "admin"`, store `keyEncrypted`
- [ ] Fix `$upsertWebhook` — ownership check + `onConflictDoUpdate` (preserve secret, update url/events only)
- [ ] Fix `$listSites` — scope to `activeOrganizationId` OR personal `ownerId`, admins see all
- [ ] Add `$copyApiKey` server function (decrypt on demand)
- [ ] Wire `keyEncrypted` into `$createApiKey` + `$rotateApiKey`
- [ ] Add `$createSite` server function
- [ ] Run migration against dev DB

---

## Phase 20 — User Sites Dashboard

**Goal:** Users can see, create, and manage their own sites from `/dashboard/sites`.

### 20.1 Route: `/dashboard/sites`

File: `src/routes/(authenticated)/dashboard/sites.tsx`

Renders:
- List of sites the user owns (personal) or manages (org)
- "Create site" button (gated on `planSitesLimit` — if `currentSiteCount >= planSitesLimit`, show upgrade prompt unless `grantedByAdmin`)
- Per-site card with: domain, created date, status, "Manage" button

### 20.2 Route: `/dashboard/sites/$siteId`

File: `src/routes/(authenticated)/dashboard/sites/$siteId.tsx`

Tabbed view:
1. **Overview** — site details, allowed origins, domain
2. **API Keys** — list of keys; each row shows masked key (`sk-live-xxxx…`) with permanent **Copy** button (calls `$copyApiKey`, writes to clipboard); **Rotate** button; delete
3. **Webhooks** — show current webhook (url, events); edit form (calls `$upsertWebhook`); remove button
4. **Settings** — rename site, delete site (with confirmation)

### 20.3 Copy button UX

```tsx
<Button variant="ghost" size="icon" onClick={handleCopy}>
  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
</Button>
```

`handleCopy`:
1. Call `$copyApiKey({ apiKeyId })` (server fn)
2. `navigator.clipboard.writeText(plaintext)`
3. Set `copied = true` for 2 seconds (visual feedback)
4. Key is NOT stored in component state — fetched fresh each time

### 20.4 Create site flow

Modal/dialog:
- Name, domain (optional), allowed origins (optional)
- On submit: `$createSite({ name, domain, origins })`
  - Server fn checks `planSitesLimit`: `if (siteCount >= limit && !grantedByAdmin) throw Error("Upgrade required")`
  - If in org context (`activeOrganizationId`): set `organizationId`, leave `ownerId` null
  - If personal: set `ownerId = session.user.id`

### 20.5 Sidebar nav entry

Add "My Sites" to dashboard nav section in `src/lib/navigation/navigation.ts`:
```typescript
{ label: "My Sites", href: ROUTES.DASHBOARD_SITES, icon: Globe, minPlan: "site_basic" }
```

Only shown when `user.planSitesLimit > 0 || grantedByAdmin`. Can hide for free/author-only plans.

### Checklist — Phase 20
- [ ] `src/routes/(authenticated)/dashboard/sites.tsx` — sites list page
- [ ] `src/routes/(authenticated)/dashboard/sites/$siteId.tsx` — per-site management (API keys, webhooks, settings)
- [ ] Copy button component with clipboard + timeout feedback
- [ ] Create site modal with plan limit check
- [ ] Add ROUTES.DASHBOARD_SITES + ROUTES.DASHBOARD_SITE_DETAIL to `src/constants.ts`
- [ ] Add "My Sites" nav entry to `navigation.ts` (conditionally visible)
- [ ] Hook up `$listSites` on list page
- [ ] Hook up `$copyApiKey`, `$rotateApiKey`, `$upsertWebhook` on detail page

---

## Phase 21 — Admin Site Gifting

**Goal:** Admin can create a site and assign it directly to any user, bypassing subscription requirements.

### 21.1 Admin sites page enhancements

File: `src/routes/(authenticated)/admin/blog/sites.tsx`

Add "Gift Site to User" button (admin-only). Opens a drawer/dialog with:

| Field | Type | Notes |
|-------|------|-------|
| Assign to user | Combobox (search users) | Required |
| Site name | text | Required |
| Domain | text | Optional |
| Allowed origins | text | Optional, comma-separated |
| Assign to org | Combobox | Optional — if set, links to org instead of/alongside user |
| Expires | date picker | Optional — sets `grantedUntil` |

### 21.2 `$adminGiftSite` server function

File: `src/lib/api-keys/functions.ts` (or new `src/lib/blog/admin-functions.ts`)

```typescript
export const $adminGiftSite = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({
    userId: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    allowedOrigins: z.array(z.string()).optional(),
    organizationId: z.string().optional(),
    grantedUntil: z.string().optional(), // ISO date string
  })))
  .middleware([accessMiddleware({ permissions: { admin: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      // minRole check: admin or superAdmin
      // Insert site with grantedByAdmin: true
      // Set ownerId = userId (even if organizationId is also set)
      // Set grantedUntil if provided
      // Return created site
    });
  });
```

### 21.3 Admin gifted site display

In the admin sites table, add columns:
- **Owner** — link to user profile
- **Org** — org name if set
- **Gifted** — badge if `grantedByAdmin === true`
- **Expires** — `grantedUntil` date if set

### 21.4 Expiry enforcement (server-side)

In `$listSites` (user-facing), add expiry check:
```typescript
// Exclude gifted sites past their expiry
where: and(
  /* owner/org filter */,
  or(isNull(sites.grantedUntil), gt(sites.grantedUntil, new Date())),
)
```

### Checklist — Phase 21
- [ ] Add "Gift Site to User" button + drawer to admin sites page
- [ ] `$adminGiftSite` server function (admin-only)
- [ ] User combobox (search/select user by name/email)
- [ ] Optional `grantedUntil` date picker
- [ ] Expiry enforcement in `$listSites`
- [ ] Admin table: show Owner, Org, Gifted badge, Expires columns

---

## Phase 22 — Org ↔ Sites Wiring

**Goal:** Sites created inside an org context are owned by the org; members with appropriate roles can manage them; personal sites remain personal.

### 22.1 Context detection in `$createSite`

```typescript
// In $createSite handler:
const activeOrgId = (session?.user as any)?.activeOrganizationId ?? null;
const ownerId = activeOrgId ? null : session.user.id;
const organizationId = activeOrgId ?? null;
// Insert: { ..., ownerId, organizationId }
```

### 22.2 `$listSites` — org membership lookup

To filter by org, we need the user's org memberships. Better Auth exposes these on the session or via a query:

```typescript
// Option A: session already carries activeOrganizationId — filter to that one org
// Option B: query all orgs user is member of
const memberships = await db.query.members.findMany({
  where: eq(members.userId, session.user.id),
  columns: { organizationId: true },
});
const orgIds = memberships.map(m => m.organizationId);
```

Use the active org approach (simpler — users see sites in the currently active org context, matching how posts work).

### 22.3 Org member permissions on sites

Org role → site permission mapping:

| Org Role | Can view site | Can manage keys | Can manage webhooks | Can delete site |
|----------|--------------|-----------------|---------------------|-----------------|
| owner    | ✅ | ✅ | ✅ | ✅ |
| admin    | ✅ | ✅ | ✅ | ✅ |
| member   | ✅ | ✅ | ✅ | ❌ |
| viewer   | ✅ | ❌ | ❌ | ❌ |

Enforce in server functions by fetching org membership role after confirming `site.organizationId` matches.

### 22.4 Site transfer to org (optional, Phase 22 stretch)

Allow a personal site owner to transfer their site to one of their orgs:
- UI: "Move to Organisation" dropdown in site settings
- Server fn: `$transferSiteToOrg({ siteId, organizationId })` — verifies user is org admin, sets `organizationId`, nulls `ownerId`

### 22.5 Dashboard context banner

When user switches org in the `OrganizationSwitcher`, the sites dashboard shows that org's sites. Add a context banner:

```
Viewing sites for: Acme Corp  [Switch]
```

Uses `session.user.activeOrganizationId` to fetch org name.

### Checklist — Phase 22
- [ ] `$createSite` — detect active org context, set `organizationId` or `ownerId` accordingly
- [ ] `$listSites` — filter to active org context OR personal sites
- [ ] Server functions (`$rotateApiKey`, `$upsertWebhook`, `$copyApiKey`) — check org membership role
- [ ] Org role → permission table enforcement
- [ ] Context banner on `/dashboard/sites` showing active org
- [ ] (Stretch) `$transferSiteToOrg` + UI in site settings

---

## Key Files Reference — Phase 4.0

| File | Purpose |
|------|---------|
| `src/lib/db/schema/cms.schema.ts` | `sites` + `api_keys` table definitions |
| `drizzle/0018_phase19_api_key_encrypted_site_gifting.sql` | New migration |
| `src/lib/api-keys/encryption.ts` | `encryptKey` / `decryptKey` helpers (new file) |
| `src/lib/api-keys/functions.ts` | `$rotateApiKey`, `$upsertWebhook`, `$createApiKey`, `$copyApiKey` (new) |
| `src/lib/blog/functions.ts` | `$listSites`, `$createSite` |
| `src/routes/(authenticated)/dashboard/sites.tsx` | User sites list (new) |
| `src/routes/(authenticated)/dashboard/sites/$siteId.tsx` | Per-site management (new) |
| `src/routes/(authenticated)/admin/blog/sites.tsx` | Admin sites page — add gifting |
| `src/lib/navigation/navigation.ts` | Add "My Sites" nav entry |
| `src/constants.ts` | Add ROUTES.DASHBOARD_SITES, ROUTES.DASHBOARD_SITE_DETAIL |

---

## Implementation Order

1. **Phase 19 first** — all schema + server fn fixes. Nothing breaks, users see no change.
2. **Phase 20** — user dashboard, depends on Phase 19 server fns being correct.
3. **Phase 21** — admin gifting, depends on schema from Phase 19.
4. **Phase 22** — org wiring, depends on Phase 20 routes existing.

Phases 21 and 22 can be parallelised once Phase 19 is complete.
