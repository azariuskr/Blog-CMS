import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://172.19.0.8:3000/template';
const SCREENSHOTS = './storefront-screenshots';
mkdirSync(SCREENSHOTS, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Intercept network requests to see what's being sent
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('addToCart') || req.url().includes('toggleWishlist') || req.method() === 'POST') {
      requests.push({ url: req.url(), method: req.method(), postData: req.postData()?.substring(0, 500) });
    }
  });

  const responses = [];
  page.on('response', async res => {
    if (res.url().includes('addToCart') || res.url().includes('toggleWishlist') || (res.request().method() === 'POST' && res.status() >= 400)) {
      try {
        const body = await res.text();
        responses.push({ url: res.url(), status: res.status(), body: body.substring(0, 500) });
      } catch { }
    }
  });

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // TEST A: Product detail page Add to Cart
  console.log('=== TEST A: Product Detail Add to Cart ===');
  await page.goto(`${BASE}/store/products/classic-tshirt`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check what variants are available
  const variantInfo = await page.evaluate(() => {
    // Look for variant buttons or selectors on the page
    const buttons = document.querySelectorAll('button');
    const btns = [];
    buttons.forEach(b => btns.push(b.textContent?.trim()?.substring(0, 50)));
    return btns;
  });
  console.log('Buttons on page:', variantInfo.filter(b => b && b.length < 30).slice(0, 20));

  // Click Add to Cart
  const addBtn = page.locator('button:has-text("Add to Cart")').first();
  if (await addBtn.count() > 0) {
    console.log('Clicking Add to Cart...');
    await addBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/debug-cart-detail.png`, fullPage: true });
  } else {
    console.log('No Add to Cart button found');
  }

  // TEST B: Quick Add from catalog card
  console.log('\n=== TEST B: Catalog Quick Add ===');
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Hover first card
  const firstCard = page.locator('.sf-card').first();
  await firstCard.hover();
  await page.waitForTimeout(500);

  // Get defaultVariantId from page context
  const cardVariantId = await page.evaluate(() => {
    // Check if the Add button has any data attributes
    const addBtns = document.querySelectorAll('.sf-card button');
    return Array.from(addBtns).map(b => ({
      text: b.textContent?.trim(),
      disabled: b.disabled,
      onclick: b.getAttribute('onclick'),
    }));
  });
  console.log('Card buttons:', JSON.stringify(cardVariantId.slice(0, 6), null, 2));

  const quickAddBtn = firstCard.locator('button:has-text("Add")').first();
  if (await quickAddBtn.count() > 0) {
    const isDisabled = await quickAddBtn.isDisabled();
    console.log(`Quick Add button found, disabled=${isDisabled}`);
    if (!isDisabled) {
      console.log('Clicking Quick Add...');
      await quickAddBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREENSHOTS}/debug-cart-quick.png`, fullPage: true });
    }
  }

  // TEST C: Wishlist toggle from catalog
  console.log('\n=== TEST C: Wishlist Toggle ===');
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const card2 = page.locator('.sf-card').nth(1);
  await card2.hover();
  await page.waitForTimeout(500);

  const heartBtn = card2.locator('button').first();
  if (await heartBtn.count() > 0) {
    console.log('Clicking heart button...');
    await heartBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/debug-wishlist.png`, fullPage: true });
  }

  // Print captured network data
  console.log('\n=== NETWORK REQUESTS (POST) ===');
  requests.forEach(r => console.log(`  ${r.method} ${r.url}\n    Body: ${r.postData}`));

  console.log('\n=== NETWORK RESPONSES (errors) ===');
  responses.forEach(r => console.log(`  ${r.status} ${r.url}\n    Body: ${r.body}`));

  // Print toasts
  const toasts = await page.locator('[data-sonner-toast]').all();
  console.log(`\n=== TOASTS (${toasts.length}) ===`);
  for (const t of toasts) {
    const type = await t.getAttribute('data-type');
    const text = await t.textContent();
    console.log(`  [${type}] ${text}`);
  }

  // Print relevant console messages
  const errors = consoleMessages.filter(m => m.type === 'error' || m.text.includes('UUID') || m.text.includes('uuid'));
  console.log(`\n=== CONSOLE ERRORS (${errors.length}) ===`);
  errors.forEach(e => console.log(`  [${e.type}] ${e.text}`));

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
