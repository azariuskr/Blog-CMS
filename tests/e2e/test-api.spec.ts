import { test } from '@playwright/test';
const BASE = 'http://172.20.0.9:3000/template';

test('debug detail page rendering', async ({ page }) => {
	page.on('console', msg => console.log('BROWSER:', msg.text()));

	await page.goto(`${BASE}/store/products/classic-tee`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(3000);

	// Dump the product data from the page using __TSR_DEHYDRATED
	const productData = await page.evaluate(() => {
		// Try to find the product data in the page
		const win = window as any;
		
		// Check __TSR_DEHYDRATED for SSR data
		if (win.__TSR_DEHYDRATED) {
			return { type: 'TSR', data: JSON.stringify(win.__TSR_DEHYDRATED).slice(0, 3000) };
		}
		
		// Try to get from React internals
		const rootEl = document.getElementById('root');
		if (rootEl) {
			const fiber = (rootEl as any)._reactRootContainer;
			return { type: 'root', fiber: !!fiber };
		}
		return { type: 'nothing' };
	});
	console.log('Product data:', JSON.stringify(productData, null, 2));

	// Check what's actually in the product detail area
	const detailHtml = await page.evaluate(() => {
		const container = document.querySelector('.sf-container.py-8');
		if (!container) return 'No .sf-container.py-8 found';
		
		// Get the image gallery section
		const grid = container.querySelector('.grid');
		if (!grid) return 'No grid found in container';
		
		const spaceY4 = grid.querySelector('.space-y-4');
		if (!spaceY4) return 'No .space-y-4 found';
		
		return spaceY4.innerHTML.slice(0, 2000);
	});
	console.log('Detail gallery HTML:', detailHtml);
	
	// Check for any images inside the product detail specifically
	const detailImgs = await page.evaluate(() => {
		const container = document.querySelector('.sf-container.py-8');
		if (!container) return [];
		const imgs = container.querySelectorAll('img');
		return Array.from(imgs).map((img, i) => ({
			i,
			src: (img as HTMLImageElement).src,
			className: img.className,
		}));
	});
	console.log('Detail page images:', JSON.stringify(detailImgs, null, 2));

	// Check if there's a ShoppingBag icon (fallback when no image)
	const hasFallback = await page.evaluate(() => {
		const container = document.querySelector('.sf-container.py-8');
		if (!container) return 'no container';
		const svg = container.querySelector('.aspect-square svg');
		return svg ? 'YES - ShoppingBag fallback SVG is shown' : 'NO - no fallback SVG';
	});
	console.log('Fallback icon:', hasFallback);

	await page.screenshot({ path: '/tmp/screenshots/40-detail-debug.png', fullPage: true });
});
