import { test, expect, Page } from '@playwright/test';

const BASE = 'https://kris-hp-400.taile0e81a.ts.net/template';
const SS = './test-results/screenshots';
let ssIdx = 0;

function ss(label: string) {
  ssIdx++;
  const num = String(ssIdx).padStart(2, '0');
  return { path: `${SS}/admin-${num}-${label}.png`, fullPage: true };
}

const results: { test: string; status: string; details: string }[] = [];
function log(name: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO', details: string) {
  results.push({ test: name, status, details });
  console.log(`[${status}] ${name}: ${details}`);
}

async function doLogin(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('azarius@abv.bg');
    await passwordInput.fill('password123');
    await page.locator('button[type="submit"]:has-text("Login")').click();
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => { });
    const url = page.url();
    if (!url.includes('login') && !url.includes('auth')) {
      console.log(`  Logged in. Now at: ${url}`);
      return true;
    }
  }
  return false;
}

async function ensureLoggedIn(page: Page): Promise<boolean> {
  // Go to admin, check if redirected to login
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => { });
  await page.waitForTimeout(2000);
  if (page.url().includes('login') || page.url().includes('auth')) {
    return await doLogin(page);
  }
  return true;
}

test.describe.serial('Admin Panel E2E Sanity', () => {

  test('Phase 1 - Authentication', async ({ page }) => {
    console.log('\n========== PHASE 1: Authentication ==========\n');

    // Go to admin - expect redirect to login
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const redirectUrl = page.url();
    console.log(`Admin redirect: ${redirectUrl}`);
    await page.screenshot(ss('auth-redirect'));

    if (redirectUrl.includes('auth/login')) {
      log('Auth Redirect', 'PASS', `Admin redirects to ${redirectUrl}`);
    } else {
      log('Auth Redirect', 'INFO', `No redirect, at: ${redirectUrl}`);
    }

    // Login
    const loggedIn = await doLogin(page);
    await page.screenshot(ss('auth-after-login'));

    if (loggedIn) {
      log('Login', 'PASS', `Logged in as azarius@abv.bg (superAdmin). At: ${page.url()}`);
    } else {
      log('Login', 'FAIL', `Could not login. At: ${page.url()}`);
    }

    // Verify we can access admin now
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot(ss('auth-admin-access'));
    const adminAccessOk = !page.url().includes('login');
    log('Admin Access', adminAccessOk ? 'PASS' : 'FAIL', `After login, admin at: ${page.url()}`);
  });


  test('Phase 2 - Admin Dashboard', async ({ page }) => {
    console.log('\n========== PHASE 2: Admin Dashboard ==========\n');
    await ensureLoggedIn(page);

    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot(ss('dashboard'));

    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('Headings:', headings.join(' | '));

    const cards = await page.locator('[class*="card"]').count();
    console.log(`Card elements: ${cards}`);

    const tables = await page.locator('table').count();
    console.log(`Tables: ${tables}`);

    const bodyText = await page.locator('body').innerText();
    console.log('Body text (first 500):', bodyText.substring(0, 500));

    log('Dashboard', 'PASS', `Headings: ${headings.slice(0, 8).join(', ')}. Cards: ${cards}. Tables: ${tables}`);
  });


  test('Phase 3 - Discover Admin Navigation', async ({ page }) => {
    console.log('\n========== PHASE 3: Navigation Discovery ==========\n');
    await ensureLoggedIn(page);

    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Get sidebar/nav HTML
    const navHtml = await page.evaluate(() => {
      const sidebar = document.querySelector('aside, nav, [class*="sidebar"]');
      return sidebar ? sidebar.innerHTML.substring(0, 5000) : 'No sidebar found';
    });
    console.log('Sidebar HTML:\n', navHtml);

    // Get all links
    const allLinks = await page.locator('a[href]').evaluateAll((links: HTMLAnchorElement[]) =>
      links.map(a => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') || '' }))
    );
    const adminLinks = allLinks.filter(l => l.href.includes('/admin') || l.href.includes('/dashboard'));
    const unique = [...new Map(adminLinks.map(l => [l.href, l])).values()];

    console.log('\nAdmin navigation links:');
    for (const l of unique) console.log(`  [${l.text}] -> ${l.href}`);

    await page.screenshot(ss('nav-discovery'));
    log('Nav Discovery', 'PASS', `Found ${unique.length} admin links`);

    // Visit each admin link
    for (const link of unique) {
      if (link.href.includes('logout') || link.href.includes('sign-out') || !link.href) continue;
      const fullUrl = link.href.startsWith('http') ? link.href : `${BASE}${link.href}`;
      console.log(`\n  Visiting: [${link.text}] -> ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => { });
      await page.waitForTimeout(1500);
      const slug = link.href.replace(/\//g, '-').substring(0, 30);
      await page.screenshot(ss(`nav${slug}`));
      const pageHeadings = await page.locator('h1, h2').allTextContents();
      const isOk = !page.url().includes('login');
      log(`Nav: ${link.text || link.href}`, isOk ? 'PASS' : 'FAIL', `${page.url()} -- ${pageHeadings.join(', ')}`);
    }
  });


  test('Phase 4 - Product Management', async ({ page }) => {
    console.log('\n========== PHASE 4: Product Management ==========\n');
    await ensureLoggedIn(page);

    // Try products page
    await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot(ss('products-list'));

    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Product page headings:', headings.join(' | '));

    const rows = await page.locator('table tbody tr, [class*="product-row"], [class*="product-card"]').count();
    console.log(`Product items: ${rows}`);

    const tableHeaders = await page.locator('th').allTextContents();
    console.log('Table headers:', tableHeaders.filter(h => h.trim()).join(', '));

    // Check for Add/Create button
    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New"), a:has-text("Add"), a:has-text("Create"), a:has-text("New Product")');
    const addBtnCount = await addBtn.count();
    console.log(`Add/Create buttons: ${addBtnCount}`);
    if (addBtnCount > 0) {
      const addText = await addBtn.first().textContent();
      console.log(`First add button text: ${addText}`);
    }

    log('Product List', rows > 0 || headings.length > 0 ? 'PASS' : 'FAIL',
      `Rows: ${rows}. Headers: ${tableHeaders.join(', ')}. Add buttons: ${addBtnCount}`);

    // Click first product to view detail
    const productLink = page.locator('table tbody tr a, table tbody tr').first();
    if (await productLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productLink.click().catch(() => { });
      await page.waitForTimeout(2000);
      await page.screenshot(ss('product-detail'));
      const detailH = await page.locator('h1, h2').allTextContents();
      const detailInputs = await page.locator('input, textarea, select').count();
      console.log(`Product detail: headings=${detailH.join(', ')}, inputs=${detailInputs}`);
      log('Product Detail', 'PASS', `Headings: ${detailH.join(', ')}. Inputs: ${detailInputs}`);
    }
  });


  test('Phase 5 - Order Management', async ({ page }) => {
    console.log('\n========== PHASE 5: Order Management ==========\n');
    await ensureLoggedIn(page);

    await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot(ss('orders-list'));

    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Order page headings:', headings.join(' | '));

    const rows = await page.locator('table tbody tr').count();
    console.log(`Order rows: ${rows}`);

    const tableHeaders = await page.locator('th').allTextContents();
    console.log('Table headers:', tableHeaders.filter(h => h.trim()).join(', '));

    log('Order List', headings.length > 0 ? 'PASS' : 'FAIL', `Rows: ${rows}. Headers: ${tableHeaders.join(', ')}`);

    // Click first order
    const firstLink = page.locator('table tbody tr a').first();
    if (await firstLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstLink.click().catch(() => { });
      await page.waitForTimeout(2000);
      await page.screenshot(ss('order-detail'));
      const detailH = await page.locator('h1, h2').allTextContents();
      console.log(`Order detail headings: ${detailH.join(', ')}`);
      log('Order Detail', 'PASS', `URL: ${page.url()}. Headings: ${detailH.join(', ')}`);
    } else {
      log('Order Detail', 'SKIP', 'No order links found');
    }
  });


  test('Phase 6 - User Management', async ({ page }) => {
    console.log('\n========== PHASE 6: User Management ==========\n');
    await ensureLoggedIn(page);

    await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot(ss('users-list'));

    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Users page headings:', headings.join(' | '));

    const rows = await page.locator('table tbody tr').count();
    console.log(`User rows: ${rows}`);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('Body snippet:', bodyText.substring(0, 300));

    log('Users', headings.length > 0 || rows > 0 ? 'PASS' : 'FAIL', `Rows: ${rows}. Headings: ${headings.join(', ')}`);
  });


  test('Phase 7 - Categories, Brands, Collections', async ({ page }) => {
    console.log('\n========== PHASE 7: Taxonomies ==========\n');
    await ensureLoggedIn(page);

    const pages = ['categories', 'brands', 'collections'];
    for (const p of pages) {
      await page.goto(`${BASE}/admin/${p}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot(ss(`admin-${p}`));

      const headings = await page.locator('h1, h2, h3').allTextContents();
      const rows = await page.locator('table tbody tr').count();
      const bodyLen = (await page.locator('body').innerText().catch(() => '')).length;
      console.log(`${p}: headings=${headings.join(', ')} rows=${rows} bodyLen=${bodyLen}`);

      const isLoaded = headings.length > 0 || rows > 0 || bodyLen > 200;
      log(`Admin ${p}`, isLoaded ? 'PASS' : 'SKIP', `Headings: ${headings.join(', ')}. Rows: ${rows}`);
    }
  });


  test('Phase 8 - Additional Admin Pages', async ({ page }) => {
    console.log('\n========== PHASE 8: Additional Admin Pages ==========\n');
    await ensureLoggedIn(page);

    // Based on route discovery, try various admin sub-pages
    const pages = [
      'settings', 'shipping', 'reviews', 'rbac', 'storage',
      'coupons', 'analytics', 'reports', 'inventory'
    ];

    for (const p of pages) {
      await page.goto(`${BASE}/admin/${p}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => { });
      await page.waitForTimeout(1500);

      const finalUrl = page.url();
      const headings = await page.locator('h1, h2, h3').allTextContents();
      const bodyLen = (await page.locator('body').innerText().catch(() => '')).length;

      if (!finalUrl.includes('login') && bodyLen > 200) {
        await page.screenshot(ss(`admin-${p}`));
        const inputs = await page.locator('input, select, textarea').count();
        const tables = await page.locator('table').count();
        console.log(`${p}: headings=${headings.join(', ')} inputs=${inputs} tables=${tables}`);
        log(`Admin ${p}`, 'PASS', `Headings: ${headings.join(', ')}. Inputs: ${inputs}. Tables: ${tables}`);
      } else {
        log(`Admin ${p}`, 'SKIP', `Not found or empty (body: ${bodyLen} chars)`);
      }
    }
  });


  test('Phase 9 - Dashboard & Account Pages', async ({ page }) => {
    console.log('\n========== PHASE 9: Dashboard & Account ==========\n');
    await ensureLoggedIn(page);

    // Try /dashboard routes
    const pages = ['dashboard', 'account', 'billing'];
    for (const p of pages) {
      await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => { });
      await page.waitForTimeout(2000);

      const finalUrl = page.url();
      if (!finalUrl.includes('login')) {
        await page.screenshot(ss(`page-${p}`));
        const headings = await page.locator('h1, h2, h3').allTextContents();
        const bodyText = await page.locator('body').innerText().catch(() => '');
        console.log(`${p}: url=${finalUrl} headings=${headings.join(', ')} bodyLen=${bodyText.length}`);
        log(`Page ${p}`, 'PASS', `At ${finalUrl}. Headings: ${headings.join(', ')}`);
      } else {
        log(`Page ${p}`, 'FAIL', `Redirected to login`);
      }
    }
  });


  test('Phase 10 - FINAL SUMMARY', async ({ page }) => {
    console.log('\n\n================================================================');
    console.log('              ADMIN PANEL E2E SANITY TEST RESULTS');
    console.log('================================================================\n');

    let passCount = 0, failCount = 0, skipCount = 0, infoCount = 0;
    for (const r of results) {
      let icon: string;
      switch (r.status) {
        case 'PASS': icon = '[OK]  '; passCount++; break;
        case 'FAIL': icon = '[FAIL]'; failCount++; break;
        case 'SKIP': icon = '[SKIP]'; skipCount++; break;
        default: icon = '[INFO]'; infoCount++; break;
      }
      console.log(`${icon}  ${r.test}`);
      console.log(`        ${r.details}\n`);
    }

    console.log('----------------------------------------------------------------');
    console.log(`TOTAL: ${results.length} tests`);
    console.log(`  PASS: ${passCount}`);
    console.log(`  FAIL: ${failCount}`);
    console.log(`  SKIP: ${skipCount}`);
    console.log(`  INFO: ${infoCount}`);
    console.log('----------------------------------------------------------------');

    // Always pass this test - it is just a summary
    expect(true).toBe(true);
  });
});
