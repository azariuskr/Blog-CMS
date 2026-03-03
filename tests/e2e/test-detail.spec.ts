import { test } from '@playwright/test';

const BASE = 'http://172.20.0.9:3000/template';

test('debug detail page image switching', async ({ page }) => {
	page.on('console', msg => console.log('BROWSER:', msg.text()));

	await page.goto(`${BASE}/store/products/classic-tee`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(4000);

	// Dump all images on page
	const allImgs = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('img')).map((img, i) => ({
			i,
			src: img.src,
			className: img.className,
			parentClass: img.parentElement?.className?.slice(0, 80),
		}));
	});
	console.log('All images on page:', JSON.stringify(allImgs, null, 2));

	// Get main image - try the big one in the gallery
	const mainImgSrc = await page.evaluate(() => {
		// The main image is inside .aspect-square inside .space-y-4
		const mainImg = document.querySelector('.space-y-4 .aspect-square img') as HTMLImageElement;
		return mainImg?.src || 'NOT FOUND';
	});
	console.log('Main image src:', mainImgSrc);

	await page.screenshot({ path: '/tmp/screenshots/30-initial.png' });

	// Check what product data looks like
	const productState = await page.evaluate(() => {
		// Try to find React fiber state
		const el = document.querySelector('[data-tsd-source*="$slug"]');
		return el ? 'found slug element' : 'no slug element';
	});
	console.log('Product element:', productState);

	// Get color buttons
	const colorBtns = page.locator('h4:has-text("Color") + div button');
	const colorCount = await colorBtns.count();
	console.log('Color button count:', colorCount);

	for (let i = 0; i < colorCount; i++) {
		const title = await colorBtns.nth(i).getAttribute('title');
		const style = await colorBtns.nth(i).getAttribute('style');
		console.log(`Color ${i}: ${title} (${style})`);
	}

	if (colorCount >= 2) {
		// Click the second color (Gray)
		console.log('--- Clicking Gray ---');
		await colorBtns.nth(1).click();
		await page.waitForTimeout(2000);

		const newSrc = await page.evaluate(() => {
			const mainImg = document.querySelector('.space-y-4 .aspect-square img') as HTMLImageElement;
			return mainImg?.src || 'NOT FOUND';
		});
		console.log('After Gray click, main image:', newSrc);

		// Check thumbnails
		const thumbs = await page.evaluate(() => {
			const thumbImgs = document.querySelectorAll('.space-y-4 .flex.gap-3 img');
			return Array.from(thumbImgs).map(img => (img as HTMLImageElement).src);
		});
		console.log('Thumbnails visible:', thumbs.length, thumbs);

		await page.screenshot({ path: '/tmp/screenshots/31-after-gray.png' });

		// Click first color (Purple)
		console.log('--- Clicking Purple ---');
		await colorBtns.nth(0).click();
		await page.waitForTimeout(2000);

		const purpleSrc = await page.evaluate(() => {
			const mainImg = document.querySelector('.space-y-4 .aspect-square img') as HTMLImageElement;
			return mainImg?.src || 'NOT FOUND';
		});
		console.log('After Purple click, main image:', purpleSrc);
		await page.screenshot({ path: '/tmp/screenshots/32-after-purple.png' });

		// Click third color (Sage)
		console.log('--- Clicking Sage ---');
		await colorBtns.nth(2).click();
		await page.waitForTimeout(2000);

		const sageSrc = await page.evaluate(() => {
			const mainImg = document.querySelector('.space-y-4 .aspect-square img') as HTMLImageElement;
			return mainImg?.src || 'NOT FOUND';
		});
		console.log('After Sage click, main image:', sageSrc);
		await page.screenshot({ path: '/tmp/screenshots/33-after-sage.png' });
	}
});
