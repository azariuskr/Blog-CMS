# Medium.com UI/UX Research & Competitor Analysis

**Research Date:** March 2026
**Purpose:** Inform blog CMS design decisions by understanding how Medium and competitors structure their experience for readers, writers, and admins.

---

## Table of Contents

1. [Medium: Reader Experience](#1-medium-reader-experience)
2. [Medium: Writer/Author Experience](#2-medium-writerauthor-experience)
3. [Medium: Admin/Publication Owner Experience](#3-medium-adminpublication-owner-experience)
4. [Medium: Monetization Model](#4-medium-monetization-model)
5. [Medium: Navigation & Sidebar Structure](#5-medium-navigation--sidebar-structure)
6. [Competitor Analysis](#6-competitor-analysis)
7. [Key UI/UX Patterns for CMS Design](#7-key-uiux-patterns-for-cms-design)

---

## 1. Medium: Reader Experience

### Homepage Feed

- **"For You" feed**: Personalized story recommendations based on reading history, followed topics, and followed authors
- **"Following" feed**: Stories from authors and publications you follow
- **Right sidebar widgets**: Staff Picks (curated by Medium staff), Recommended Topics, Who to Follow
- **Topic browsing**: Browse latest stories by followed topics via topic navigation

### Reading Lists & Bookmarks

- **Save/Bookmark**: Tap the bookmark icon on any story to save it to your reading list
- **Lists**: Users can create and manage custom reading lists to organize saved content
- **Friend Links**: Paying members can share paywalled content with non-members via special URLs

### Engagement Features

- **Claps**: Up to 50 claps per article per reader — a variable "like" that signals intensity of appreciation
- **Highlights**: Select any text passage to highlight it; highlights are visible to other readers and the author
- **Responses (Comments)**: Threaded comment system called "responses" — each response is itself a mini-article
- **Follow**: Follow authors, publications, and topics from story pages or profile pages
- **Share**: Share via social media, email, or copy link

### Metered Paywall (Non-Member Experience)

- **3 free articles per month** for non-members
- After limit: paywall prompt to subscribe ($5/month or $50/year)
- **Member-only indicators**: Star icon (★) next to paywalled stories in feeds
- Writers choose per-story whether to put content behind the paywall
- Friend links bypass the paywall for individual stories

### Content Discovery

- Algorithm weighs: reading time, claps, highlights, responses, and topic relevance
- Stories are surfaced via homepage feed, topic pages, email digests, push notifications, and search
- "Presentations" metric tracks how many times Medium suggested a story to readers across all surfaces

---

## 2. Medium: Writer/Author Experience

### Story Editor

**Formatting Toolbar** (appears on text selection):
- Bold, Italic, Links (Ctrl/Cmd+K)
- Large T (H1/Title) and small T (H2/Subtitle) headers
- Block quote (click once) / Pull quote (click twice)
- Drop caps (select first letter of paragraph)
- Bulleted lists (`* ` + space) and Numbered lists (`1. ` + space)

**Plus (+) Menu** (appears on empty lines):
- Image upload (from desktop or Unsplash integration)
- Embed (paste URL for YouTube, Twitter/X, GitHub Gists, CodePen, and 100s more via Embed.ly)
- Horizontal divider / section break
- Code blocks and inline code

**Image Options**:
- Three width modes: standard, out-set (wider than text), full-width (edge to edge)
- Captions and alt text support
- Drag-and-drop upload

**Advanced Editor Features**:
- `@username` mentions for linking to other writers
- `:emoji:` inline emoji support
- Draft sharing with feedback links
- Revision history
- Canonical link setting (for cross-posted content)
- Custom URL slugs
- Unlisted publishing option (accessible only via direct link)
- Keyboard shortcuts throughout

### Stats Dashboard

**Three Main Tabs:**

1. **Stories Tab**
   - Lifetime list of all published stories with per-story metrics
   - Metrics: Presentations, Views, Reads, Earnings (for paywalled stories)
   - **Presentations**: How many times Medium suggested the story (feeds, search, emails, notifications)
   - **Views**: Reader accessed the story for at least 5 seconds
   - **Reads**: Reader stayed for at least 30 seconds
   - Monthly aggregate view with daily views/reads graph
   - Hourly updates for first month after publishing; daily updates after that

2. **Audience Tab**
   - Follower count and growth over time
   - Audience demographics and engagement patterns

3. **Partner Program Earnings Tab**
   - **Overview**: Total earnings for selected period
   - **Earnings Summary**: Breakdown of how earnings were calculated
   - **Earnings by Story**: Per-story earnings breakdown
   - **Sidebar**: Enrollment status, payout settings, rollover balance, quick links
   - Earnings based on: member reading time, engagement (claps, highlights, responses), follower bonus, external traffic bonus (5% bonus for reads from outside Medium as of Oct 2025)

### Publishing Options

- Publish immediately or schedule for later
- Add to a publication (submit for editor review)
- Set as member-only (paywalled) or free
- Add tags (up to 5) for topic categorization
- Set featured image (Shift+F)
- Choose canonical URL for SEO

### Audience Management

- View follower list and growth trends
- Email notifications to followers on new stories
- No direct messaging — engagement happens through responses and claps

---

## 3. Medium: Admin/Publication Owner Experience

### Publication Roles

| Role | Capabilities |
|------|-------------|
| **Owner** | Full control: settings, custom domain, add/remove editors and writers, all editor capabilities |
| **Editor** | Review, edit, and publish own stories and submitted stories; manage newsletter; view publication stats |
| **Writer** | Submit stories and drafts to the publication for editor review |

### Publication Settings

- **Info Page**: Publication name, description, logo, avatar
- **About Page**: Customizable "About" page with editor's note
- **Homepage Layout**: Customizable layout and section organization
- **Archive Tab**: Filterable archive for readers to browse past content
- **Navigation Bar**: Custom nav items for publication subpages
- **Custom Domain**: Only the owner can configure (CNAME DNS setup to Medium)
- **Submission Settings**: Open submissions (any follower can submit) or invite-only

### Editor Inbox (2025 Update)

- Centralized inbox for reviewing story submissions from writers
- Editors can accept, reject, or request changes on submissions
- Option to receive submissions from any writer who follows the publication

### Newsletter Management

- Publication editors can create and send custom email newsletters
- Newsletters go to all publication followers
- Separate from individual story email notifications
- Used for announcements, roundups, and curator commentary

### Publication Analytics

- **Publication Stats**: Aggregate metrics across all stories in the publication
- **Presentations metric**: How many times the publication's stories were displayed to readers
- Views, reads, and engagement metrics at publication level
- Per-story breakdown within the publication

### Boost Nomination Program

- Select publications (100+) are invited to participate as Boost Nominators
- Nominators can nominate up to 5 stories per week (20/month)
- Self-nomination allowed: max 2 of your own stories per month
- Nominated stories are reviewed by Medium's internal curation team
- Boosted stories get amplified distribution across homepage, emails, apps
- ~50% of Boosted stories come from nominations, ~50% from Medium's curation team
- Boost criteria: constructive, original, written from relevant experience, well-crafted, memorable

---

## 4. Medium Monetization Model

### Membership Pricing

| Plan | Price |
|------|-------|
| Monthly | $5/month |
| Annual | $50/year (save $10) |

### Revenue Distribution (Partner Program)

**Eligibility Requirements:**
- Must be a paying Medium member ($5/month minimum)
- Must have at least 100 followers
- Must have published at least 1 story in the past 6 months

**How Earnings Are Calculated:**
- Revenue pool funded by all member subscriptions
- Writers earn based on **member reading/listening time** on their paywalled stories
- **Engagement multipliers**: Claps, highlights, and responses increase earnings weight
- **Follower bonus**: When followers regularly read your content, earnings get a bonus
- **External traffic bonus** (Oct 2025): 5% bonus for member reads originating from outside Medium
- **Referred memberships** (Feb 2026): Writers earn more when a reader becomes a member after reading their paywalled story
- **Boost bonus**: Boosted stories receive an earnings multiplier

**Earnings Range:**
- Beginners: $0–$100 in first 3–6 months
- Consistent writers (3–4 stories/week): $200–$800/month within 6–12 months
- Top writers: Several thousand dollars/month

### Distribution Tiers

1. **Boost Distribution**: Highest visibility — homepage, emails, app, push notifications (curated)
2. **General Distribution**: Standard algorithmic distribution to relevant readers
3. **Network Distribution**: Limited to followers and topic subscribers only

---

## 5. Medium Navigation & Sidebar Structure

### Left Sidebar (Logged-In)

The sidebar was redesigned in 2025 with a "designed by writers for writers" philosophy:

```
┌─────────────────────┐
│  Medium Logo         │
│                      │
│  🏠 Home             │
│  🔔 Notifications    │
│  🔍 Search           │
│  📚 Library          │  ← Saved reads / reading lists
│  📝 Stories          │  ← Your published & draft stories
│  📊 Stats            │  ← Performance metrics
│                      │
│  ── Following ──     │
│  [Writers | Pubs |   │
│   Topics] filters    │
│  (horizontal scroll  │
│   of profile cards)  │
│                      │
│  ── Write ──         │
│  ✏️ Write a story    │
│                      │
│  ── Profile Menu ──  │
│  (Click profile pic  │
│   for contextual     │
│   settings menu)     │
└─────────────────────┘
```

### Key Navigation Patterns

- **Mode switching**: Reading mode (Home/Library) vs Writing mode (Stories/Stats) co-exist in the same sidebar
- **Profile click → contextual menu**: Settings, profile, publications, design your profile, membership, help
- **Following section**: Smart filter tabs (Writers, Publications, Writers & Pubs, Topics) with horizontal scrolling profile cards with active status indicators
- **Top bar**: Minimal — search, notifications, profile avatar, "Write" button
- **Right sidebar** (homepage only): Staff Picks, Recommended Topics, Who to Follow

### Mobile Navigation

- Bottom tab bar: Home, Search, Write (central/prominent), Notifications, Profile
- Hamburger/slide-out for secondary navigation

---

## 6. Competitor Analysis

### Substack — Newsletter-First Monetization

**Model**: Email newsletter platform with web publishing
**Pricing**: Free to use; 10% cut of paid subscription revenue

**Key Features:**
- Clean, distraction-free editor (headings, images, links, quotes, video/podcast embeds)
- **Paid subscriptions**: Writers set their own price; Substack handles billing
- **Substack Notes**: Social layer for short-form posts (like Twitter/X)
- **Recommendations**: Cross-promotion between compatible publications
- **Boosted Posts**: Platform promotes high-performing paid content
- **Analytics**: Open rates, click rates, subscription trends, per-post breakdown (Overview, Reach, Engagement tabs)
- **Subscriber management**: See who's paid, manage pricing, handle payments

**Differentiators:**
- Newsletter-first: Email is the primary distribution, web is secondary
- Writer owns the mailing list (can export subscribers)
- Direct writer-to-reader financial relationship (no platform revenue pool)
- Podcast and video hosting built-in
- Community features (chat, discussion threads)

**UI Patterns Worth Noting:**
- Minimal top navigation with publication name centered
- Writer dashboard: separate tabs for Posts, Subscribers, Analytics, Settings
- Inline analytics on each post (overview, reach, engagement)
- Clean reading experience with almost no chrome

---

### Ghost — Open-Source Membership Platform

**Model**: Self-hosted or managed hosting ($9–$199/month); 0% revenue cut
**Pricing**: Creators set their own membership tiers

**Key Features:**
- **Membership tiers**: Free, paid with multiple levels; each tier has unique pricing, benefits, content access
- **Free trials**: Optional per-tier
- **Native newsletter**: Publish to web and email simultaneously
- **Ghost 6.0 (Aug 2025)**: Native analytics suite with real-time traffic, top content, sources, email performance, member growth
- **Revenue metrics**: MRR tracking, churn calculation, customer lifetime value
- **Audience segments**: Filter by public, free, paid members
- **Admin dashboard**: Minimal, easy to manage
- **Integrations**: Zapier, Stripe, custom integrations via API
- **Themes**: Full design customization (Handlebars templating)
- **Newsletter optimization**: Subject line experiments, send-time experiments, deliverability health (spam rate, domain reputation)

**Differentiators:**
- Open source — full ownership and customization
- Zero platform fees on revenue (only Stripe's ~2.9% + 30¢)
- Built-in SEO features
- Headless CMS capability via Content API
- Self-hosting option for complete control
- Most comprehensive membership/subscription toolkit

**UI Patterns Worth Noting:**
- Clean admin panel with sidebar: Posts, Pages, Tags, Members, Analytics, Settings
- Koenig editor (block-based): Text, images, galleries, embeds, HTML, callouts, toggles, bookmarks
- Member management dashboard with growth charts and segment filtering
- Email analytics integrated directly into post analytics

---

### Hashnode — Developer Blogging Platform

**Model**: Free for individuals; Teams plan at $199/month
**Pricing**: No monetization layer (content is free)

**Key Features:**
- **Custom domain**: Map your own domain for free (you own SEO authority)
- **Markdown editor**: Block-based WYSIWYG with Markdown support
- **AI writing tools**: Content generation, editing, tone adjustments, SEO optimization, code generation
- **Team publications**: Collaborative editing with inline comments, shared authorship, editorial workflows
- **Headless CMS**: Use Hashnode as backend, bring your own frontend
- **Built-in analytics**: Post performance, SEO insights
- **Auto-generated**: Sitemaps, RSS feeds, Open Graph tags
- **GitHub backup**: Auto-sync posts to a GitHub repository
- **Docs by Hashnode**: Separate product for API documentation and product guides
- **Series**: Group related posts into ordered series

**Differentiators:**
- Developer-first: Syntax highlighting, code embeds, GitHub integration
- Custom domain on free tier (unique among competitors)
- Headless CMS capability
- Community feed provides organic discovery
- GitHub-backed content storage

**UI Patterns Worth Noting:**
- Dashboard sidebar: Blog, Drafts, Pages, Series, Analytics, Integrations, Appearance, Domain, General
- Reading interface similar to Medium but with code-friendly typography
- Tag-based discovery in community feed
- Minimal admin with focus on content and settings

---

### Dev.to — Community-First Developer Platform

**Model**: Completely free, open source (Forem platform)
**Pricing**: No monetization for writers

**Key Features:**
- **Markdown editor**: Minimal, intentionally simple
- **Reactions**: Heart, Unicorn, Exploding Head, Raised Hands, Fire (5 distinct reaction types vs. Medium's single clap)
- **Badges**: Achievement system for community contributions (e.g., "Well-Loved Comment" = 25 hearts)
- **Discussion threads**: Dedicated discussion tag and "Discussion of the Week" features
- **Listings**: Classifieds-style board for jobs, events, products, mentorship
- **Organizations**: Team accounts for companies
- **Cross-posting**: Canonical URL support for SEO-safe cross-posting
- **Challenges**: Regular community coding challenges (e.g., AI app building, green coding)
- **Tags**: Up to 4 tags per post; tag follows drive feed curation

**Differentiators:**
- No algorithm: Chronological + tag-based feed
- Anti-monetization stance: Focus on community and learning
- Open source (Forem): Anyone can run their own instance
- Strongest community engagement among all platforms
- Inclusive, welcoming culture enforced by code of conduct
- Multiple reaction types allow nuanced feedback

**UI Patterns Worth Noting:**
- Simple top navbar: Search, Write, Notifications, Profile
- Left sidebar: Tags you follow, popular tags, listings
- Right sidebar: Active discussions, trending tags, events
- Three-column layout on desktop (sidebar + feed + widget area)
- Very fast page loads (server-rendered)

---

## 7. Key UI/UX Patterns for CMS Design

### Patterns by User Role

#### For Readers

| Pattern | Source | Why It Works |
|---------|--------|-------------|
| Variable-intensity reactions (claps/multi-reactions) | Medium, Dev.to | More expressive than binary like/dislike |
| Text highlighting with social sharing | Medium | Turns reading into an interactive, social act |
| Metered paywall with friend links | Medium | Balances monetization with content sharing |
| Reading lists with custom organization | Medium | Lets readers curate their own experience |
| "For You" + "Following" feed tabs | Medium | Balances discovery with trusted sources |
| Right-sidebar recommendations | Medium, Dev.to | Non-intrusive content discovery |
| Staff/Editor picks curation | Medium | Human curation adds trust and quality signal |
| Topic-based following | Medium, Dev.to | Interest-driven content discovery |

#### For Writers/Authors

| Pattern | Source | Why It Works |
|---------|--------|-------------|
| Distraction-free block editor | Medium, Ghost, Substack | Focus on writing, not formatting |
| Inline formatting toolbar (appears on selection) | Medium | Contextual — only shows when needed |
| Plus (+) menu for blocks | Medium, Ghost | Clean line for inserting media/embeds |
| Stats dashboard with Views/Reads/Earnings tabs | Medium | Clear separation of metrics by purpose |
| "Presentations" metric | Medium | Shows writer how platform is promoting their content |
| Per-post analytics breakdown | Substack, Ghost | Understand what content resonates |
| Draft sharing for feedback | Medium | Collaborative editing before publishing |
| Canonical URL support | Medium, Hashnode, Dev.to | SEO-friendly cross-posting |
| Custom URL slugs | Medium, Ghost | SEO and branding control |
| Scheduled publishing | Medium, Ghost, Substack | Content calendar management |
| Revision history | Medium | Safety net for editing |
| AI writing assistance | Hashnode | Modern expectation for writing tools |

#### For Admins/Publication Owners

| Pattern | Source | Why It Works |
|---------|--------|-------------|
| Tiered roles (Owner > Editor > Writer) | Medium, Ghost | Clear permission hierarchy |
| Editor inbox for submissions | Medium | Centralized review workflow |
| Publication-level analytics | Medium, Ghost | Aggregate view of content performance |
| Membership tier management | Ghost | Flexible monetization |
| Newsletter integration | Medium, Ghost, Substack | Direct audience communication |
| Custom domain mapping | Medium, Ghost, Hashnode | Brand ownership |
| Homepage layout customization | Medium | Control over first impression |
| About page / editor's note | Medium | Publication identity and trust |
| Member management dashboard | Ghost | See who's paying, reading, churning |
| Revenue metrics (MRR, churn, LTV) | Ghost | Business intelligence for creators |
| Deliverability health monitoring | Ghost | Email reputation management |
| Boost/promotion nomination | Medium | Quality curation incentive |

### Universal UI Patterns Across All Platforms

1. **Sidebar navigation** with logical grouping (Content, Analytics, Settings)
2. **Clean, minimal editor** as the primary creation experience
3. **Contextual menus** that adapt based on user action (profile click, text selection)
4. **Separation of reading and writing modes** in navigation
5. **Progressive disclosure** — show basic features first, advanced features on demand
6. **Real-time or near-real-time analytics** with visual graphs
7. **Tag/topic-based content organization** for both creation and discovery
8. **Mobile-first bottom navigation** with prominent "Write/Create" button
9. **Dark mode support** across all platforms
10. **Email as distribution channel** integrated into the publishing flow

### Monetization Model Comparison

| Feature | Medium | Substack | Ghost | Hashnode | Dev.to |
|---------|--------|----------|-------|----------|--------|
| Revenue model | Revenue pool | Direct subscriptions | Direct subscriptions | Free/Teams plan | Free |
| Platform cut | Opaque pool split | 10% | 0% (Stripe only) | 0% | N/A |
| Membership pricing | $5/mo, $50/yr | Writer sets price | Writer sets tiers | N/A | N/A |
| Free tier for readers | 3 articles/month | Writer chooses | Writer chooses | Unlimited | Unlimited |
| Writer earnings control | Low (algorithmic) | High (own pricing) | High (own pricing) | N/A | N/A |
| Built-in audience | Yes (large) | Growing | No (bring your own) | Dev community | Dev community |
| Newsletter | Publication-level | Core feature | Core feature | No | No |
| Custom domain | Paid (owner only) | Paid plan | Yes (all plans) | Yes (free) | No |

---

## Sources

- [Medium Partner Program](https://medium.com/partner-program)
- [Medium Partner Program 2025 Complete Guide](https://medium.com/@hassanshah11417/medium-partner-program-2025-complete-guide-for-writers-aca79797640b)
- [Medium Stats Help Center](https://help.medium.com/hc/en-us/articles/215108608-Stats)
- [Medium Publication Stats Help Center](https://help.medium.com/hc/en-us/articles/215793317-Publication-stats)
- [Medium Calculating Earnings](https://help.medium.com/hc/en-us/articles/360036691193-Calculating-earnings-in-the-Partner-Program)
- [Medium Homepage Navigation Help](https://help.medium.com/hc/en-us/articles/115004849448-Homepage-navigation)
- [Medium Publication Settings](https://help.medium.com/hc/en-us/articles/34508714374679-Info-Homepage-Customizing-your-publication-settings-and-layout)
- [Medium Story Editor Help](https://help.medium.com/hc/en-us/articles/215194537-Using-the-story-editor)
- [Medium Boost Nomination Program](https://help.medium.com/hc/en-us/articles/23964242497559-Browse-100-publications-in-the-Boost-Nomination-Program)
- [Medium Distribution Guidelines](https://help.medium.com/hc/en-us/articles/360006362473-Medium-s-Distribution-Guidelines-How-curators-review-stories-for-Boost-General-and-Network-Distribution)
- [Medium Newsletters Help](https://help.medium.com/hc/en-us/articles/115004682167-How-to-use-Newsletters)
- [Medium Custom Domains Help](https://help.medium.com/hc/en-us/articles/115003053487-Setting-up-a-custom-domain-for-your-profile-or-publication)
- [Medium's Sidebar UI Update Analysis](https://gajananrajput.substack.com/p/mediums-new-ui-update-a-writers-take)
- [Medium Formatting Options Guide](https://www.manystories.com/blog/p/The-Ultimate-Guide-to-Medium-Formatting-Options-and-Tools--691366c56c4facc8c6b1a4a6)
- [Medium Boost Explained](https://www.thesideblogger.com/medium-boost/)
- [Medium Metered Paywall](https://mediumcourse.com/how-does-mediums-metered-paywall-work/)
- [Partner Program: Rewarding Stories That Bring New Members (Feb 2026)](https://medium.com/blog/partner-program-update-starting-february-17-were-rewarding-stories-that-bring-in-new-members-3e84d2eb6e68)
- [How to Make Money on Medium 2026](https://millennialmoneyman.com/how-to-make-money-on-medium/)
- [Substack Features 2025](https://womeninpublishingsummit.com/substack-features/)
- [Substack Review 2025](https://www.techradar.com/pro/website-building/substack-review)
- [Ghost CMS Review 2025](https://www.usebetterproducts.com/ghost-cms-review/)
- [Ghost Membership Tiers](https://ghost.org/help/tiers/)
- [Ghost 6 Update](https://www.thememyblog.com/blog/ghost-cms-6/)
- [Hashnode vs Dev.to 2025](https://www.blogbowl.io/blog/posts/hashnode-vs-dev-to-which-platform-is-best-for-developers-in-2025)
- [Hashnode Introduction](https://docs.hashnode.com/blogs/getting-started/introduction)
- [10 Best Medium Alternatives 2025](https://hyvor.com/blog/medium-alternatives)
- [Ghost vs Substack Comparison](https://ricmac.org/2025/08/21/ghost-substack-eleventy-wordpress/)
