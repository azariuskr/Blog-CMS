import { test, expect } from '@playwright/test';

const BASE = 'http://172.20.0.9:3000/template';
const SS = './test-results/screenshots';

async function snap(page: any, name: string) {
  await page.screenshot({ path: `${SS}/${name}`, fullPage: true });
}

test('1 - Landing page loads with featured products', async ({ page }) => {
  const res = await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' });
  expect(res?.status()).toBe(200);
  await page.waitForTimeout(2000);
  await snap(page, 'sanity-01-landing.png');
  const body = await page.locator('body').innerText();
  console.log('[1] Landing body length:', body.length);
  expect(body.length).toBeGreaterThan(50);
  const images = await page.locator('img').count();
  console.log('[1] Images on landing:', images);
  const nav = await page.locator('nav, header, [role="navigation"]').count();
  console.log('[1] Nav/header elements:', nav);
  expect(nav).toBeGreaterThan(0);
  const productLinks = await page.locator('a[href*="/products/"], a[href*="/store/products"]').count();
  console.log('[1] Product links on landing:', productLinks);
});

test('2 - Catalog page loads with products and filters', async ({ page }) => {
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await snap(page, 'sanity-02-catalog.png');
  const body = await page.locator('body').innerText();
  console.log('[2] Catalog body length:', body.length);
  const productCards = await page.locator('[class*="product"], [class*="card"], [data-testid*="product"]').count();
  console.log('[2] Product card elements:', productCards);
  const productLinks = await page.locator('a[href*="/products/"]').count();
  console.log('[2] Product detail links:', productLinks);
  const filterSection = await page.locator('[class*="filter"], [class*="sidebar"], aside, [data-testid*="filter"]').count();
  console.log('[2] Filter/sidebar elements:', filterSection);
  const colorFilter = await page.getByText(/color/i).count();
  const sizeFilter = await page.getByText(/size/i).count();
  const categoryFilter = await page.getByText(/categor/i).count();
  console.log('[2] Color filter text:', colorFilter, '| Size:', sizeFilter, '| Category:', categoryFilter);
  const pagination = await page.locator('[class*="paginat"], [aria-label*="page"], button:has-text("Next"), a:has-text("Next"), [class*="page"]').count();
  console.log('[2] Pagination elements:', pagination);
  const filterButtons = page.locator('button, input[type="checkbox"], [role="checkbox"]').filter({ hasText: /S|M|L|XL|Red|Blue|Black/i });
  const filterCount = await filterButtons.count();
  console.log('[2] Clickable filter options:', filterCount);
  if (filterCount > 0) {
    await filterButtons.first().click();
    await page.waitForTimeout(1500);
    await snap(page, 'sanity-02b-catalog-filtered.png');
    console.log('[2] Filter clicked successfully');
  }
});

test('3 - Product detail page', async ({ page }) => {
  let res = await page.goto(`${BASE}/store/products/classic-tee`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').innerText();
  if (res?.status() === 404 || bodyText.includes('Not Found') || bodyText.length < 100) {
    console.log('[3] classic-tee not found, navigating to catalog to find a product...');
    await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('a[href*="/products/"]').first();
    if (await firstProduct.count() > 0) {
      const href = await firstProduct.getAttribute('href');
      console.log('[3] Found product link:', href);
      await firstProduct.click();
      await page.waitForTimeout(2000);
    }
  }
  await snap(page, 'sanity-03-product-detail.png');
  const title = await page.locator('h1, h2').first().innerText().catch(() => '');
  console.log('[3] Product title:', title);
  const imgCount = await page.locator('img').count();
  console.log('[3] Product images:', imgCount);
  const priceText = await page.getByText(/\$[\d.,]+/).count();
  console.log('[3] Price elements:', priceText);
  const colorSelector = await page.locator('[class*="color"], [aria-label*="color"], [data-testid*="color"]').count();
  const sizeSelector = await page.locator('button, [role="radio"], [role="option"]').filter({ hasText: /^(XS|S|M|L|XL|XXL|2XL)$/ }).count();
  console.log('[3] Color selectors:', colorSelector, '| Size selectors:', sizeSelector);
  const addToCart = await page.locator('button').filter({ hasText: /add to (cart|bag)|cart/i }).count();
  console.log('[3] Add to cart buttons:', addToCart);
});

test('4 - Search functionality', async ({ page }) => {
  await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[aria-label*="search" i]').count();
  const searchButton = await page.locator('button[aria-label*="search" i], a[href*="search"], [class*="search"]').count();
  console.log('[4] Search inputs:', searchInput, '| Search buttons/icons:', searchButton);
  await snap(page, 'sanity-04-search-before.png');
  if (searchInput > 0) {
    const input = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[aria-label*="search" i]').first();
    await input.fill('tee');
    await page.waitForTimeout(1500);
    await snap(page, 'sanity-04b-search-results.png');
    console.log('[4] Search query submitted');
  } else if (searchButton > 0) {
    const btn = page.locator('button[aria-label*="search" i], a[href*="search"], [class*="search"]').first();
    await btn.click();
    await page.waitForTimeout(1500);
    await snap(page, 'sanity-04b-search-opened.png');
    const newInput = await page.locator('input[type="search"], input[placeholder*="search" i], input[type="text"]').count();
    console.log('[4] Search input appeared after click:', newInput);
  } else {
    await page.goto(`${BASE}/store/search?q=tee`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap(page, 'sanity-04b-search-direct.png');
    console.log('[4] Direct search URL result:', page.url());
  }
});

test('5 - Cart: add item, view, update, remove', async ({ page }) => {
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const firstProduct = page.locator('a[href*="/products/"]').first();
  if (await firstProduct.count() > 0) {
    await firstProduct.click();
    await page.waitForTimeout(2000);
  }
  await snap(page, 'sanity-05a-product-before-add.png');
  const sizeBtn = page.locator('button, [role="radio"]').filter({ hasText: /^(S|M|L|XL)$/ });
  if (await sizeBtn.count() > 0) {
    await sizeBtn.first().click();
    await page.waitForTimeout(500);
    console.log('[5] Selected a size');
  }
  const colorBtn = page.locator('[class*="color"] button, [aria-label*="color"]').first();
  if (await colorBtn.count() > 0) {
    await colorBtn.click();
    await page.waitForTimeout(500);
    console.log('[5] Selected a color');
  }
  const addBtn = page.locator('button').filter({ hasText: /add to (cart|bag)|add item/i }).first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(2000);
    console.log('[5] Clicked add to cart');
    await snap(page, 'sanity-05b-after-add.png');
  } else {
    console.log('[5] WARN: No add-to-cart button found');
    await snap(page, 'sanity-05b-no-add-btn.png');
  }
  const cartLink = page.locator('a[href*="/cart"], button[aria-label*="cart" i], [class*="cart"] a, [class*="cart"] button').first();
  if (await cartLink.count() > 0) {
    await cartLink.click();
    await page.waitForTimeout(2000);
    console.log('[5] Opened cart');
  } else {
    await page.goto(`${BASE}/store/cart`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('[5] Navigated to /store/cart directly');
  }
  await snap(page, 'sanity-05c-cart-view.png');
  const cartBody = await page.locator('body').innerText();
  console.log('[5] Cart page content length:', cartBody.length);
  const hasItems = cartBody.toLowerCase().includes('quantity') || cartBody.toLowerCase().includes('total') || cartBody.toLowerCase().includes('subtotal') || cartBody.toLowerCase().includes('remove');
  console.log('[5] Cart appears to have items:', hasItems);
  const qtyPlus = page.locator('button').filter({ hasText: /\+|increase/i }).first();
  if (await qtyPlus.count() > 0) {
    await qtyPlus.click();
    await page.waitForTimeout(1500);
    console.log('[5] Increased quantity');
    await snap(page, 'sanity-05d-qty-updated.png');
  }
  const removeBtn = page.locator('button').filter({ hasText: /remove|delete/i }).first();
  const trashBtn = page.locator('button[aria-label*="remove" i], button[aria-label*="delete" i]').first();
  if (await removeBtn.count() > 0) {
    await removeBtn.click();
    await page.waitForTimeout(1500);
    console.log('[5] Removed item via text button');
    await snap(page, 'sanity-05e-item-removed.png');
  } else if (await trashBtn.count() > 0) {
    await trashBtn.click();
    await page.waitForTimeout(1500);
    console.log('[5] Removed item via icon button');
    await snap(page, 'sanity-05e-item-removed.png');
  }
});

test('6 - Navigation links resolve', async ({ page }) => {
  await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const routes = [
    { name: 'Home/Store', paths: ['/store', '/'] },
    { name: 'Shop/Products', paths: ['/store/products', '/products', '/shop'] },
    { name: 'About', paths: ['/about'] },
    { name: 'FAQ', paths: ['/faq'] },
    { name: 'Contact', paths: ['/contact'] },
  ];
  for (const route of routes) {
    let found = false;
    for (const p of route.paths) {
      const link = page.locator(`a[href*="${p}"]`).first();
      if (await link.count() > 0) {
        const href = await link.getAttribute('href');
        console.log(`[6] ${route.name}: Found link -> ${href}`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`[6] ${route.name}: No link found in nav`);
  }
  const testUrls = [
    { name: 'Store-Home', url: `${BASE}/store` },
    { name: 'Products', url: `${BASE}/store/products` },
    { name: 'About', url: `${BASE}/store/about` },
    { name: 'FAQ', url: `${BASE}/store/faq` },
    { name: 'Contact', url: `${BASE}/store/contact` },
  ];
  let idx = 0;
  for (const t of testUrls) {
    const res = await page.goto(t.url, { waitUntil: 'networkidle' });
    const status = res?.status() ?? 0;
    await page.waitForTimeout(1000);
    const bodyLen = (await page.locator('body').innerText()).length;
    console.log(`[6] ${t.name} (${t.url}): HTTP ${status}, body length ${bodyLen}`);
    await snap(page, `sanity-06${String.fromCharCode(97 + idx)}-nav-${t.name.toLowerCase()}.png`);
    idx++;
  }
});

test('7 - Wishlist/Favorites toggle', async ({ page }) => {
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const hearts = await page.locator('[class*="heart"], [class*="wish"], [class*="favorite"], [aria-label*="wish" i], [aria-label*="favorite" i]').count();
  console.log('[7] Heart/favorite elements found:', hearts);
  await snap(page, 'sanity-07a-catalog-hearts.png');
  const heartBtn = page.locator('[aria-label*="wish" i], [aria-label*="favorite" i], [class*="heart"] button, [class*="wish"] button').first();
  if (await heartBtn.count() > 0) {
    await heartBtn.click();
    await page.waitForTimeout(1500);
    console.log('[7] Clicked heart/favorite button');
    await snap(page, 'sanity-07b-after-fav.png');
  } else {
    const firstProduct = page.locator('a[href*="/products/"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForTimeout(2000);
      const detailHeart = page.locator('[aria-label*="wish" i], [aria-label*="favorite" i], button:has-text("Wishlist"), button:has-text("Favorite")').first();
      if (await detailHeart.count() > 0) {
        await detailHeart.click();
        await page.waitForTimeout(1500);
        console.log('[7] Clicked heart on product detail');
        await snap(page, 'sanity-07b-detail-fav.png');
      } else {
        console.log('[7] No wishlist/favorite button found anywhere');
        await snap(page, 'sanity-07b-no-fav-btn.png');
      }
    }
  }
});

test('8 - Auth pages exist', async ({ page }) => {
  const authRoutes = [
    { name: 'Login', urls: [`${BASE}/login`, `${BASE}/auth/login`, `${BASE}/store/login`, `${BASE}/sign-in`, `${BASE}/auth/sign-in`] },
    { name: 'Register', urls: [`${BASE}/register`, `${BASE}/auth/register`, `${BASE}/store/register`, `${BASE}/sign-up`, `${BASE}/auth/sign-up`] },
  ];
  for (const route of authRoutes) {
    let found = false;
    for (const url of route.urls) {
      const res = await page.goto(url, { waitUntil: 'networkidle' });
      const status = res?.status() ?? 0;
      await page.waitForTimeout(1000);
      const bodyText = await page.locator('body').innerText();
      const hasForm = await page.locator('input[type="email"], input[type="password"], form').count();
      if (status === 200 && (hasForm > 0 || bodyText.toLowerCase().includes('sign in') || bodyText.toLowerCase().includes('log in') || bodyText.toLowerCase().includes('register') || bodyText.toLowerCase().includes('sign up'))) {
        console.log(`[8] ${route.name}: FOUND at ${url} (HTTP ${status}, form elements: ${hasForm})`);
        await snap(page, `sanity-08-${route.name.toLowerCase()}.png`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`[8] ${route.name}: NOT FOUND at any tested URL`);
      await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const pattern = route.name === 'Login' ? /log in|sign in|login/i : /register|sign up|signup/i;
      const authLinks = await page.locator('a').filter({ hasText: pattern }).count();
      console.log(`[8] ${route.name} links on landing: ${authLinks}`);
      if (authLinks > 0) {
        const href = await page.locator('a').filter({ hasText: pattern }).first().getAttribute('href');
        console.log(`[8] ${route.name} link href: ${href}`);
      }
      await snap(page, `sanity-08-${route.name.toLowerCase()}-missing.png`);
    }
  }
});
