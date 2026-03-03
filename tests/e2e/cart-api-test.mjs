import { chromium } from 'playwright';

const BASE = 'http://172.19.0.8:3000/template';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture the exact server function request and response
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('_serverFn')) {
      console.log(`\n>>> POST ${req.url()}`);
      console.log(`>>> Body: ${req.postData()}`);
    }
  });
  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('_serverFn')) {
      try {
        const body = await res.text();
        console.log(`<<< ${res.status()} Response: ${body.substring(0, 500)}`);
      } catch {}
    }
  });

  // Go to product detail
  await page.goto(`${BASE}/store/products/classic-tshirt`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Add to Cart
  const btn = page.locator('button:has-text("Add to Cart")').first();
  console.log('Add to Cart button found:', await btn.count() > 0);
  console.log('Add to Cart disabled:', await btn.isDisabled());

  await btn.click();
  await page.waitForTimeout(5000);

  // Check toasts
  const toasts = await page.locator('[data-sonner-toast]').all();
  for (const t of toasts) {
    const type = await t.getAttribute('data-type');
    const text = await t.textContent();
    console.log(`Toast [${type}]: ${text}`);
  }

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
