/**
 * Variant Server Functions
 *
 * Server functions for product variant management including:
 * - Variant CRUD operations
 * - Stock adjustments
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  product,
  productColor,
  productSize,
  productVariant,
  stockAdjustment,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";
import { sendInventoryAdjustedEvent, sendLowStockAlertEvent } from "@/lib/inngest/ecommerce-events";

// =============================================================================
// Schemas
// =============================================================================

const CreateVariantSchema = z.object({
  productId: zId,
  sku: z.string().min(1).max(100),
  price: z.number().int().min(0).optional(), // Override product price
  colorId: zId.optional(),
  sizeId: zId.optional(),
  stock: z.number().int().min(0).default(0),
  weight: z.string().optional(), // Decimal as string
  barcode: z.string().optional(),
  isActive: z.boolean().default(true),
});

const UpdateVariantSchema = z.object({
  id: zId,
  sku: z.string().min(1).max(100).optional(),
  price: z.number().int().min(0).optional(),
  colorId: zId.optional().nullable(),
  sizeId: zId.optional().nullable(),
  weight: z.string().optional(),
  barcode: z.string().optional(),
  isActive: z.boolean().optional(),
});

const AdjustStockSchema = z.object({
  variantId: zId,
  adjustment: z.number().int(), // Positive or negative
  reason: z.enum(["restock", "adjustment", "return", "damaged", "other"]),
  notes: z.string().optional(),
});

const BulkStockUpdateSchema = z.object({
  updates: z.array(
    z.object({
      variantId: zId,
      newStock: z.number().int().min(0),
      reason: z.string().optional(),
    }),
  ),
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Create a new variant
 */
export const $adminCreateVariant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateVariantSchema, data))
  .middleware([accessMiddleware({ permissions: { variants: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        // Check product exists
        const productExists = await db.query.product.findFirst({
          where: eq(product.id, data.data.productId),
          columns: { id: true },
        });

        if (!productExists) {
          throw { status: 404, message: "Product not found" };
        }

        // Check for duplicate SKU
        const skuExists = await db.query.productVariant.findFirst({
          where: eq(productVariant.sku, data.data.sku),
          columns: { id: true },
        });

        if (skuExists) {
          throw { status: 400, message: "SKU already exists" };
        }

        // Check for duplicate color/size combination
        if (data.data.colorId || data.data.sizeId) {
          const combinationExists = await db.query.productVariant.findFirst({
            where: and(
              eq(productVariant.productId, data.data.productId),
              data.data.colorId
                ? eq(productVariant.colorId, data.data.colorId)
                : sql`${productVariant.colorId} IS NULL`,
              data.data.sizeId
                ? eq(productVariant.sizeId, data.data.sizeId)
                : sql`${productVariant.sizeId} IS NULL`,
            ),
            columns: { id: true },
          });

          if (combinationExists) {
            throw {
              status: 400,
              message: "A variant with this color/size combination already exists",
            };
          }
        }

        const [newVariant] = await db
          .insert(productVariant)
          .values({
            productId: data.data.productId,
            sku: data.data.sku,
            price: data.data.price,
            colorId: data.data.colorId,
            sizeId: data.data.sizeId,
            stock: data.data.stock,
            weight: data.data.weight,
            barcode: data.data.barcode,
            isActive: data.data.isActive,
          })
          .returning();

        // Update product total stock
        await db
          .update(product)
          .set({
            totalStock: sql`${product.totalStock} + ${data.data.stock}`,
            updatedAt: new Date(),
          })
          .where(eq(product.id, data.data.productId));

        return newVariant;
      },
      { successMessage: MESSAGES.SUCCESS.VARIANT_CREATED },
    );
  });

/**
 * Bulk create variants from color × size combinations
 */
const BulkCreateVariantsSchema = z.object({
  productId: zId,
  colorIds: z.array(zId),
  sizeIds: z.array(zId),
  skuPrefix: z.string().min(1).max(50),
  stock: z.number().int().min(0).default(0),
  price: z.number().int().min(0).optional(),
});

export const $adminBulkCreateVariants = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(BulkCreateVariantsSchema, data))
  .middleware([accessMiddleware({ permissions: { variants: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { productId, colorIds, sizeIds, skuPrefix, stock, price } = data.data;

        // Check product exists
        const productExists = await db.query.product.findFirst({
          where: eq(product.id, productId),
          columns: { id: true, slug: true },
        });
        if (!productExists) throw { status: 404, message: "Product not found" };

        // Load color/size names for SKU generation
        const colors = colorIds.length > 0
          ? await db.query.productColor.findMany({ where: inArray(productColor.id, colorIds) })
          : [];
        const sizes = sizeIds.length > 0
          ? await db.query.productSize.findMany({ where: inArray(productSize.id, sizeIds) })
          : [];

        const colorMap = new Map(colors.map((c: any) => [c.id, c]));
        const sizeMap = new Map(sizes.map((s: any) => [s.id, s]));

        // Build combinations
        const combos: Array<{ colorId?: string; sizeId?: string; colorName?: string; sizeName?: string }> = [];
        if (colorIds.length > 0 && sizeIds.length > 0) {
          for (const cId of colorIds) {
            for (const sId of sizeIds) {
              combos.push({ colorId: cId, sizeId: sId, colorName: colorMap.get(cId)?.name, sizeName: sizeMap.get(sId)?.name });
            }
          }
        } else if (colorIds.length > 0) {
          for (const cId of colorIds) {
            combos.push({ colorId: cId, colorName: colorMap.get(cId)?.name });
          }
        } else if (sizeIds.length > 0) {
          for (const sId of sizeIds) {
            combos.push({ sizeId: sId, sizeName: sizeMap.get(sId)?.name });
          }
        }

        if (combos.length === 0) throw { status: 400, message: "Select at least one color or size" };

        // Filter out combinations that already exist
        const existingVariants = await db.query.productVariant.findMany({
          where: eq(productVariant.productId, productId),
          columns: { colorId: true, sizeId: true },
        });
        const existingSet = new Set(existingVariants.map((v: any) => `${v.colorId || ""}_${v.sizeId || ""}`));
        const newCombos = combos.filter((c) => !existingSet.has(`${c.colorId || ""}_${c.sizeId || ""}`));

        if (newCombos.length === 0) throw { status: 400, message: "All selected combinations already exist" };

        // Check for SKU conflicts and generate unique SKUs
        const skuBase = skuPrefix.toUpperCase().replace(/[^A-Z0-9]/g, "-");
        const values = newCombos.map((combo) => {
          const parts = [skuBase];
          if (combo.colorName) parts.push(combo.colorName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
          if (combo.sizeName) parts.push(combo.sizeName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
          return {
            productId,
            sku: parts.join("-"),
            colorId: combo.colorId,
            sizeId: combo.sizeId,
            stock,
            price,
            isActive: true,
          };
        });

        // Check for duplicate SKUs
        for (const v of values) {
          const skuExists = await db.query.productVariant.findFirst({
            where: eq(productVariant.sku, v.sku),
            columns: { id: true },
          });
          if (skuExists) {
            v.sku = `${v.sku}-${Date.now().toString(36).slice(-4)}`;
          }
        }

        // Insert all variants
        const created = await db.insert(productVariant).values(values).returning();

        // Update product total stock
        const totalNewStock = stock * newCombos.length;
        if (totalNewStock > 0) {
          await db
            .update(product)
            .set({
              totalStock: sql`${product.totalStock} + ${totalNewStock}`,
              updatedAt: new Date(),
            })
            .where(eq(product.id, productId));
        }

        return { created: created.length, skipped: combos.length - newCombos.length };
      },
      { successMessage: "Variants generated successfully" },
    );
  });

/**
 * Update a variant
 */
export const $adminUpdateVariant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateVariantSchema, data))
  .middleware([accessMiddleware({ permissions: { variants: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { id, ...updateData } = data.data;

        // Check variant exists
        const existing = await db.query.productVariant.findFirst({
          where: eq(productVariant.id, id),
          columns: { id: true, sku: true, productId: true },
        });

        if (!existing) {
          throw { status: 404, message: "Variant not found" };
        }

        // Check for duplicate SKU if changing
        if (updateData.sku && updateData.sku !== existing.sku) {
          const skuExists = await db.query.productVariant.findFirst({
            where: and(
              eq(productVariant.sku, updateData.sku),
              sql`${productVariant.id} != ${id}`,
            ),
            columns: { id: true },
          });

          if (skuExists) {
            throw { status: 400, message: "SKU already exists" };
          }
        }

        const [updated] = await db
          .update(productVariant)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(productVariant.id, id))
          .returning();

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.VARIANT_UPDATED },
    );
  });

/**
 * Delete a variant
 */
export const $adminDeleteVariant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { variants: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        // Get variant to check stock
        const variant = await db.query.productVariant.findFirst({
          where: eq(productVariant.id, data.id),
          columns: { id: true, productId: true, stock: true },
        });

        if (!variant) {
          throw { status: 404, message: "Variant not found" };
        }

        // Delete variant
        await db.delete(productVariant).where(eq(productVariant.id, data.id));

        // Update product total stock
        await db
          .update(product)
          .set({
            totalStock: sql`GREATEST(0, ${product.totalStock} - ${variant.stock})`,
            updatedAt: new Date(),
          })
          .where(eq(product.id, variant.productId));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.VARIANT_DELETED },
    );
  });

/**
 * Adjust stock with reason logging
 */
export const $adminAdjustStock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(AdjustStockSchema, data))
  .middleware([accessMiddleware({ permissions: { inventory: ["adjust"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const user = await getCurrentUser();

        // Get variant with product info
        const variant = await db.query.productVariant.findFirst({
          where: eq(productVariant.id, data.data.variantId),
          with: {
            product: {
              columns: { id: true, name: true, lowStockThreshold: true },
            },
          },
        });

        if (!variant) {
          throw { status: 404, message: "Variant not found" };
        }

        const previousStock = variant.stock;
        const newStock = Math.max(0, previousStock + data.data.adjustment);
        const threshold = variant.product?.lowStockThreshold || 10;

        // Update variant stock
        await db
          .update(productVariant)
          .set({
            stock: newStock,
            updatedAt: new Date(),
          })
          .where(eq(productVariant.id, data.data.variantId));

        // Log stock adjustment
        await db.insert(stockAdjustment).values({
          variantId: data.data.variantId,
          previousStock,
          newStock,
          adjustment: data.data.adjustment,
          reason: data.data.reason,
          userId: user?.id,
          notes: data.data.notes,
        });

        // Update product total stock
        await db
          .update(product)
          .set({
            totalStock: sql`${product.totalStock} + ${data.data.adjustment}`,
            updatedAt: new Date(),
          })
          .where(eq(product.id, variant.productId));

        // Send Inngest event
        await sendInventoryAdjustedEvent({
          variantId: data.data.variantId,
          sku: variant.sku,
          previousStock,
          newStock,
          adjustment: data.data.adjustment,
          reason: data.data.reason,
          adjustedBy: user?.id,
        });

        // Check for low stock alert
        if (newStock <= threshold && previousStock > threshold) {
          await sendLowStockAlertEvent({
            variantId: data.data.variantId,
            productName: variant.product?.name || "Unknown",
            sku: variant.sku,
            currentStock: newStock,
            threshold,
          });
        }

        return {
          variantId: data.data.variantId,
          previousStock,
          newStock,
          adjustment: data.data.adjustment,
        };
      },
      { successMessage: MESSAGES.SUCCESS.STOCK_ADJUSTED },
    );
  });

/**
 * Bulk stock update
 */
export const $adminBulkStockUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(BulkStockUpdateSchema, data))
  .middleware([accessMiddleware({ permissions: { inventory: ["adjust"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const user = await getCurrentUser();
        const results: Array<{
          variantId: string;
          success: boolean;
          previousStock?: number;
          newStock?: number;
          error?: string;
        }> = [];

        for (const update of data.data.updates) {
          try {
            const variant = await db.query.productVariant.findFirst({
              where: eq(productVariant.id, update.variantId),
              columns: { id: true, sku: true, stock: true, productId: true },
            });

            if (!variant) {
              results.push({
                variantId: update.variantId,
                success: false,
                error: "Variant not found",
              });
              continue;
            }

            const previousStock = variant.stock;
            const adjustment = update.newStock - previousStock;

            // Update stock
            await db
              .update(productVariant)
              .set({
                stock: update.newStock,
                updatedAt: new Date(),
              })
              .where(eq(productVariant.id, update.variantId));

            // Log adjustment
            await db.insert(stockAdjustment).values({
              variantId: update.variantId,
              previousStock,
              newStock: update.newStock,
              adjustment,
              reason: "adjustment",
              userId: user?.id,
              notes: update.reason || "Bulk update",
            });

            // Update product total
            await db
              .update(product)
              .set({
                totalStock: sql`${product.totalStock} + ${adjustment}`,
                updatedAt: new Date(),
              })
              .where(eq(product.id, variant.productId));

            results.push({
              variantId: update.variantId,
              success: true,
              previousStock,
              newStock: update.newStock,
            });
          } catch (error) {
            results.push({
              variantId: update.variantId,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        return {
          results,
          successCount,
          failCount: results.length - successCount,
        };
      },
      { successMessage: "Stock updated" },
    );
  });

/**
 * Get stock adjustment history for a variant
 */
export const $getStockHistory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        variantId: zId,
        limit: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .middleware([accessMiddleware({ permissions: { inventory: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const history = await db.query.stockAdjustment.findMany({
        where: eq(stockAdjustment.variantId, data.variantId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          order: {
            columns: { id: true, orderNumber: true },
          },
        },
        orderBy: sql`created_at DESC`,
        limit: data.limit || 50,
      });

      return history;
    });
  });
