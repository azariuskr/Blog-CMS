import { test } from '@playwright/test';
const BASE = 'http://172.20.0.9:3000/template';

test('check server data', async ({ page }) => {
	page.on('console', msg => console.log('BROWSER:', msg.text()));

	await page.goto(`${BASE}/store/products/classic-tee`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(3000);

	// Get the dehydrated data
	const data = await page.evaluate(() => {
		const scripts = document.querySelectorAll('script');
		for (const s of scripts) {
			if (s.textContent && s.textContent.includes('__TSR')) {
				return s.textContent.slice(0, 5000);
			}
		}
		
		// Also check window
		const w = window as any;
		const keys = Object.keys(w).filter(k => k.startsWith('__'));
		return { windowKeys: keys };
	});
	console.log('TSR Data:', typeof data === 'string' ? data.slice(0, 3000) : JSON.stringify(data));

	// Try intercepting the server function call
	const galleryHtml = await page.evaluate(() => {
		const spaceY4 = document.querySelector('.space-y-4');
		if (!spaceY4) return 'NO .space-y-4';
		return spaceY4.innerHTML.slice(0, 1500);
	});
	console.log('Gallery HTML:', galleryHtml);

	// Check specifically for the product images vs currentImage
	const debugInfo = await page.evaluate(() => {
		// Look for any element with rounded-[2.5rem]
		const rounded = document.querySelector('[class*="rounded-[2.5rem]"]');
		if (!rounded) return 'No rounded-[2.5rem] element';
		return {
			className: rounded.className,
			innerHTML: rounded.innerHTML.slice(0, 500),
			childCount: rounded.children.length,
		};
	});
	console.log('Rounded element:', JSON.stringify(debugInfo, null, 2));
});
