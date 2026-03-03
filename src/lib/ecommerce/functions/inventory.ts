/**
 * Inventory Server Functions
 *
 * Server functions for inventory management queries.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  product,
  productVariant,
  productColor,
  productSize,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";

// =============================================================================
// Schemas
// =============================================================================

const InventoryFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  categoryId: zId.optional(),
  sortBy: z.enum(["sku", "stock", "productName"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get inventory listing (admin)
 */
export const $adminGetInventory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(InventoryFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { inventory: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const params = normalizePagination({
        page: data.data.page,
        limit: data.data.limit,
        search: data.data.search,
        sortBy: data.data.sortBy,
        sortOrder: data.data.sortOrder,
      });

      const offset = (params.page - 1) * params.limit;
      const conditions = [eq(productVariant.isActive, true)];

      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(
          or(
            ilike(productVariant.sku, query),
            ilike(product.name, query),
          )!,
        );
      }

      if (data.data.lowStock) {
        conditions.push(
          and(
            sql`${productVariant.stock} > 0`,
            sql`${productVariant.stock} <= ${product.lowStockThreshold}`,
          )!,
        );
      }

      if (data.data.outOfStock) {
        conditions.push(lte(productVariant.stock, 0));
      }

      if (data.data.categoryId) {
        conditions.push(eq(product.categoryId, data.data.categoryId));
      }

      const whereClause = and(...conditions);

      // Get total count
      const [{ total = 0 } = {}] = await db
        .select({ total: count() })
        .from(productVariant)
        .innerJoin(product, eq(productVariant.productId, product.id))
        .where(whereClause);

      // Get low stock count
      const [{ lowStockCount = 0 } = {}] = await db
        .select({ lowStockCount: count() })
        .from(productVariant)
        .innerJoin(product, eq(productVariant.productId, product.id))
        .where(
          and(
            eq(productVariant.isActive, true),
            sql`${productVariant.stock} > 0`,
            sql`${productVariant.stock} <= ${product.lowStockThreshold}`,
          ),
        );

      // Sort
      const sortColumn =
        params.sortBy === "sku"
          ? productVariant.sku
          : params.sortBy === "stock"
            ? productVariant.stock
            : product.name;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Get inventory items
      const items = await db
        .select({
          id: productVariant.id,
          sku: productVariant.sku,
          productId: product.id,
          productName: product.name,
          colorName: productColor.name,
          sizeName: productSize.name,
          stock: productVariant.stock,
          reservedStock: productVariant.reservedStock,
          price: sql<number>`COALESCE(${productVariant.price}, ${product.basePrice})`,
          lowStockThreshold: product.lowStockThreshold,
        })
        .from(productVariant)
        .innerJoin(product, eq(productVariant.productId, product.id))
        .leftJoin(productColor, eq(productVariant.colorId, productColor.id))
        .leftJoin(productSize, eq(productVariant.sizeId, productSize.id))
        .where(whereClause)
        .orderBy(sortDirection)
        .limit(params.limit)
        .offset(offset);

      const formattedItems = items.map((item) => {
        const variantParts = [item.colorName, item.sizeName].filter(Boolean);
        return {
          id: item.id,
          sku: item.sku,
          productId: item.productId,
          productName: item.productName,
          variantName: variantParts.length > 0 ? variantParts.join(" / ") : null,
          stock: item.stock,
          reservedStock: item.reservedStock,
          availableStock: item.stock - item.reservedStock,
          price: Number(item.price),
          lowStockThreshold: item.lowStockThreshold,
          imageUrl: null as string | null,
        };
      });

      return {
        ...paginatedResult(formattedItems, total, params),
        lowStockCount: Number(lowStockCount),
      };
    });
  });
