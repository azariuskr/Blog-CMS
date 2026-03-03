# Storefront Design & Implementation Plan

## Design Vision

**Mix two inspiration sources into a unified storefront:**
- **Layout & structure** from `~/projects/e-commerce-ui` (bold typography, modern layout, wave/blob shapes)
- **Pages, theme & components** from `~/projects/ecom-ui-inspiration` PartyPop theme (rose/pink, playful, rounded)
- **Admin portal** keeps its own separate theme (existing Shadcn/dark sidebar)
- Storefront and admin must be independently themeable

---

## Design System

### Color Palette (PartyPop-inspired, unified)
- **Primary**: Rose (#f43f5e) - buttons, CTAs, active states
- **Accent**: Warm orange (#fb923c) - badges, highlights
- **Background**: Warm off-white (#fdfbf7, #fef3ec)
- **Text**: Slate grays (slate-800 body, slate-600 muted)
- **Success**: Emerald green
- **Error**: Rose red
- **Surface**: White cards with soft shadows

### Typography
- **Headings**: Varela Round (rounded, friendly) or Fredoka
- **Body**: Quicksand (soft, approachable)
- **Fallback**: system sans-serif stack
- Load via Google Fonts in storefront layout only (not admin)

### Component Style
- Large rounded corners (rounded-2xl, rounded-3xl)
- Soft shadows, no hard borders
- Hover animations (scale, translate)
- Playful badges (Hot, New, Sale)
- Toast notifications for cart actions

---

## Architecture: Theme Separation

### Approach: Dual Layout System
```
src/routes/
  (authenticated)/admin/...   → AdminLayout (existing Shadcn theme)
  (storefront)/...            → StorefrontLayout (PartyPop theme)
```

### StorefrontLayout provides:
- Storefront nav (sticky, backdrop blur, logo, search, cart icon, user menu)
- Footer (minimal: logo, copyright, policy links)
- Cart drawer (slide-in sidebar)
- Toast container
- Font imports (Varela Round, Quicksand)
- Storefront-specific CSS variables / Tailwind theme extension

### Theme config:
- Extend `tailwind.config` with storefront colors under a custom prefix or CSS variables
- Storefront components use storefront-specific utility classes
- Admin components continue using existing Shadcn theme

---

## Pages to Build (Priority Order)

### Phase 1: Core Shopping Flow
1. **Landing/Home** (`/store` or `/`)
   - Hero section with gradient overlay + CTA
   - Category cards (4-column grid)
   - Featured products grid with quick-view
   - Newsletter signup section
   - Source: Landing-Page.html (LittleSprout) + e-commerce-ui hero layout

2. **Product Catalog** (`/store/products`)
   - Breadcrumb navigation
   - Sidebar filters (categories, price range, colors, sizes)
   - Product grid (3-col desktop, 2-col tablet, 1-col mobile)
   - Sort dropdown, filter tags
   - Pagination or "Load more"
   - Source: Product-Library-Catalog-Page.html

3. **Product Detail** (`/store/products/:slug`)
   - Image gallery with thumbnails
   - Product info (name, price, description, badges)
   - Variant selectors (color swatches, size buttons)
   - Quantity selector + Add to Cart button
   - Trust badges (shipping, guarantee)
   - "You may also like" section
   - Source: Product-Page.html

4. **Cart** (`/store/cart`)
   - Free shipping progress bar
   - Cart items with images, quantity adjusters, remove buttons
   - Order summary sidebar (subtotal, tax, shipping, total)
   - Promo code input
   - Upsell section ("Don't forget these")
   - Source: Cart-page.html

5. **Checkout** (`/store/checkout`)
   - Multi-step or single-page checkout
   - Contact info form
   - Shipping address form
   - Shipping method selector
   - Payment section (Stripe integration)
   - Order summary sidebar
   - Source: checkout-page.html

6. **Order Confirmation** (`/store/orders/:orderNumber/confirmation`)
   - Success icon/animation
   - Order number badge
   - Items ordered list
   - Shipping + payment summary
   - "Return to Shop" CTA
   - Source: Order-Confirmation-page.html

### Phase 2: Supporting Pages
7. **Search Results** (`/store/search`)
   - Search query display + result count
   - Quick filter tags
   - Same product grid as catalog
   - Source: Search-result-Page.html

8. **About Us** (`/store/about`)
   - Brand story section
   - Stats display
   - Values cards
   - Source: About-Us-Brand-Story-page.html

9. **FAQ / Shipping & Returns** (`/store/faq`)
   - Shipping info cards
   - Returns policy
   - Accordion FAQ
   - Source: FAQ-Shipping-&-Returns-sections.html

10. **Contact** (`/store/contact`)
    - Contact method cards
    - Contact form
    - Source: Contact-Form-&-Support-Details.html

---

## Implementation Steps

### Step 1: Storefront Layout & Theme Setup
- [ ] Create storefront route group: `src/routes/(storefront)/`
- [ ] Create `StorefrontLayout` component with nav, footer, cart drawer
- [ ] Add Google Fonts (Varela Round, Quicksand) to storefront head
- [ ] Extend Tailwind config with storefront color palette
- [ ] Create storefront-specific UI primitives (StorefrontButton, StorefrontCard, etc.) or use Tailwind utility classes directly
- [ ] Ensure admin layout is completely unaffected

### Step 2: Shared Storefront Components
- [ ] `StorefrontNav` - sticky nav with logo, search, cart badge, user menu
- [ ] `StorefrontFooter` - minimal footer
- [ ] `CartDrawer` - slide-in cart sidebar (uses existing cart server functions)
- [ ] `ProductCard` - product grid card with hover quick-view
- [ ] `ProductBadge` - Hot/New/Sale badges
- [ ] `PriceDisplay` (storefront version with storefront styling)
- [ ] `FilterSidebar` - category, price range, color, size filters
- [ ] `QuantitySelector` - +/- quantity input
- [ ] `ToastProvider` - storefront toast notifications

### Step 3: Landing Page
- [ ] Hero section (gradient overlay, CTA button)
- [ ] Category grid section
- [ ] Featured products section (uses `$getProducts` server function)
- [ ] Newsletter signup section

### Step 4: Catalog & Product Detail
- [ ] Product catalog page with filters + grid
- [ ] Product detail page with gallery + variants + add-to-cart
- [ ] Wire up to existing server functions ($getProducts, $getProduct)

### Step 5: Cart & Checkout
- [ ] Cart page (uses existing $getCart, $updateCartItem, $removeFromCart)
- [ ] Checkout page (uses existing $createOrder, $processPayment)
- [ ] Order confirmation page

### Step 6: Supporting Pages
- [ ] Search, About, FAQ, Contact pages

---

## Server Functions Already Available
All backend is built - storefront just needs UI:
- `$getProducts` - public product listing with filters
- `$getProduct` - single product detail
- `$getOrCreateCart` - get/create cart for user or guest
- `$addToCart` - add item to cart
- `$updateCartItem` - update quantity
- `$removeFromCart` - remove item
- `$applyCoupon` / `$removeCoupon` - coupon management
- `$createOrder` - create order from cart
- `$processPayment` - payment processing
- `$verifyPayment` - payment verification

---

## Key Design Decisions to Review
1. **Route prefix**: `/store` vs root `/` for storefront pages
2. **Font loading strategy**: Google Fonts CDN vs self-hosted
3. **Image handling**: Product images from DB (storage service) + static assets
4. **Cart persistence**: Server-side cart (already built) vs local state
5. **Guest checkout**: Already supported in backend
6. **Search**: Client-side filtering vs server-side search function
7. **Mobile-first**: All pages responsive (1-col mobile → 3-col desktop)

---

## Files Reference
- Inspiration HTML: `~/projects/ecom-ui-inspiration/*.html`
- Design assets: `~/projects/e-commerce-ui/public/`
- Product images: `public/products/*.png`
- Existing server functions: `src/lib/ecommerce/functions/`
- Existing queries: `src/lib/ecommerce/queries.ts`
- Existing actions: `src/hooks/ecommerce-actions.ts`
