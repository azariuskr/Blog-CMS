import { test } from '@playwright/test';
const BASE = 'http://172.20.0.9:3000/template';

test('test image switching on color click', async ({ page }) => {
	page.on('console', msg => console.log('BROWSER:', msg.text()));

	await page.goto(`${BASE}/store/products/classic-tee`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(2000);

	// Correct selector: img with class aspect-square inside .space-y-4
	const mainImg = page.locator('.space-y-4 img.aspect-square');
	const initialSrc = await mainImg.getAttribute('src');
	console.log('Initial main image src:', initialSrc);

	// Get thumbnails
	const thumbs = page.locator('.space-y-4 .flex.gap-3 img');
	const thumbCount = await thumbs.count();
	console.log('Thumbnail count:', thumbCount);
	for (let i = 0; i < thumbCount; i++) {
		const src = await thumbs.nth(i).getAttribute('src');
		console.log(`  Thumb ${i}: ${src}`);
	}

	await page.screenshot({ path: '/tmp/screenshots/50-initial.png' });

	// Get color buttons
	const colorBtns = page.locator('h4:has-text("Color") + div button');
	const colorCount = await colorBtns.count();
	console.log('Color buttons:', colorCount);

	if (colorCount >= 2) {
		// Click Gray (index 1)
		console.log('--- Clicking Gray ---');
		await colorBtns.nth(1).click();
		await page.waitForTimeout(1500);
		
		const grayMainSrc = await mainImg.getAttribute('src');
		console.log('After Gray click, main image:', grayMainSrc);
		console.log('Image changed?', grayMainSrc !== initialSrc);
		
		const grayThumbCount = await thumbs.count();
		console.log('Gray thumb count:', grayThumbCount);
		for (let i = 0; i < grayThumbCount; i++) {
			const src = await thumbs.nth(i).getAttribute('src');
			console.log(`  Gray Thumb ${i}: ${src}`);
		}

		await page.screenshot({ path: '/tmp/screenshots/51-gray.png' });

		// Click Purple (index 0)
		console.log('--- Clicking Purple ---');
		await colorBtns.nth(0).click();
		await page.waitForTimeout(1500);
		
		const purpleMainSrc = await mainImg.getAttribute('src');
		console.log('After Purple click, main image:', purpleMainSrc);

		await page.screenshot({ path: '/tmp/screenshots/52-purple.png' });

		// Click Sage (index 2)
		console.log('--- Clicking Sage ---');
		await colorBtns.nth(2).click();
		await page.waitForTimeout(1500);
		
		const sageMainSrc = await mainImg.getAttribute('src');
		console.log('After Sage click, main image:', sageMainSrc);

		await page.screenshot({ path: '/tmp/screenshots/53-sage.png' });

		// Deselect (click Sage again)
		console.log('--- Deselecting ---');
		await colorBtns.nth(2).click();
		await page.waitForTimeout(1500);
		
		const deselectedSrc = await mainImg.getAttribute('src');
		console.log('After deselect, main image:', deselectedSrc);
		
		const allThumbCount = await thumbs.count();
		console.log('All thumbs after deselect:', allThumbCount);

		await page.screenshot({ path: '/tmp/screenshots/54-deselected.png' });
	}

	// Also dump product variant data from React state
	const variantData = await page.evaluate(() => {
		// Access the TanStack Router to get the query data
		const w = window as any;
		const router = w.__TSR_ROUTER__;
		if (!router) return 'no router';
		
		// Try to get the query client
		try {
			const queryClient = router.options?.context?.queryClient;
			if (!queryClient) return 'no queryClient';
			const cache = queryClient.getQueryCache();
			const queries = cache.getAll();
			const productQuery = queries.find((q: any) => 
				q.queryKey?.includes('product') && q.queryKey?.includes('classic-tee')
			);
			if (!productQuery) return 'no product query found';
			const data = productQuery.state?.data;
			if (!data?.ok) return { ok: false, data };
			
			const product = data.data;
			return {
				name: product.name,
				imageCount: product.images?.length,
				images: product.images?.map((i: any) => ({ url: i.url, variantId: i.variantId })),
				variantCount: product.variants?.length,
				variants: product.variants?.map((v: any) => ({
					id: v.id?.slice(-4),
					color: v.color?.name,
					size: v.size?.name,
					imageCount: v.images?.length,
					images: v.images?.map((i: any) => i.url),
				})),
			};
		} catch (e: any) {
			return 'error: ' + e.message;
		}
	});
	console.log('Variant data from React:', JSON.stringify(variantData, null, 2));
});
