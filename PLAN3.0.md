# PLAN3.0.md — UI/UX Consolidation & Polish Plan (v3)

> Continuation of `PLAN.md` (architecture) and `PLAN2.0.md` (feature phases).
> This plan focuses on **sidebar restructure, UI consolidation, profile unification, and Medium-inspired UX improvements**.
> Based on competitive research of Medium, Ghost, Substack, Hashnode, and Dev.to.

## Status Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done
- `[!]` blocked

---

## 0) Context & Motivation

The blog-cms has all core features built (editor, posts, categories, tags, comments, authors, analytics, media, newsletter, sites, API keys, RBAC, billing, ecommerce). However:

1. The sidebar navigation has **redundant sections** (Storage/Media, Users/Authors, Dashboard/Analytics).
2. The Blog section is a **single collapsible with 10 items** — too deep, not discoverable.
3. **Profile/avatar dropdowns** across 3 locations have inconsistent menu items.
4. The admin **dashboard shows placeholder content** ("Project Widgets", "Your Metric", "Installed Modules").
5. Post authors show **"Unknown"** on public blog cards.
6. The **Integrations/API Keys** page exists but had no sidebar nav entry.
7. The "Get Started" button copy is generic.

**Research reference:** See `MEDIUM-UX-RESEARCH.md` for full competitive analysis.

---

## Phase 9 — Sidebar Restructure & Navigation Consolidation

> **Goal:** Flatten the Blog collapsible, merge overlapping features, create intuitive top-level sections inspired by Ghost/Medium admin patterns.

### 9.1 New Sidebar Structure

**Current structure:**
```
General        → Dashboard
Admin          → Users, Storage
Blog           → [Blog ▸] Posts, Categories, Tags, Comments, Authors,
                           Analytics, Media, Newsletter, Sites, Integrations
Organization   → Organizations
```

**Target structure:**
```
General        → Dashboard (with embedded analytics stats)

Content        → Posts, Categories, Tags, Comments, Newsletter

People         → Users (with Authors tab/filter)

Media          → Files (merged Storage + Blog Media)

Settings       → Sites, Integrations, Organizations
```

### 9.2 Implementation Tasks

#### 9.2.1 Update Navigation Config
- [ ] **`src/lib/navigation/navigation.ts`** — Replace `NAV_STRUCTURE` array:
  - Remove the `Blog` section with its collapsible entirely
  - Remove the `Admin` section
  - Add `Content` section with routes: Posts, Categories, Tags, Comments, Newsletter
  - Add `People` section with routes: Users (keep single route, add Authors as tab)
  - Add `Media` section with routes: Storage (renamed to "Files" or "Media")
  - Add `Settings` section with routes: Sites, Integrations (API Keys), Organizations
  - Keep `General` section with Dashboard only

#### 9.2.2 Update Route Permissions Config
- [ ] **`src/lib/auth/permissions.ts`** — Update `routeConfig` entries:
  - Change `ROUTES.ADMIN.STORAGE` title from "Storage" to "Media" (or "Files")
  - Ensure `ROUTES.ADMIN.API.BASE` has `showInNav: true`, title "Integrations"
  - Ensure Organizations route has `showInNav: true` under Settings
  - Remove `parent` references that create the Blog collapsible grouping
  - Update section descriptions where needed

#### 9.2.3 Remove Blog Media Route (Merge into Storage)
- [ ] **`src/routes/(authenticated)/admin/blog/media.tsx`** — Remove or redirect to `/admin/storage`
  - Both pages already render the same `AdminStorageView` component
  - Update any links pointing to `/admin/blog/media` → `/admin/storage`
  - Remove the route from `ROUTES.ADMIN.BLOG.MEDIA` in constants or redirect

#### 9.2.4 Update Sidebar Component
- [ ] **`src/components/admin/app-layout/app-sidebar.tsx`** — Verify it renders the new sections correctly
  - The component is data-driven from `buildNavigation()` — should just work after config changes
  - Test that all sections display and collapse/expand properly

**Done criteria:**
- [ ] Sidebar shows 5 clean sections: General, Content, People, Media, Settings
- [ ] No collapsible "Blog" group — all items are top-level within sections
- [ ] Storage and Media are one page
- [ ] All routes remain accessible and functional

---

## Phase 10 — Merge Users + Authors (People Section)

> **Goal:** Combine Users and Authors management into a single "People" page with tab/filter toggle. Users table = auth system users. Authors table = `author_profiles`. Same people, different data views.

### 10.1 Analysis

- **Users page** (`src/components/admin/users/users.tsx`): Shows `user` table — name, email, role, status, ban controls, impersonation
- **Authors page** (`src/routes/(authenticated)/admin/blog/authors.tsx`): Shows `author_profiles` table — display name, username, bio, social links, application status
- **Relationship**: `author_profiles.userId` → `user.id` (1:1)
- Both are "people management" from the admin's perspective

### 10.2 Implementation Tasks

#### 10.2.1 Add Authors Tab to Users Page
- [ ] **`src/components/admin/users/users.tsx`** — Add a tab bar or segmented control at the top:
  - **"All Users"** tab → current users table (default)
  - **"Authors"** tab → shows author profiles with their content stats
  - Use existing `Tabs` component from shadcn/ui
- [ ] Create a new `AuthorsTab` component (or inline) that:
  - Queries `author_profiles` joined with `user` table
  - Shows: avatar, display name, username, post count, follower count, application status
  - Keeps existing author management actions (approve/reject applications)
  - Links to author's public profile

#### 10.2.2 Remove Standalone Authors Route
- [ ] **`src/routes/(authenticated)/admin/blog/authors.tsx`** — Remove or redirect to `/admin/users?tab=authors`
- [ ] Remove `ROUTES.ADMIN.BLOG.AUTHORS` from navigation config (no longer in sidebar)
- [ ] Update any internal links pointing to the old authors route

#### 10.2.3 Update People Section Title
- [ ] **`src/lib/auth/permissions.ts`** — Update Users route config title to "People" or keep "Users"
  - Keep icon as Users icon (appropriate for both)

**Done criteria:**
- [ ] Single `/admin/users` page with "All Users" and "Authors" tabs
- [ ] Author management (approve/reject, view profiles) accessible from Authors tab
- [ ] No standalone `/admin/blog/authors` route in sidebar
- [ ] All author-related actions still work

---

## Phase 11 — Dashboard Consolidation (Merge Analytics)

> **Goal:** Replace the placeholder admin dashboard content with real blog stats. Embed analytics directly into the dashboard so there's one place for overview metrics.

### 11.1 Current State

- **Admin Dashboard** (`src/routes/(authenticated)/admin/index.tsx`): Shows placeholder "Installed Modules" cards, "Project Widgets — Replace this section", "Your Metric — Add project-specific stats here"
- **Blog Analytics** (`src/routes/(authenticated)/admin/blog/analytics.tsx`): Shows real stats — Total Views, Published Posts, Premium Posts, Subscribers, Reactions, Comments, Views chart, Top Posts

### 11.2 Implementation Tasks

#### 11.2.1 Replace Dashboard Placeholder Content
- [ ] **`src/routes/(authenticated)/admin/index.tsx`** (or its component) — Replace placeholder sections with:
  - **KPI Cards Row**: Total Views, Published Posts, Subscribers, Comments (from blog stats query)
  - **Views Over Time Chart**: Reuse/import from analytics page
  - **Top Performing Posts**: Table showing top 5 posts by views with click-through
  - **Recent Activity**: Recent comments, new subscribers, new author applications
  - **Quick Actions**: New Post, Manage Posts, View Blog (keep existing if useful)
  - Remove: "Installed Modules" cards, "Project Widgets" placeholder, "Your Metric" placeholder

#### 11.2.2 Keep Analytics as Dedicated Deep-Dive Page
- [ ] **`src/routes/(authenticated)/admin/blog/analytics.tsx`** — Keep this page but:
  - Remove it from sidebar navigation (dashboard covers the overview)
  - It remains accessible via direct URL for detailed analytics
  - Add a "View Detailed Analytics" link from the dashboard

#### 11.2.3 Update Navigation
- [ ] Remove `ROUTES.ADMIN.BLOG.ANALYTICS` from sidebar nav config
- [ ] Dashboard in "General" section serves as the analytics overview

**Done criteria:**
- [ ] Dashboard shows real blog metrics instead of placeholders
- [ ] No "Installed Modules" or "Project Widgets" sections
- [ ] Analytics page still accessible for deep-dive but not in sidebar
- [ ] Dashboard loads without errors and displays current data

---

## Phase 12 — Unify Profile/Avatar Dropdowns

> **Goal:** Make all 3 profile touchpoints show consistent menu items so the user experience is predictable.
> **Inspiration:** `references/medium-clone/client/src/components/UserMenu.tsx` (dropdown items), `Navbar.tsx` (avatar placement)

### 12.1 Current State (3 Locations)

| # | Location | Component | Current Menu Items |
|---|----------|-----------|-------------------|
| 1 | Sidebar footer | `AppSidebarUser` in `app-sidebar.tsx` | Chevron → unknown items |
| 2 | Header top-right | `app-header.tsx` | Org switcher dropdown + separate avatar (clicks to?) |
| 3 | Public blog navbar | Blog layout header | Profile, My Posts, Settings, Sign Out |

### 12.2 Target Unified Menu

All 3 dropdowns should show these items (role-filtered):

```
─────────────────────
 [Avatar] User Name
 user@email.com
─────────────────────
 👤 Profile            → /blog/@username (public author profile)
 📝 My Posts           → /dashboard (contributor dashboard)
 ⚙️ Settings           → /account (account settings)
 🎨 Appearance         → theme toggle inline or /account?tab=appearance
─────────────────────
 🔧 Admin Dashboard    → /admin (only for admin+ roles)
─────────────────────
 🚪 Sign Out
─────────────────────
```

### 12.3 Implementation Tasks

#### 12.3.1 Create Shared Profile Menu Component
- [ ] Create `src/components/shared/profile-menu.tsx`:
  - Accepts: `user`, `variant` (sidebar | header | navbar), `onSignOut`
  - Renders: DropdownMenu with consistent items
  - Role-checks: Only show "Admin Dashboard" for admin+ users
  - Handles: Sign out action, navigation

#### 12.3.2 Integrate into Sidebar Footer
- [ ] **`src/components/admin/app-layout/app-sidebar.tsx`** — Replace `AppSidebarUser` dropdown with shared `ProfileMenu` component

#### 12.3.3 Integrate into Header
- [ ] **`src/components/admin/app-layout/app-header.tsx`** — Replace avatar click behavior with shared `ProfileMenu`
  - Keep org switcher separate (it's a different concern)
  - Avatar click → profile dropdown

#### 12.3.4 Integrate into Public Blog Navbar
- [ ] **Blog layout header component** — Replace existing dropdown with shared `ProfileMenu`
  - Already has: Profile, My Posts, Settings, Sign Out
  - Add: Admin Dashboard link (for admin users)

**Done criteria:**
- [ ] All 3 profile dropdowns show the same menu items
- [ ] Menu items are role-filtered (admin link only for admins)
- [ ] Sign out works from all 3 locations
- [ ] Navigation works correctly from all 3 locations

---

## Phase 13 — Bug Fixes & Quick Wins

> **Goal:** Fix known UI issues and small improvements.

### 13.1 Fix "Unknown" Author on Public Blog Cards
- [ ] **`src/lib/blog/queries.ts`** or the query that fetches featured/listed posts:
  - Investigate why `author` field shows "Unknown" on post cards
  - Likely a missing JOIN between `posts` → `author_profiles` in the public posts query
  - Or the `authorProfile` relation isn't being loaded in the query
  - Fix: Ensure post queries include author profile data (displayName, username, avatarUrl)

### 13.2 Fix "Get Started" Button Copy
- [ ] **Blog public navbar component** — Change "Get Started" to "Start Writing"
  - More descriptive, tells the user what they'll do
  - Matches Medium's "Write" CTA approach

### 13.3 Fix Post Card Author Display
- [ ] **Post card component** on public blog — Ensure it renders `author.displayName` instead of falling back to "Unknown"
  - Check the component that renders post cards on the homepage / feed
  - Verify it's reading from the correct field in the post data

### 13.4 Verify Integrations Nav Entry
- [ ] Confirm `ROUTES.ADMIN.API.BASE` has `showInNav: true` in permissions config
- [ ] Confirm it appears in the sidebar after Phase 9 restructure under Settings section

**Done criteria:**
- [ ] Post cards show real author names on the public blog
- [ ] "Start Writing" button on public navbar
- [ ] Integrations visible in sidebar

---

## Phase 14 — Dashboard Content (Real Blog Stats)

> **Goal:** Build a proper admin dashboard that gives admins an at-a-glance overview of their blog.
> **Inspiration:** `references/next-saas-blog/app/dashboard/page.tsx` (layout), `DashTable.tsx` (post list with actions)

### 14.1 Dashboard Design (Inspired by Medium Stats + Ghost Analytics)

```
┌─────────────────────────────────────────────────────┐
│  Dashboard                                           │
│  Welcome back, {name}. Here's your blog overview.    │
├──────────┬──────────┬──────────┬────────────────────┤
│ Total    │ Published│ Active   │ Newsletter         │
│ Views    │ Posts    │ Authors  │ Subscribers        │
│ 46.0k   │ 10      │ 4        │ 0                  │
├──────────┴──────────┴──────────┴────────────────────┤
│                                                      │
│  Views Over Time (Last 30 Days)                      │
│  [═══════════════════ chart ═════════════════════]   │
│                                                      │
├─────────────────────────┬────────────────────────────┤
│ Top Posts               │ Recent Activity            │
│ ────────────────────    │ ──────────────────────     │
│ 1. From Junior to...   │ • New comment on "Git..."  │
│    8,922 views          │ • kiko1 published "Node..."│
│ 2. Understanding...    │ • New subscriber: j@x.com  │
│    6,136 views          │ • Author app: jane_doe     │
│ 3. Building a Zero...  │                            │
│    4,871 views          │                            │
├─────────────────────────┴────────────────────────────┤
│ Quick Actions                                        │
│ [+ New Post]  [Manage Posts]  [View Blog]            │
└─────────────────────────────────────────────────────┘
```

### 14.2 Implementation Tasks

#### 14.2.1 Create Dashboard Stats Query
- [ ] **`src/lib/blog/queries.ts`** — Add or reuse `useBlogStats()` query:
  - Total views (aggregate from posts)
  - Published post count
  - Active author count (from author_profiles where approved)
  - Newsletter subscriber count
  - Recent comments (last 5)
  - Top posts by view count (top 5)
  - New author applications pending

#### 14.2.2 Build Dashboard Component
- [ ] **`src/routes/(authenticated)/admin/index.tsx`** — Replace placeholder with:
  - KPI cards row using blog stats data
  - Views chart (reuse from analytics or use recharts directly)
  - Top posts table (clickable → post edit page)
  - Recent activity feed (comments, subscribers, author apps)
  - Quick action buttons (New Post, Manage Posts, View Blog)

#### 14.2.3 Wire Data
- [ ] Connect dashboard to `useBlogStats()` query
- [ ] Add loading skeletons for each section
- [ ] Handle empty states gracefully (new blog with no posts yet)

**Done criteria:**
- [ ] Dashboard shows real, live blog metrics
- [ ] All KPI cards display correct numbers
- [ ] Views chart renders with actual data
- [ ] Top posts and recent activity are populated
- [ ] No placeholder content remains

---

## Phase 15 — Medium-Inspired UX Enhancements (Future)

> **Goal:** Bridge the gap between our current feature set and best-in-class publishing platforms. These are **nice-to-haves** for after the consolidation work is complete.
> **Inspiration:** `references/medium-clone/client/src/components/ClapButton.tsx` (reactions), `SavedSection.tsx` (reading lists), `PostCard.tsx` (card design)

### 15.1 Writer Experience Improvements
- [ ] **Inline formatting toolbar** — Show bold/italic/link/heading toolbar when text is selected in the block editor (Medium pattern)
- [ ] **Scheduled publishing** — Add publish date/time picker to post editor; auto-publish via Inngest cron
- [ ] **Draft sharing** — Generate shareable preview links for unpublished drafts
- [ ] **Canonical URL field** — Add to post editor for SEO-safe cross-posting
- [ ] **Revision history** — Show previous versions of a post with diff view

### 15.2 Reader Experience Improvements
- [ ] **Variable-intensity reactions** — Allow multiple clicks on like button (1-5 or 1-10 scale, like Medium's claps)
- [ ] **Text highlighting** — Let readers highlight text passages in posts (stored per-user)
- [ ] **Reading lists** — Let readers organize bookmarks into named lists
- [ ] **"For You" + "Following" feed** — Two feed modes on blog homepage
- [ ] **Friend links** — Shareable links that bypass premium/paywall for individual posts
- [ ] **Metered paywall** — N free articles per month for non-subscribers (configurable)

### 15.3 Admin/Publication Improvements
- [ ] **Editor inbox** — Centralized view for reviewing submitted posts (Medium pattern)
- [ ] **Publication-level analytics** — Aggregate stats across all posts in a site
- [ ] **Boost/featured curation** — Admin-curated "Staff Picks" or "Featured" post promotion
- [ ] **Email analytics** — Open rates, click rates for newsletter sends
- [ ] **Member management dashboard** — See subscribers, their activity, churn (Ghost pattern)

### 15.4 Monetization Features (Long-term)
- [ ] **Membership tiers** — Free / Pro / Premium membership levels (Ghost model)
- [ ] **Writer earnings** — Revenue sharing or direct subscriptions for authors
- [ ] **Referred memberships** — Writers earn when readers become members through their content
- [ ] **Per-post paywall toggle** — Author chooses per-story whether content is free or premium

---

## Execution Order

| Priority | Phase | Effort | Description |
|----------|-------|--------|-------------|
| 1 | **Phase 9** | Medium | Sidebar restructure — config changes + route cleanup |
| 2 | **Phase 13** | Small | Bug fixes — author names, button copy, integrations nav |
| 3 | **Phase 10** | Medium | Merge Users + Authors into People with tabs |
| 4 | **Phase 12** | Medium | Unify profile dropdowns across 3 locations |
| 5 | **Phase 11** | Medium | Dashboard analytics merge (remove placeholders) |
| 6 | **Phase 14** | Large | Build real dashboard content with stats and charts |
| 7 | **Phase 15** | XL | Medium-inspired enhancements (future sprints) |

---

## Phase 16 — Premium Content & Subscription Wiring

> **Goal:** Ensure the existing Stripe billing infrastructure is fully connected to blog content access.
> Our app already has: Stripe plugin, 3 plans, credits system, PaywallCard, PremiumSwitch, billing admin UI.
> **Inspiration:** `references/next-saas-blog/app/(home)/blog/[id]/components/Content.tsx` (paywall rendering), `app/dashboard/blog/components/SwitchForm.tsx` (premium toggle), `lib/actions/stripe.ts` (checkout flow), `app/api/stripe/webhook/route.ts` (webhook handler)

### 16.1 Current State Audit

**What exists:**
- `src/lib/billing/stripe-plugin.ts` — Full Stripe integration via Better Auth
- `src/lib/billing/plans.ts` — Free/Pro($19)/Enterprise($99) plans with limits
- `src/lib/billing/credits.ts` — One-time credit purchases
- `src/components/blog/PaywallCard.tsx` — Premium content gate UI
- `src/components/admin/blog/PremiumSwitch.tsx` — Toggle premium per post
- `posts.isPremium` column in DB schema
- Admin billing pages (subscriptions, customers, credits)
- User billing page (plans, payment methods, credit balance)

### 16.2 Implementation Tasks

#### 16.2.1 Verify Subscription Check in Post Rendering
- [ ] **`src/routes/(blog)/$slug.tsx`** (public post page) — Verify it checks:
  - If `post.isPremium === true`
  - If current user has an active Pro/Enterprise subscription
  - If not subscribed → show `PaywallCard` after excerpt/preview
  - If subscribed → show full content
- [ ] Create helper: `canAccessPremiumContent(userId): boolean` that checks subscription status
  - Query Better Auth Stripe subscription data
  - Cache result per session

#### 16.2.2 Premium Indicator on Post Cards
- [ ] Public blog post cards should show a premium badge/icon (star/lock) for premium posts
- [ ] Non-subscribers see "Premium" badge; subscribers see it as accessible

#### 16.2.3 Metered Paywall (Medium-style, Optional)
- [ ] Consider: N free premium articles per month for non-subscribers
- [ ] Track reads via cookie or DB counter
- [ ] After limit → hard paywall
- [ ] Config: `METERED_FREE_ARTICLES=3` env var

#### 16.2.4 Friend Links (Share Premium Content)
- [ ] Generate shareable token URLs that bypass paywall for specific posts
- [ ] Tokens expire after N days or N uses
- [ ] Author can generate friend links from post editor

**Done criteria:**
- [ ] Premium posts show PaywallCard for non-subscribers
- [ ] Subscribed users see full premium content
- [ ] Premium badge visible on post cards in feeds

---

## Phase 17 — Social & Discovery Features (from medium-clone reference)

> **Goal:** Add Medium-style social features that drive engagement and content discovery.
> **Inspiration:** `references/medium-clone/` — `client/src/pages/Home.tsx` + `Feed.tsx` (feed tabs), `server/src/app.ts` + `Notification.tsx` (real-time notifications), `PostMenu.tsx` (mute), `WhoToFollow.tsx` (suggestions), `MoreFrom.tsx` (related posts), `SavedSection.tsx` + `BookmarkButton.tsx` (reading lists), `Search.tsx` (search). Also `references/next-saas-blog/app/(home)/blog/[id]/page.tsx` (OG metadata).

### 17.1 Feed Personalization

#### 17.1.1 "For You" + "Following" Feed Tabs
- [ ] **Blog homepage** — Add tab switcher at top:
  - **"For You"** (default): Posts ranked by recency + popularity + topic relevance
  - **"Following"**: Posts only from authors the user follows
- [ ] **Query implementation**:
  - "For You": Filter by user's followed topics/categories, exclude muted authors
  - "Following": `SELECT posts WHERE authorId IN (user's following list)`

#### 17.1.2 User Interests/Topics Preferences
- [ ] **Schema**: Add `user_interests` table: `userId, categoryId` (many-to-many)
- [ ] **Onboarding**: After signup, prompt user to pick 3-5 topics of interest
- [ ] **Settings**: Topic preferences in account settings
- [ ] **Feed**: Use interests to weight "For You" feed

### 17.2 Engagement Features

#### 17.2.1 "More From This Author" Section
- [ ] **Post detail page** — Below the post content, show 3 related posts by the same author
- [ ] Simple query: `SELECT posts WHERE authorId = post.authorId AND id != post.id LIMIT 3`
- [ ] Card layout with title, excerpt, read time

#### 17.2.2 "Who to Follow" Sidebar
- [ ] **Blog sidebar/homepage** — Suggest authors the user doesn't follow
- [ ] Algorithm: Authors with posts in user's interested topics, sorted by follower count
- [ ] Show: Avatar, name, bio excerpt, "Follow" button

#### 17.2.3 Mute/Ignore System
- [ ] **Schema**: Add `user_mutes` table: `userId, mutedUserId` or `mutedPostId`
- [ ] **Post menu**: "Mute this author" option (three-dot menu on post cards)
- [ ] **Feed filter**: Exclude muted authors from all feeds
- [ ] **Settings**: View and manage muted authors list

### 17.3 Real-Time Notifications

#### 17.3.1 Notification System
- [ ] **Schema**: Add `notifications` table:
  - `id, userId, type, actorId, postId, commentId, message, read, createdAt`
  - Types: `comment_reply`, `new_follower`, `post_reaction`, `post_published`, `author_approved`
- [ ] **Server functions**: Create notifications on:
  - Someone comments on your post
  - Someone follows you
  - Someone reacts to your post
  - Your author application is approved/rejected
- [ ] **API**: `$getNotifications()`, `$markNotificationRead()`, `$markAllNotificationsRead()`

#### 17.3.2 Notification Bell UI
- [ ] **Header/navbar** — Notification bell icon with unread count badge
- [ ] **Dropdown/page** — List of notifications with actor avatar, action, timestamp
- [ ] **Mark as read**: Click to mark individual, "Mark all as read" button

#### 17.3.3 Real-Time Delivery (Optional Enhancement)
- [ ] Server-Sent Events (SSE) for live notification push
- [ ] Or poll every 30s as simpler approach
- [ ] Inngest for background notification creation

### 17.4 Reading Lists (Named Bookmark Collections)

#### 17.4.1 Named Lists
- [ ] **Schema**: Add `reading_lists` table: `id, userId, name, description, isPublic, createdAt`
- [ ] **Schema**: Modify bookmarks to reference a reading list: `listId` FK
- [ ] **UI**: "Save to list" dropdown when bookmarking a post
- [ ] **Profile page**: "Lists" tab showing user's reading lists
- [ ] **Default list**: "Reading List" created automatically for each user

### 17.5 SEO & Social Sharing

#### 17.5.1 OpenGraph Metadata
- [ ] **Post detail page** — Dynamic OG meta tags:
  - `og:title`, `og:description`, `og:image` (featured image)
  - `og:type=article`, `article:author`, `article:published_time`
  - Twitter Card meta tags
- [ ] **Author profile page** — OG meta for profiles
- [ ] **Root layout** — Default site-level OG tags

**Done criteria:**
- [ ] Feed has "For You" and "Following" tabs
- [ ] "More from this author" shows on post pages
- [ ] Notification bell with unread count in navbar
- [ ] Users can save posts to named reading lists

---

## Phase 18 — Writer Experience Enhancements

> **Goal:** Make the writing experience match or exceed Medium/Ghost quality.
> **Inspiration:** `references/next-saas-blog/app/dashboard/blog/components/BlogForm.tsx` (post editor form with premium toggle, metadata), `references/medium-clone/client/src/components/PostCard.tsx` (read time display, card layout)

### 18.1 Publishing Workflow

#### 18.1.1 Scheduled Publishing
- [ ] **Post editor** — Add "Schedule" option alongside "Publish"
  - Date/time picker for future publish date
  - Post saved with `status=scheduled`, `scheduledAt` timestamp
- [ ] **Inngest cron** — Job that runs every minute:
  - Query posts where `status=scheduled AND scheduledAt <= NOW()`
  - Update status to `published`, set `publishedAt`
  - Fire webhook events

#### 18.1.2 Draft Sharing / Preview Links
- [ ] Generate unique preview token for unpublished drafts
- [ ] Route: `/preview/:token` — renders post without requiring auth
- [ ] Token expires after 7 days or on publish
- [ ] Share button in editor: "Copy Preview Link"

#### 18.1.3 Canonical URL Field
- [ ] **Post editor metadata** — Add "Canonical URL" input
- [ ] **Schema**: Add `canonicalUrl` column to posts table
- [ ] **Rendering**: Output `<link rel="canonical" href="..." />` on post page
- [ ] Useful for cross-posting from personal blog to BlogCMS

### 18.2 Editor Improvements

#### 18.2.1 Post Revision History
- [ ] **Schema**: Add `post_revisions` table: `id, postId, blocks, metadata, createdAt, createdBy`
- [ ] Save a revision on every publish (not every auto-save)
- [ ] **UI**: "Revision History" panel in editor showing past versions
- [ ] "Restore" action to revert to a previous version

#### 18.2.2 Reading Time Calculation
- [ ] Calculate estimated reading time from block content (already have `readTimeMinutes`?)
- [ ] Show in post editor sidebar and on published post
- [ ] Formula: word count / 200 WPM, rounded up

**Done criteria:**
- [ ] Authors can schedule posts for future publication
- [ ] Draft preview links work for unpublished content
- [ ] Canonical URL renders in post head

---

## Updated Execution Order

| Priority | Phase | Effort | Description |
|----------|-------|--------|-------------|
| 1 | **Phase 9** | Medium | Sidebar restructure — config changes + route cleanup |
| 2 | **Phase 13** | Small | Bug fixes — author names, button copy, integrations nav |
| 3 | **Phase 10** | Medium | Merge Users + Authors into People with tabs |
| 4 | **Phase 12** | Medium | Unify profile dropdowns across 3 locations |
| 5 | **Phase 11** | Medium | Dashboard analytics merge (remove placeholders) |
| 6 | **Phase 14** | Large | Build real dashboard content with stats and charts |
| 7 | **Phase 16** | Medium | Premium content ↔ subscription wiring verification |
| 8 | **Phase 17** | XL | Social & discovery features (feeds, notifications, lists) |
| 9 | **Phase 18** | Large | Writer experience (scheduled posts, drafts, revisions) |
| 10 | **Phase 15** | XL | Advanced Medium-inspired enhancements |

---

## Reference Projects Analysis Summary

### `references/medium-clone/`
- **Stack**: React + Express + MongoDB + Socket.io
- **Best for**: Social features (notifications, feeds, reading lists, mute/ignore, claps, following)
- **No payments** — purely community features
- **Key takeaways**: Feed personalization, real-time notifications, reading list collections

### `references/next-saas-blog/`
- **Stack**: Next.js 14 + Supabase + Stripe
- **Best for**: SaaS billing pattern (per-post premium, subscription gating, webhooks)
- **Our app already exceeds this** — we have 3 plans, credits, Polar, Better Auth integration
- **Key takeaways**: Per-post premium toggle, paywall rendering, subscription status checks

### What Our App Already Has (That References Don't)
- Multi-provider billing (Stripe + Polar)
- Credits system for one-time purchases
- Better Auth with full RBAC
- Block editor (vs markdown)
- Multi-tenancy (organizations + sites)
- Headless CMS API with rate limiting
- Newsletter with confirmation flow
- Admin billing dashboard
- Git-backed publishing option
- Comprehensive RBAC with route-level permissions

---

## Inspiration Reference Map

> **For agents:** This section maps every reference project feature to exact file paths so you can find inspiration code quickly without exploring the reference directories.

### `references/medium-clone/` — Feature-to-File Map

| Feature | Files | What to Look At |
|---------|-------|-----------------|
| **Notifications (real-time)** | `server/src/app.ts` (Socket.io setup), `client/src/components/Notification.tsx`, `client/src/components/NotificationList.tsx` | Socket.io event emitters, notification bell UI, unread count badge, mark-as-read |
| **Feed (For You + Following)** | `client/src/pages/Home.tsx`, `client/src/components/Feed.tsx` | Tab switcher between personalized and following feeds, infinite scroll, feed ranking |
| **Reading Lists** | `client/src/components/SavedSection.tsx`, `client/src/components/BookmarkButton.tsx` | Named collections, save-to-list dropdown, reading list page layout |
| **Mute/Ignore** | `client/src/components/PostMenu.tsx` | Three-dot menu with "Mute this author", mute state management |
| **Who to Follow** | `client/src/components/WhoToFollow.tsx` | Suggested authors sidebar, follow/unfollow buttons, recommendation algorithm |
| **More From Author** | `client/src/components/MoreFrom.tsx` | Related posts by same author section below post content |
| **Topics/Categories** | `client/src/components/Topics.tsx`, `client/src/pages/Topic.tsx` | Topic chips, topic-filtered feeds, topic follow |
| **Claps/Reactions** | `client/src/components/ClapButton.tsx` | Multi-click reaction (1-50 claps), animation, optimistic updates |
| **Post Cards** | `client/src/components/PostCard.tsx`, `client/src/components/PostPreview.tsx` | Card layout with author avatar, read time, reaction count, bookmark icon |
| **Search** | `client/src/pages/Search.tsx`, `client/src/components/SearchBar.tsx` | Full-text search, results by posts/people/topics |
| **Profile Page** | `client/src/pages/Profile.tsx`, `client/src/components/ProfileHeader.tsx` | Author profile with bio, follower count, posts tab, about tab |
| **Comments** | `client/src/components/Comments.tsx`, `client/src/components/CommentForm.tsx` | Threaded comments, reply UI, comment reactions |
| **Navbar** | `client/src/components/Navbar.tsx` | Notification bell, search, write button, avatar dropdown |
| **Avatar Menu** | `client/src/components/UserMenu.tsx` | Profile dropdown with: Profile, Stories, Stats, Settings, Sign Out |

### `references/next-saas-blog/` — Feature-to-File Map

| Feature | Files | What to Look At |
|---------|-------|-----------------|
| **Stripe Checkout** | `lib/actions/stripe.ts` | `checkout()` server action, price ID lookup, success/cancel URLs |
| **Stripe Webhook** | `app/api/stripe/webhook/route.ts` | Event handling for `checkout.session.completed`, `customer.subscription.*`, signature verification |
| **Paywall Rendering** | `app/(home)/blog/[id]/components/Content.tsx` | Conditional rendering: subscribed → full content, free → truncated + PaywallCard |
| **Premium Toggle** | `app/dashboard/blog/components/SwitchForm.tsx` | Toggle switch in post editor to mark post as premium/free |
| **Billing Portal** | `components/stripe/ManageBill.tsx` | Redirect to Stripe customer portal for subscription management |
| **Blog Form/Editor** | `app/dashboard/blog/components/BlogForm.tsx` | Post creation form with title, content, image, premium toggle, category |
| **Dashboard Layout** | `app/dashboard/components/DashTable.tsx`, `app/dashboard/page.tsx` | Admin dashboard with post list, status badges, edit/delete actions |
| **SEO Metadata** | `app/(home)/blog/[id]/page.tsx` (generateMetadata) | Dynamic OG tags, Twitter cards, article structured data |
| **Auth Middleware** | `middleware.ts` | Route protection, subscription status checks, redirect logic |

### Per-Phase Inspiration Quick Reference

| Phase | Reference | Key Files |
|-------|-----------|-----------|
| **Phase 12** (Profile Menus) | medium-clone | `client/src/components/UserMenu.tsx`, `client/src/components/Navbar.tsx` |
| **Phase 14** (Dashboard) | next-saas-blog | `app/dashboard/page.tsx`, `app/dashboard/components/DashTable.tsx` |
| **Phase 15** (Reactions) | medium-clone | `client/src/components/ClapButton.tsx` |
| **Phase 15** (Reading Lists) | medium-clone | `client/src/components/SavedSection.tsx` |
| **Phase 16** (Paywall) | next-saas-blog | `app/(home)/blog/[id]/components/Content.tsx`, `app/dashboard/blog/components/SwitchForm.tsx` |
| **Phase 16** (Stripe) | next-saas-blog | `lib/actions/stripe.ts`, `app/api/stripe/webhook/route.ts` |
| **Phase 17** (Feed) | medium-clone | `client/src/pages/Home.tsx`, `client/src/components/Feed.tsx` |
| **Phase 17** (Notifications) | medium-clone | `server/src/app.ts`, `client/src/components/Notification.tsx` |
| **Phase 17** (Mute) | medium-clone | `client/src/components/PostMenu.tsx` |
| **Phase 17** (Who to Follow) | medium-clone | `client/src/components/WhoToFollow.tsx` |
| **Phase 17** (More From Author) | medium-clone | `client/src/components/MoreFrom.tsx` |
| **Phase 17** (Reading Lists) | medium-clone | `client/src/components/SavedSection.tsx`, `client/src/components/BookmarkButton.tsx` |
| **Phase 17** (SEO/OG) | next-saas-blog | `app/(home)/blog/[id]/page.tsx` |
| **Phase 18** (Editor) | next-saas-blog | `app/dashboard/blog/components/BlogForm.tsx` |
| **Phase 18** (Post Cards) | medium-clone | `client/src/components/PostCard.tsx` |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/navigation/navigation.ts` | `NAV_STRUCTURE` array — sidebar sections & items |
| `src/lib/auth/permissions.ts` | `routeConfig` — route metadata, roles, nav visibility |
| `src/constants.ts` | `ROUTES` + `QUERY_KEYS` constants |
| `src/components/admin/app-layout/app-sidebar.tsx` | Sidebar rendering component |
| `src/components/admin/app-layout/app-header.tsx` | Header with org switcher + avatar |
| `src/components/admin/users/users.tsx` | Users management page |
| `src/routes/(authenticated)/admin/blog/authors.tsx` | Authors management page |
| `src/routes/(authenticated)/admin/blog/analytics.tsx` | Blog analytics page |
| `src/routes/(authenticated)/admin/blog/media.tsx` | Blog media page (same as Storage) |
| `src/routes/(authenticated)/admin/index.tsx` | Admin dashboard (placeholder) |
| `src/routes/(authenticated)/admin/storage.tsx` | Storage page |
| `src/lib/blog/queries.ts` | Blog data queries (stats, posts, etc.) |
| `src/lib/blog/functions.ts` | Blog server functions |
| `MEDIUM-UX-RESEARCH.md` | Competitive analysis reference |

---

## Architecture Notes

### Data Model Relationships (relevant to merges)
```
user (auth.schema.ts)
  └── author_profiles (cms.schema.ts) — 1:1 via userId
        └── posts — 1:many via authorId

Storage layer (abstract IStorage)
  └── File categories: avatar | attachment | document | media
  └── Used by both AdminStorageView (Storage page) and BlogMediaView (Media page)
  └── Same component: AdminStorageView renders both

Blog stats (aggregated from):
  └── posts: count, view counts
  └── comments: count
  └── reactions: count
  └── newsletter_subscribers: count
  └── author_profiles: count where approved
```

### Permission Model (for nav visibility)
```
superAdmin  → sees everything
admin       → sees: Content, People, Media, Settings, Dashboard
editor      → sees: Content (limited), Dashboard
author      → sees: Dashboard (contributor view), own posts
reader      → sees: public blog only, no admin sidebar
```
