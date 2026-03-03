/**
 * Product Image Server Functions
 *
 * Admin functions for managing product images:
 * - Add image to product (from URL or uploaded file)
 * - Delete product image
 * - Reorder product images
 * - Set primary image
 */

import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { product, productImage } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";

// =============================================================================
// Schemas
// =============================================================================

const AddProductImageSchema = z.object({
	productId: zId,
	url: z.string().min(1),
	altText: z.string().optional(),
	isPrimary: z.boolean().optional(),
	variantId: zId.optional(),
});

const AssignImageVariantSchema = z.object({
	imageId: zId,
	variantId: zId.nullable().optional(),
	colorId: zId.nullable().optional(),
});

const DeleteProductImageSchema = z.object({
	imageId: zId,
});

const SetPrimaryImageSchema = z.object({
	imageId: zId,
	productId: zId,
});

const ReorderProductImagesSchema = z.object({
	productId: zId,
	imageIds: z.array(zId),
});

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Add an image to a product
 */
export const $adminAddProductImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(AddProductImageSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { productId, url, altText, isPrimary, variantId } = data.data;

			// Verify product exists
			const existing = await db.query.product.findFirst({
				where: eq(product.id, productId),
				columns: { id: true },
			});
			if (!existing) throw { status: 404, message: "Product not found" };

			// Get current max sort order
			const [maxSort] = await db
				.select({ max: sql<number>`COALESCE(MAX(${productImage.sortOrder}), -1)` })
				.from(productImage)
				.where(eq(productImage.productId, productId));

			const sortOrder = (maxSort?.max ?? -1) + 1;

			// If this is the first image or explicitly set as primary, handle primary flag
			if (isPrimary) {
				await db
					.update(productImage)
					.set({ isPrimary: false })
					.where(eq(productImage.productId, productId));
			}

			const [newImage] = await db
				.insert(productImage)
				.values({
					productId,
					url,
					altText: altText ?? null,
					isPrimary: isPrimary ?? sortOrder === 0,
					sortOrder,
					variantId: variantId ?? null,
				})
				.returning();

			return newImage;
		}, { successMessage: "Image added to product" });
	});

/**
 * Delete a product image
 */
export const $adminDeleteProductImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(DeleteProductImageSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { imageId } = data.data;

			const existing = await db.query.productImage.findFirst({
				where: eq(productImage.id, imageId),
			});
			if (!existing) throw { status: 404, message: "Image not found" };

			await db.delete(productImage).where(eq(productImage.id, imageId));

			// If deleted image was primary, make the next one primary
			if (existing.isPrimary) {
				const [next] = await db
					.select({ id: productImage.id })
					.from(productImage)
					.where(eq(productImage.productId, existing.productId))
					.orderBy(asc(productImage.sortOrder))
					.limit(1);

				if (next) {
					await db
						.update(productImage)
						.set({ isPrimary: true })
						.where(eq(productImage.id, next.id));
				}
			}

			return { success: true };
		}, { successMessage: "Image deleted" });
	});

/**
 * Set an image as the primary image for a product
 */
export const $adminSetPrimaryImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(SetPrimaryImageSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { imageId, productId } = data.data;

			// Unset all primary flags for this product
			await db
				.update(productImage)
				.set({ isPrimary: false })
				.where(
					and(
						eq(productImage.productId, productId),
						ne(productImage.id, imageId),
					),
				);

			// Set this image as primary
			await db
				.update(productImage)
				.set({ isPrimary: true })
				.where(eq(productImage.id, imageId));

			return { success: true };
		}, { successMessage: "Primary image updated" });
	});

/**
 * Reorder product images by providing ordered image IDs
 */
export const $adminReorderProductImages = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ReorderProductImagesSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { productId, imageIds } = data.data;

			// Update sort_order for each image
			await db.transaction(async (tx) => {
				for (let i = 0; i < imageIds.length; i++) {
					await tx
						.update(productImage)
						.set({ sortOrder: i })
						.where(
							and(
								eq(productImage.id, imageIds[i]),
								eq(productImage.productId, productId),
							),
						);
				}
			});

			return { success: true };
		}, { successMessage: "Image order updated" });
	});

/**
 * Assign (or unassign) an image to a product variant
 */
export const $adminAssignImageToVariant = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(AssignImageVariantSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		const hasLink = data.ok ? (data.data.variantId || data.data.colorId) : false;
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { imageId, variantId, colorId } = data.data;

			const existing = await db.query.productImage.findFirst({
				where: eq(productImage.id, imageId),
				columns: { id: true },
			});
			if (!existing) throw { status: 404, message: "Image not found" };

			// Color-based linking: set colorId, clear variantId
			// Variant-based linking: set variantId, clear colorId
			// Unlinking: clear both
			if (colorId !== undefined) {
				await db
					.update(productImage)
					.set({ colorId, variantId: null })
					.where(eq(productImage.id, imageId));
			} else {
				await db
					.update(productImage)
					.set({ variantId: variantId ?? null, colorId: null })
					.where(eq(productImage.id, imageId));
			}

			return { success: true };
		}, { successMessage: hasLink ? "Image linked" : "Image unlinked" });
	});
