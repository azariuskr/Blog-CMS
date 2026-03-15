# Content Workflow

## Overview

This document describes the editorial workflow from post creation to publication.

---

## Roles in the Workflow

| Role | Can Do |
|------|--------|
| `author` | Create drafts, submit for review, edit own posts |
| `editor` | Review, approve, publish, schedule, moderate |
| `admin` | Everything — including force-publish and archive |

---

## Post Status State Machine

```
               ┌──────────────┐
  create ────> │    draft     │ <── restore
               └──────┬───────┘
                      │ submit
               ┌──────▼───────┐
               │    review    │ <── retract
               └──────┬───────┘
                      │ approve/publish
          ┌───────────┴──────────┐
          ▼                      ▼
  ┌──────────────┐     ┌──────────────────┐
  │  published   │     │    scheduled     │ ──(cron)──> published
  └──────┬───────┘     └──────────────────┘
         │ archive
  ┌──────▼───────┐
  │   archived   │
  └──────────────┘
```

**Transitions enforced by `$transitionPostStatus`** (`src/lib/blog/functions.ts`).

Audit event fired on every transition: `blog/post.status_changed` via Inngest.

---

## Creating a Post

1. Navigate to `/editor/new` (or `/admin/blog/posts/new` — redirects to editor)
2. Write content using the **Block Editor** (drag-and-drop, 19+ block types)
3. Fill the metadata panel: title, slug (auto-generated), excerpt, featured image, category, tags
4. Optional: set `isPremium = true` + preview block count for paywalled content
5. Save → auto-version snapshot created

---

## Block Types

The block editor supports:

| Category | Types |
|----------|-------|
| Text | `paragraph`, `h1-h4`, `blockquote`, `alert`, `ul`, `ol`, `task-list` |
| Media | `image`, `video`, `link` (card) |
| Layout | `separator`, `table` |
| Advanced | `code` (Shiki syntax highlighting), `math`, `diagram` (Mermaid) |

Block schema defined in `src/lib/blog/content-schema.ts`.

---

## Featured Images

Upload via MinIO storage: drag-and-drop or paste URL in the editor metadata panel.  
Component: `src/components/admin/blog/editor/FeaturedImageUploader.tsx`

---

## MDX Export

On every publish, the post blocks are serialized to MDX and stored in `posts.content`.  
Converter: `src/lib/blog/mdx-generator.ts`  
Renderer (client-side, lazy): `src/lib/blog/mdx-renderer.tsx`

---

## Post Versioning

Every save creates a snapshot in `postVersions` table.  
View/restore from the editor sidebar "Version History" panel.

---

## Scheduling

Set a `scheduledAt` date in the editor. An Inngest cron job (`* * * * *`) picks up posts where `scheduledAt <= now()` and status is `scheduled`, then publishes them.

---

## Premium / Paywall

- Toggle `isPremium` in editor metadata or the admin posts list
- Set `previewBlocks` (default 3) — how many blocks readers see before the paywall
- Non-subscribers see a gradient-faded preview + `<PaywallCard>` CTA
- Subscribe via Stripe checkout → `$createSubscriptionCheckout`

---

## Comment Moderation

- New comments land in `pending` status
- Moderated via `/admin/blog/comments` (approve / spam / delete)
- Bulk actions available

---

## Newsletter

- Subscribers captured via homepage / footer subscribe forms
- Confirmation email sent via Inngest (`blog/newsletter.subscribed` event)
- Manage subscribers at `/admin/blog/newsletter`
