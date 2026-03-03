import { test } from '@playwright/test';
const BASE = 'http://172.20.0.9:3000/template';

test('test Essential Hoodie image switching', async ({ page }) => {
	await page.goto(`${BASE}/store/products/essential-hoodie`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(2000);

	const mainImg = page.locator('.space-y-4 img.aspect-square');
	const initialSrc = await mainImg.getAttribute('src');
	console.log('Initial:', initialSrc);

	const colorBtns = page.locator('h4:has-text("Color") + div button');
	const count = await colorBtns.count();
	console.log('Colors:', count);

	for (let i = 0; i < count; i++) {
		const title = await colorBtns.nth(i).getAttribute('title');
		await colorBtns.nth(i).click();
		await page.waitForTimeout(1000);
		const src = await mainImg.getAttribute('src');
		console.log(`After ${title} click: ${src}`);
		await page.screenshot({ path: `/tmp/screenshots/60-hoodie-${i}.png` });
	}
});

test('test Colorblock Hoodie image switching', async ({ page }) => {
	await page.goto(`${BASE}/store/products/colorblock-hoodie`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(2000);

	const mainImg = page.locator('.space-y-4 img.aspect-square');
	const initialSrc = await mainImg.getAttribute('src');
	console.log('Initial:', initialSrc);

	const colorBtns = page.locator('h4:has-text("Color") + div button');
	const count = await colorBtns.count();
	console.log('Colors:', count);

	for (let i = 0; i < count; i++) {
		const title = await colorBtns.nth(i).getAttribute('title');
		await colorBtns.nth(i).click();
		await page.waitForTimeout(1000);
		const src = await mainImg.getAttribute('src');
		console.log(`After ${title} click: ${src}`);
	}
});
