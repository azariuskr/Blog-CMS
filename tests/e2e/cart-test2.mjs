import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://172.19.0.8:3000/template';
const SCREENSHOTS = './storefront-screenshots';
mkdirSync(SCREENSHOTS, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Log all network errors
  page.on('response', async res => {
    if (res.status() >= 400) {
      const url = res.url();
      try {
        const body = await res.text();
        console.log(`  [NET ${res.status()}] ${url.substring(0, 100)}`);
        if (body.length < 300) console.log(`    Body: ${body}`);
      } catch { }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404')) {
      console.log(`  [CONSOLE ${msg.type()}] ${msg.text().substring(0, 200)}`);
    }
  });

  // ========================================
  // Navigate directly to a product with known variants
  // ========================================
  console.log('\n--- Test: Direct nav to classic-tshirt ---');
  await page.goto(`${BASE}/store/products/classic-tshirt`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Clear any existing toasts
  const existingToasts = await page.locator('[data-sonner-toast]').count();
  console.log(`Existing toasts before action: ${existingToasts}`);

  // Click Add to Cart
  const addBtn = page.locator('button:has-text("Add to Cart")').first();
  if (await addBtn.count() > 0 && !(await addBtn.isDisabled())) {
    console.log('Clicking Add to Cart...');
    await addBtn.click();
    await page.waitForTimeout(3000);

    const toasts = await page.locator('[data-sonner-toast]').all();
    for (const t of toasts) {
      const type = await t.getAttribute('data-type');
      const text = await t.textContent();
      console.log(`  Toast [${type}]: ${text}`);
    }
  } else {
    console.log('Add to Cart button not found or disabled');
  }

  await page.screenshot({ path: `${SCREENSHOTS}/debug2-cart.png`, fullPage: true });

  // ========================================
  // Quick Add from catalog
  // ========================================
  console.log('\n--- Test: Quick Add from catalog ---');
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // First dismiss any toasts
  const firstCard = page.locator('.sf-card').first();
  await firstCard.hover();
  await page.waitForTimeout(800);

  const quickAdd = firstCard.locator('button:has-text("Add")').first();
  if (await quickAdd.count() > 0) {
    const disabled = await quickAdd.isDisabled();
    console.log(`Quick Add button found, disabled=${disabled}`);
    if (!disabled) {
      await quickAdd.click();
      await page.waitForTimeout(3000);

      const toasts = await page.locator('[data-sonner-toast]').all();
      for (const t of toasts) {
        const type = await t.getAttribute('data-type');
        const text = await t.textContent();
        console.log(`  Toast [${type}]: ${text}`);
      }
    }
  }

  await page.screenshot({ path: `${SCREENSHOTS}/debug2-quick.png`, fullPage: true });

  // ========================================
  // Category filter
  // ========================================
  console.log('\n--- Test: Category filter ---');
  await page.goto(`${BASE}/store/products`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const clothingBtn = page.locator('aside button:has-text("Clothing")').first();
  if (await clothingBtn.count() > 0) {
    await clothingBtn.click();
    // Wait longer for network request
    await page.waitForTimeout(3000);

    const text = await page.locator('text=/\\d+ products? found/').first().textContent();
    console.log(`After Clothing filter: ${text}`);

    const cards = await page.locator('.sf-card').count();
    console.log(`Cards shown: ${cards}`);

    await page.screenshot({ path: `${SCREENSHOTS}/debug2-category.png`, fullPage: true });
  }

  await browser.close();
  console.log('\nDone!');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
