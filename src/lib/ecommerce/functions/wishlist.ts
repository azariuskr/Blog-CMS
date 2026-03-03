/**
 * Wishlist Server Functions
 *
 * Server functions for wishlist management:
 * - Get user's wishlist
 * - Toggle wishlist item (add/remove)
 * - Check if product is in wishlist
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { wishlist, product, productImage, productVariant } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";

// =============================================================================
// Get wishlist items
// =============================================================================

export const $getWishlist = createServerFn({ method: "GET" }).handler(
	async () => {
		return safe(async () => {
			const user = await getCurrentUser();
			if (!user) return { items: [], productIds: [] };

			const items = await db.query.wishlist.findMany({
				where: eq(wishlist.userId, user.id),
				with: {
					product: {
						with: {
							images: {
								where: eq(productImage.isPrimary, true),
								limit: 1,
								columns: { id: true, url: true, altText: true },
							},
							category: { columns: { id: true, name: true, slug: true } },
							brand: { columns: { id: true, name: true } },
							variants: {
								where: eq(productVariant.isActive, true),
								limit: 1,
								columns: { id: true, stock: true },
							},
						},
					},
				},
				orderBy: (w, { desc }) => [desc(w.createdAt)],
			});

			return {
				items: items.map((w) => ({
					id: w.id,
					productId: w.productId,
					product: w.product,
					addedAt: w.createdAt,
				})),
				productIds: items.map((w) => w.productId),
			};
		});
	},
);

// =============================================================================
// Toggle wishlist (add if not present, remove if present)
// =============================================================================

export const $toggleWishlist = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		validate(z.object({ productId: zId }), data),
	)
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const { productId } = data.data;

			const user = await getCurrentUser();
			if (!user) throw { status: 401, message: "Sign in to save favorites" };

			const existing = await db.query.wishlist.findFirst({
				where: and(
					eq(wishlist.userId, user.id),
					eq(wishlist.productId, productId),
				),
				columns: { id: true },
			});

			if (existing) {
				await db.delete(wishlist).where(eq(wishlist.id, existing.id));
				return { added: false, productId };
			}

			// Verify product exists and is active
			const prod = await db.query.product.findFirst({
				where: and(
					eq(product.id, productId),
					eq(product.status, "active"),
				),
				columns: { id: true },
			});

			if (!prod) throw { status: 404, message: "Product not found" };

			await db.insert(wishlist).values({
				userId: user.id,
				productId,
			});

			return { added: true, productId };
		});
	});
