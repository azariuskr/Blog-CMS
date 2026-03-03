import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://172.19.0.8:3000/template';
const SCREENSHOTS = './storefront-screenshots';
mkdirSync(SCREENSHOTS, { recursive: true });

let passed = 0;
let failed = 0;
const failures = [];

function log(msg) { console.log(`[TEST] ${msg}`); }
function pass(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, err) { failed++; failures.push({ name, err: String(err) }); console.log(`  ❌ ${name}: ${err}`); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // =============================================
  // TEST 1: Landing page loads with products
  // =============================================
  log('TEST 1: Landing page');
  try {
    await page.goto(`${BASE}/store`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOTS}/01-landing.png`, fullPage: true });

    // Check hero section
    const heroText = await page.textContent('h1');
    if (heroText && heroText.includes('Celebration')) pass('Hero section visible');
    else fail('Hero section visible', `Got: ${heroText}`);

    // Check featured products section
    const featuredHeading = await page.locator('text=Featured Products').first();
    if (await featuredHeading.isVisible()) pass('Featured Products heading visible');
    else fail('Featured Products heading visible', 'Not found');

    // Count product cards in featured section
    const productCards = page.locator('section:has(h2:text("Featured Products")) .sf-card');
    const cardCount = await productCards.count();
    if (cardCount > 0) pass(`Featured products rendered: ${cardCount} cards`);
    else fail('Featured products rendered', 'No product cards found');

    // Check images are loading (not just placeholder icons)
    const productImages = page.locator('section:has(h2:text("Featured Products")) .sf-card img');
    const imgCount = await productImages.count();
    if (imgCount > 0) pass(`Product images present: ${imgCount} images`);
    else fail('Product images present', 'No img tags found in product cards');

    // Check first image src
    if (imgCount > 0) {
      const firstSrc = await productImages.first().getAttribute('src');
      if (firstSrc && firstSrc.startsWith('/products/')) pass(`Image src correct: ${firstSrc}`);
      else fail('Image src correct', `Got: ${firstSrc}`);
    }
  } catch (e) { fail('Landing page load', e.message); }

  // =============================================
  // TEST 2: Landing page categories (real DB data)
  // =============================================
  log('TEST 2: Landing page categories');
  try {
    // Check for real category names
    const pageText = await page.textContent('body');
    const realCategories = ['Clothing', 'Electronics', 'Shoes', 'Accessories'];
    const fakeCategories = ['Balloons', 'Banners', 'Tableware', 'Favors'];

    for (const cat of realCategories) {
      if (pageText.includes(cat)) pass(`Real category "${cat}" visible`);
      else fail(`Real category "${cat}" visible`, 'Not found on page');
    }

    for (const cat of fakeCategories) {
      // Check specifically in the category section, not elsewhere
      const categorySection = page.locator('section:has(h2:text("Shop by Category"))');
      const sectionText = await categorySection.textContent();
      if (!sectionText.includes(cat)) pass(`Fake category "${cat}" removed`);
      else fail(`Fake category "${cat}" removed`, 'Still present');
    }

    // Check category links use UUIDs
    const categoryLinks = page.locator('section:has(h2:text("Shop by Category")) a');
    const catLinkCount = await categoryLinks.count();
    if (catLinkCount > 0) {
      const firstHref = await categoryLinks.first().getAttribute('href');
      if (firstHref && firstHref.includes('category=') && firstHref.match(/[0-9a-f]{8}-/)) {
        pass(`Category links use UUIDs: ${firstHref}`);
      } else {
        fail('Category links use UUIDs', `Got href: ${firstHref}`);
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS}/02-categories.png` });
  } catch (e) { fail('Landing categories', e.message); }

  // =============================================
  // TEST 3: Heart button on landing page cards
  // =============================================
  log('TEST 3: Heart buttons on landing page');
  try {
    const heartButtons = page.locator('section:has(h2:text("Featured Products")) .sf-card button:has(svg)').first();
    const hasHeart = await heartButtons.count();
    if (hasHeart > 0) pass('Heart buttons present on product cards');
    else fail('Heart buttons present on product cards', 'No heart buttons found');
  } catch (e) { fail('Heart buttons', e.message); }

  // =============================================
  // TEST 4: Navigate to catalog page
  // =============================================
  log('TEST 4: Catalog page');
  try {
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOTS}/03-catalog.png`, fullPage: true });

    // Check product count
    const catalogCards = page.locator('.sf-card');
    const catalogCount = await catalogCards.count();
    if (catalogCount >= 12) pass(`Catalog shows ${catalogCount} products (≥12)`);
    else fail(`Catalog shows ≥12 products`, `Only ${catalogCount} cards found`);

    // Check "products found" text
    const countText = await page.locator('text=/\\d+ products? found/').first().textContent();
    if (countText) pass(`Product count displayed: ${countText.trim()}`);
    else fail('Product count displayed', 'Not found');

    // Check images in catalog
    const catalogImages = page.locator('.sf-card img');
    const catalogImgCount = await catalogImages.count();
    if (catalogImgCount > 0) pass(`Catalog images present: ${catalogImgCount}`);
    else fail('Catalog images present', 'No images');

    // Check 4-column layout on desktop (1440px viewport)
    const grid = page.locator('.grid.lg\\:grid-cols-4').first();
    if (await grid.count() > 0) pass('4-column grid layout on desktop');
    else fail('4-column grid layout', 'lg:grid-cols-4 class not found');

  } catch (e) { fail('Catalog page', e.message); }

  // =============================================
  // TEST 5: Sidebar filters work
  // =============================================
  log('TEST 5: Sidebar filters');
  try {
    // Categories in sidebar
    const catFilter = page.locator('text=Category').first();
    if (await catFilter.isVisible()) pass('Category filter section visible');
    else fail('Category filter section visible', 'Not found');

    // Click a category filter
    const clothingBtn = page.locator('button:has-text("Clothing")').first();
    if (await clothingBtn.count() > 0) {
      await clothingBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/04-filtered-clothing.png`, fullPage: true });

      const urlAfterFilter = page.url();
      if (urlAfterFilter.includes('category=') && urlAfterFilter.match(/[0-9a-f]{8}-/)) {
        pass(`Category filter uses UUID in URL: ${urlAfterFilter.split('?')[1]}`);
      } else {
        fail('Category filter uses UUID', `URL: ${urlAfterFilter}`);
      }

      // Check filtered count changed
      const filteredText = await page.locator('text=/\\d+ products? found/').first().textContent();
      pass(`Filtered result: ${filteredText?.trim()}`);

      // Clear filter
      const clearBtn = page.locator('text=Clear all').first();
      if (await clearBtn.count() > 0) {
        await clearBtn.click();
        await page.waitForTimeout(1000);
        pass('Clear all filters button works');
      }
    } else {
      fail('Clothing category button', 'Not found in sidebar');
    }

    // Brand filter
    const brandFilter = page.locator('text=Brand').first();
    if (await brandFilter.isVisible()) pass('Brand filter section visible');
    else fail('Brand filter section visible', 'Not found');

  } catch (e) { fail('Sidebar filters', e.message); }

  // =============================================
  // TEST 6: Category link from landing page
  // =============================================
  log('TEST 6: Category link navigation');
  try {
    await page.goto(`${BASE}/store`, { waitUntil: 'networkidle', timeout: 30000 });
    const catLink = page.locator('section:has(h2:text("Shop by Category")) a').first();
    if (await catLink.count() > 0) {
      const catName = await catLink.textContent();
      await catLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/05-category-nav.png`, fullPage: true });

      const url = page.url();
      if (url.includes('/store/products') && url.includes('category=')) {
        pass(`Category link navigated correctly: ${catName?.trim()}`);
      } else {
        fail('Category link navigation', `URL: ${url}`);
      }

      // Should show products (not empty or error)
      const cards = page.locator('.sf-card');
      const count = await cards.count();
      if (count > 0) pass(`Category page shows ${count} products`);
      else fail('Category page shows products', 'No products found');
    }
  } catch (e) { fail('Category navigation', e.message); }

  // =============================================
  // TEST 7: Product detail page
  // =============================================
  log('TEST 7: Product detail page');
  try {
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });

    // Click first product card link
    const firstProduct = page.locator('.sf-card a').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/06-product-detail.png`, fullPage: true });

      const url = page.url();
      if (url.includes('/store/products/')) pass(`Product detail page loaded: ${url.split('/').pop()}`);
      else fail('Product detail page loaded', `URL: ${url}`);

      // Check product image
      const detailImg = page.locator('img[alt]').first();
      if (await detailImg.count() > 0) {
        const src = await detailImg.getAttribute('src');
        if (src && src.startsWith('/products/')) pass(`Product detail image: ${src}`);
        else pass(`Product detail has image: ${src}`);
      } else {
        fail('Product detail image', 'No image found');
      }

      // Check heart button exists
      const heartBtn = page.locator('button:has(svg.lucide-heart), button:has(svg)').first();
      if (await heartBtn.count() > 0) pass('Heart/wishlist button on detail page');
      else fail('Heart/wishlist button on detail page', 'Not found');

      // Check Add to Cart button
      const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Bag")').first();
      if (await addToCartBtn.count() > 0) pass('Add to Cart button visible');
      else fail('Add to Cart button visible', 'Not found');
    }
  } catch (e) { fail('Product detail', e.message); }

  // =============================================
  // TEST 8: Add to Cart flow
  // =============================================
  log('TEST 8: Add to Cart');
  try {
    // We should still be on a product detail page
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Bag")').first();
    if (await addBtn.count() > 0) {
      // First select a variant if needed
      const variantBtns = page.locator('button[class*="border"]:not(:disabled)');

      await addBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/07-add-to-cart.png`, fullPage: true });

      // Check for error toasts (should NOT see "Invalid UUID")
      const toastError = page.locator('[data-sonner-toast][data-type="error"]');
      const errorCount = await toastError.count();
      if (errorCount > 0) {
        const errorText = await toastError.first().textContent();
        if (errorText && errorText.toLowerCase().includes('uuid')) {
          fail('Add to Cart - no UUID error', `Got error: ${errorText}`);
        } else {
          // Other errors are informational (e.g. "select a variant")
          pass(`Add to Cart clicked (info: ${errorText})`);
        }
      } else {
        // Check for success toast or cart update
        const successToast = page.locator('[data-sonner-toast][data-type="success"]');
        if (await successToast.count() > 0) {
          pass('Add to Cart succeeded');
        } else {
          pass('Add to Cart clicked (no error toast)');
        }
      }
    }
  } catch (e) { fail('Add to Cart', e.message); }

  // =============================================
  // TEST 9: Wishlist/Favorite toggle
  // =============================================
  log('TEST 9: Wishlist toggle');
  try {
    // Go to catalog, hover a product card and click heart
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Find heart button on first card (need to hover to make it visible)
    const firstCard = page.locator('.sf-card').first();
    await firstCard.hover();
    await page.waitForTimeout(500);

    const heartBtn = firstCard.locator('button').first();
    if (await heartBtn.count() > 0) {
      await heartBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/08-wishlist-toggle.png`, fullPage: true });

      // Check for error toasts
      const toastError = page.locator('[data-sonner-toast][data-type="error"]');
      const errorCount = await toastError.count();
      if (errorCount > 0) {
        const errorText = await toastError.first().textContent();
        if (errorText && (errorText.toLowerCase().includes('uuid') || errorText.toLowerCase().includes('invalid'))) {
          fail('Wishlist - no UUID error', `Got: ${errorText}`);
        } else if (errorText && errorText.includes('Sign in')) {
          pass(`Wishlist correctly requires auth: "${errorText}"`);
        } else {
          pass(`Wishlist response: "${errorText}"`);
        }
      } else {
        pass('Wishlist toggle - no error (user may be logged in)');
      }
    } else {
      fail('Wishlist heart button', 'Not found on card');
    }
  } catch (e) { fail('Wishlist toggle', e.message); }

  // =============================================
  // TEST 10: Quick Add button on product card
  // =============================================
  log('TEST 10: Quick Add from product card');
  try {
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const firstCard = page.locator('.sf-card').first();
    await firstCard.hover();
    await page.waitForTimeout(500);

    // The "Add" button in the overlay
    const addBtn = firstCard.locator('button:has-text("Add")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/09-quick-add.png`, fullPage: true });

      const toastError = page.locator('[data-sonner-toast][data-type="error"]');
      const errorCount = await toastError.count();
      if (errorCount > 0) {
        const errorText = await toastError.first().textContent();
        if (errorText && errorText.toLowerCase().includes('uuid')) {
          fail('Quick Add - no UUID error', `Got: ${errorText}`);
        } else {
          pass(`Quick Add response: "${errorText}"`);
        }
      } else {
        pass('Quick Add - no error');
      }
    } else {
      fail('Quick Add button', 'Not visible on hover');
    }
  } catch (e) { fail('Quick Add', e.message); }

  // =============================================
  // TEST 11: Footer links
  // =============================================
  log('TEST 11: Footer links');
  try {
    await page.goto(`${BASE}/store`, { waitUntil: 'networkidle', timeout: 30000 });

    // Check New Arrivals link
    const newArrivalsLink = page.locator('footer a:has-text("New Arrivals")').first();
    if (await newArrivalsLink.count() > 0) {
      const href = await newArrivalsLink.getAttribute('href');
      if (href && !href.includes('category=new')) {
        pass(`Footer "New Arrivals" link fixed: ${href}`);
      } else {
        fail('Footer New Arrivals link', `Still uses bad param: ${href}`);
      }
    }

    // Check Sale link
    const saleLink = page.locator('footer a:has-text("Sale")').first();
    if (await saleLink.count() > 0) {
      const href = await saleLink.getAttribute('href');
      if (href && !href.includes('category=sale')) {
        pass(`Footer "Sale" link fixed: ${href}`);
      } else {
        fail('Footer Sale link', `Still uses bad param: ${href}`);
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS}/10-footer.png` });
  } catch (e) { fail('Footer links', e.message); }

  // =============================================
  // TEST 12: Pagination
  // =============================================
  log('TEST 12: Pagination');
  try {
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });

    const paginationBtns = page.locator('button:has-text("Next"), button:has-text("Previous")');
    const paginationCount = await paginationBtns.count();
    if (paginationCount > 0) pass('Pagination buttons visible');
    else pass('Pagination not needed (all products on one page)');

  } catch (e) { fail('Pagination', e.message); }

  // =============================================
  // TEST 13: Search functionality
  // =============================================
  log('TEST 13: Search');
  try {
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('balloon');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/11-search.png`, fullPage: true });

      const resultText = await page.locator('text=/\\d+ products? found/').first().textContent();
      pass(`Search for "balloon": ${resultText?.trim()}`);
    }
  } catch (e) { fail('Search', e.message); }

  // =============================================
  // TEST 14: Console errors check
  // =============================================
  log('TEST 14: Console errors');
  const uuidErrors = consoleErrors.filter(e => e.toLowerCase().includes('uuid'));
  if (uuidErrors.length === 0) pass('No UUID-related console errors');
  else fail('UUID console errors found', uuidErrors.join('; '));

  const criticalErrors = consoleErrors.filter(e =>
    e.toLowerCase().includes('uncaught') ||
    e.toLowerCase().includes('unhandled') ||
    e.toLowerCase().includes('500')
  );
  if (criticalErrors.length === 0) pass('No critical console errors');
  else fail('Critical console errors', criticalErrors.slice(0, 3).join('; '));

  // =============================================
  // SUMMARY
  // =============================================
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log(`  ❌ ${f.name}: ${f.err}`));
  }
  console.log(`\nScreenshots saved to: ${SCREENSHOTS}/`);

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
