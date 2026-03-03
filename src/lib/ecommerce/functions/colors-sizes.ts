/**
 * Color & Size Server Functions
 *
 * Admin CRUD for product colors and sizes used in variant management.
 */

import { createServerFn } from "@tanstack/react-start";
import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { productColor, productSize, productVariant } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";

// =============================================================================
// Schemas
// =============================================================================

const CreateColorSchema = z.object({
	name: z.string().min(1).max(50),
	hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color (#RRGGBB)"),
	sortOrder: z.number().int().min(0).optional(),
});

const UpdateColorSchema = z.object({
	id: zId,
	name: z.string().min(1).max(50).optional(),
	hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
	sortOrder: z.number().int().min(0).optional(),
});

const DeleteColorSchema = z.object({ id: zId });

const CreateSizeSchema = z.object({
	name: z.string().min(1).max(20),
	sizeCategory: z.enum(["clothing", "shoes", "accessories", "one_size"]),
	sortOrder: z.number().int().min(0).optional(),
});

const UpdateSizeSchema = z.object({
	id: zId,
	name: z.string().min(1).max(20).optional(),
	sizeCategory: z.enum(["clothing", "shoes", "accessories", "one_size"]).optional(),
	sortOrder: z.number().int().min(0).optional(),
});

const DeleteSizeSchema = z.object({ id: zId });

// =============================================================================
// Color Functions
// =============================================================================

/**
 * Get all colors (for dropdowns and admin list)
 */
export const $getColors = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { products: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			const colors = await db
				.select({
					id: productColor.id,
					name: productColor.name,
					hexCode: productColor.hexCode,
					sortOrder: productColor.sortOrder,
					createdAt: productColor.createdAt,
					variantCount: count(productVariant.id),
				})
				.from(productColor)
				.leftJoin(productVariant, eq(productVariant.colorId, productColor.id))
				.groupBy(productColor.id)
				.orderBy(asc(productColor.sortOrder), asc(productColor.name));

			return colors;
		});
	});

/**
 * Create a new color
 */
export const $adminCreateColor = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateColorSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const existing = await db.query.productColor.findFirst({
				where: eq(productColor.name, data.data.name),
			});
			if (existing) throw { status: 400, message: "A color with this name already exists" };

			const [newColor] = await db
				.insert(productColor)
				.values({
					name: data.data.name,
					hexCode: data.data.hexCode,
					sortOrder: data.data.sortOrder ?? 0,
				})
				.returning();

			return newColor;
		}, { successMessage: "Color created" });
	});

/**
 * Update an existing color
 */
export const $adminUpdateColor = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpdateColorSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { id, ...updates } = data.data;

			if (updates.name) {
				const existing = await db.query.productColor.findFirst({
					where: eq(productColor.name, updates.name),
				});
				if (existing && existing.id !== id) {
					throw { status: 400, message: "A color with this name already exists" };
				}
			}

			const [updated] = await db
				.update(productColor)
				.set(updates)
				.where(eq(productColor.id, id))
				.returning();

			return updated;
		}, { successMessage: "Color updated" });
	});

/**
 * Delete a color (blocks if used by variants)
 */
export const $adminDeleteColor = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(DeleteColorSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const [{ cnt }] = await db
				.select({ cnt: count() })
				.from(productVariant)
				.where(eq(productVariant.colorId, data.data.id));

			if (Number(cnt) > 0) {
				throw { status: 400, message: `Cannot delete: ${cnt} variants use this color` };
			}

			await db.delete(productColor).where(eq(productColor.id, data.data.id));
			return { success: true };
		}, { successMessage: "Color deleted" });
	});

// =============================================================================
// Size Functions
// =============================================================================

/**
 * Get all sizes (optionally filtered by category)
 */
export const $getSizes = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		z.object({
			category: z.enum(["clothing", "shoes", "accessories", "one_size"]).optional(),
		}).parse(data),
	)
	.middleware([accessMiddleware({ permissions: { products: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const conditions = data.category
				? eq(productSize.sizeCategory, data.category)
				: undefined;

			const sizes = await db
				.select({
					id: productSize.id,
					name: productSize.name,
					sizeCategory: productSize.sizeCategory,
					sortOrder: productSize.sortOrder,
					createdAt: productSize.createdAt,
					variantCount: count(productVariant.id),
				})
				.from(productSize)
				.leftJoin(productVariant, eq(productVariant.sizeId, productSize.id))
				.where(conditions)
				.groupBy(productSize.id)
				.orderBy(asc(productSize.sizeCategory), asc(productSize.sortOrder), asc(productSize.name));

			return sizes;
		});
	});

/**
 * Create a new size
 */
export const $adminCreateSize = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateSizeSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const [newSize] = await db
				.insert(productSize)
				.values({
					name: data.data.name,
					sizeCategory: data.data.sizeCategory,
					sortOrder: data.data.sortOrder ?? 0,
				})
				.returning();

			return newSize;
		}, { successMessage: "Size created" });
	});

/**
 * Update a size
 */
export const $adminUpdateSize = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpdateSizeSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { id, ...updates } = data.data;
			const [updated] = await db
				.update(productSize)
				.set(updates)
				.where(eq(productSize.id, id))
				.returning();

			return updated;
		}, { successMessage: "Size updated" });
	});

/**
 * Delete a size (blocks if used by variants)
 */
export const $adminDeleteSize = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(DeleteSizeSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const [{ cnt }] = await db
				.select({ cnt: count() })
				.from(productVariant)
				.where(eq(productVariant.sizeId, data.data.id));

			if (Number(cnt) > 0) {
				throw { status: 400, message: `Cannot delete: ${cnt} variants use this size` };
			}

			await db.delete(productSize).where(eq(productSize.id, data.data.id));
			return { success: true };
		}, { successMessage: "Size deleted" });
	});
