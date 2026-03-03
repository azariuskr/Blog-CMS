/**
 * Product Server Functions
 *
 * Server functions for product management including:
 * - Public product listing and detail
 * - Admin product CRUD operations
 */

import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
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
  productImage,
  brand,
  category,
  productColor,
  productSize,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const ProductFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  status: z
    .array(z.enum(["draft", "active", "archived"]))
    .optional(),
  categoryId: zId.optional(),
  brandId: zId.optional(),
  featured: z.boolean().optional(),
  colorIds: z.array(zId).optional(),
  sizeIds: z.array(zId).optional(),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
  sortBy: z
    .enum(["name", "basePrice", "createdAt", "totalStock"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  basePrice: z.number().int().min(0), // In cents
  salePrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().max(30)).max(10).default([]),
  lowStockThreshold: z.number().int().min(0).default(10),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  brandId: zId.optional(),
  categoryId: zId.optional(),
});

const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: zId,
});

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Get active products (public)
 */
export const $getProducts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(ProductFiltersSchema, data))
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
      const conditions = [eq(product.status, "active")];

      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(
          or(ilike(product.name, query), ilike(product.description, query))!,
        );
      }

      if (data.data.categoryId) {
        conditions.push(eq(product.categoryId, data.data.categoryId));
      }

      if (data.data.brandId) {
        conditions.push(eq(product.brandId, data.data.brandId));
      }

      if (data.data.featured === true) {
        conditions.push(eq(product.isFeatured, true));
      }

      if (data.data.priceMin !== undefined) {
        conditions.push(gte(product.basePrice, data.data.priceMin));
      }

      if (data.data.priceMax !== undefined) {
        conditions.push(lte(product.basePrice, data.data.priceMax));
      }

      if (data.data.colorIds && data.data.colorIds.length > 0) {
        const colorParams = sql.join(data.data.colorIds.map((id) => sql`${id}::uuid`), sql`, `);
        conditions.push(
          sql`EXISTS (SELECT 1 FROM product_variant WHERE product_variant.product_id = ${product.id} AND product_variant.is_active = true AND product_variant.color_id IN (${colorParams}))`,
        );
      }

      if (data.data.sizeIds && data.data.sizeIds.length > 0) {
        const sizeParams = sql.join(data.data.sizeIds.map((id) => sql`${id}::uuid`), sql`, `);
        conditions.push(
          sql`EXISTS (SELECT 1 FROM product_variant WHERE product_variant.product_id = ${product.id} AND product_variant.is_active = true AND product_variant.size_id IN (${sizeParams}))`,
        );
      }

      const whereClause = and(...conditions);

      const [{ total = 0 } = {}] = await db
        .select({ total: count() })
        .from(product)
        .where(whereClause);

      const sortColumn =
        params.sortBy === "name"
          ? product.name
          : params.sortBy === "basePrice"
            ? product.basePrice
            : params.sortBy === "totalStock"
              ? product.totalStock
              : product.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const products = await db.query.product.findMany({
        where: whereClause,
        with: {
          brand: { columns: { id: true, name: true, slug: true } },
          category: { columns: { id: true, name: true, slug: true } },
          images: {
            orderBy: [asc(productImage.sortOrder)],
            limit: 2,
            columns: { id: true, url: true, altText: true, isPrimary: true },
          },
          variants: {
            where: eq(productVariant.isActive, true),
            columns: { id: true, colorId: true },
            with: { color: { columns: { id: true, name: true, hexCode: true } } },
          },
        },
        orderBy: sortDirection,
        limit: params.limit,
        offset,
      });

      return paginatedResult(products, total, params);
    });
  });

/**
 * Get product by slug (public)
 */
export const $getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return safe(async () => {
      const result = await db.query.product.findFirst({
        where: and(eq(product.slug, data.slug), eq(product.status, "active")),
        with: {
          brand: true,
          category: true,
          images: {
            orderBy: [asc(productImage.sortOrder)],
          },
          variants: {
            where: eq(productVariant.isActive, true),
            with: {
              color: true,
              size: true,
              images: true,
            },
          },
          reviews: {
            where: sql`${sql.identifier("is_approved")} = true`,
            limit: 10,
            orderBy: desc(sql`created_at`),
          },
        },
      });

      if (!result) {
        throw { status: 404, message: "Product not found" };
      }

      return result;
    });
  });

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get all products for admin (includes drafts/archived)
 */
export const $adminGetProducts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(ProductFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
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
      const conditions = [];

      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(
          or(
            ilike(product.name, query),
            ilike(product.description, query),
            sql`EXISTS (SELECT 1 FROM product_variant WHERE product_variant.product_id = product.id AND product_variant.sku ILIKE ${query})`,
          ),
        );
      }

      if (data.data.status && data.data.status.length > 0) {
        conditions.push(inArray(product.status, data.data.status));
      }

      if (data.data.categoryId) {
        conditions.push(eq(product.categoryId, data.data.categoryId));
      }

      if (data.data.brandId) {
        conditions.push(eq(product.brandId, data.data.brandId));
      }

      if (data.data.featured !== undefined) {
        conditions.push(eq(product.isFeatured, data.data.featured));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(product).where(whereClause)
        : await db.select({ total: count() }).from(product);

      const sortColumn =
        params.sortBy === "name"
          ? product.name
          : params.sortBy === "basePrice"
            ? product.basePrice
            : params.sortBy === "totalStock"
              ? product.totalStock
              : product.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const products = await db.query.product.findMany({
        where: whereClause,
        with: {
          brand: { columns: { id: true, name: true } },
          category: { columns: { id: true, name: true } },
          images: {
            where: eq(productImage.isPrimary, true),
            limit: 1,
          },
          variants: {
            columns: { id: true, sku: true, stock: true },
          },
        },
        orderBy: sortDirection,
        limit: params.limit,
        offset,
      });

      return paginatedResult(products, total, params);
    });
  });

/**
 * Get single product for admin editing
 */
export const $adminGetProduct = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: zId }).parse(data))
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const result = await db.query.product.findFirst({
        where: eq(product.id, data.id),
        with: {
          brand: true,
          category: true,
          images: {
            orderBy: [asc(productImage.sortOrder)],
          },
          variants: {
            with: {
              color: true,
              size: true,
              images: true,
            },
            orderBy: [asc(productVariant.createdAt)],
          },
        },
      });

      if (!result) {
        throw { status: 404, message: "Product not found" };
      }

      return result;
    });
  });

/**
 * Create a new product
 */
export const $adminCreateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateProductSchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        // Check for duplicate slug
        const existing = await db.query.product.findFirst({
          where: eq(product.slug, data.data.slug),
          columns: { id: true },
        });

        if (existing) {
          throw { status: 400, message: "A product with this slug already exists" };
        }

        const [newProduct] = await db
          .insert(product)
          .values({
            name: data.data.name,
            slug: data.data.slug,
            description: data.data.description,
            shortDescription: data.data.shortDescription,
            basePrice: data.data.basePrice,
            salePrice: data.data.salePrice,
            costPrice: data.data.costPrice,
            status: data.data.status,
            isFeatured: data.data.isFeatured,
            tags: data.data.tags,
            lowStockThreshold: data.data.lowStockThreshold,
            metaTitle: data.data.metaTitle,
            metaDescription: data.data.metaDescription,
            brandId: data.data.brandId,
            categoryId: data.data.categoryId,
          })
          .returning();

        return newProduct;
      },
      { successMessage: MESSAGES.SUCCESS.PRODUCT_CREATED },
    );
  });

/**
 * Update a product
 */
export const $adminUpdateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateProductSchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { id, ...updateData } = data.data;

        // Check product exists
        const existing = await db.query.product.findFirst({
          where: eq(product.id, id),
          columns: { id: true, slug: true },
        });

        if (!existing) {
          throw { status: 404, message: "Product not found" };
        }

        // Check for duplicate slug if changing
        if (updateData.slug && updateData.slug !== existing.slug) {
          const slugExists = await db.query.product.findFirst({
            where: and(
              eq(product.slug, updateData.slug),
              sql`${product.id} != ${id}`,
            ),
            columns: { id: true },
          });

          if (slugExists) {
            throw { status: 400, message: "A product with this slug already exists" };
          }
        }

        const [updated] = await db
          .update(product)
          .set({
            ...updateData,
            updatedAt: new Date(),
            publishedAt:
              updateData.status === "active" ? new Date() : undefined,
          })
          .where(eq(product.id, id))
          .returning();

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.PRODUCT_UPDATED },
    );
  });

/**
 * Delete a product
 */
export const $adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        // Check product exists
        const existing = await db.query.product.findFirst({
          where: eq(product.id, data.id),
          columns: { id: true },
        });

        if (!existing) {
          throw { status: 404, message: "Product not found" };
        }

        // Delete product (cascades to variants, images)
        await db.delete(product).where(eq(product.id, data.id));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.PRODUCT_DELETED },
    );
  });

/**
 * Publish/unpublish a product
 */
export const $adminPublishProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: zId, publish: z.boolean() }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["publish"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const [updated] = await db
          .update(product)
          .set({
            status: data.publish ? "active" : "draft",
            publishedAt: data.publish ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(product.id, data.id))
          .returning();

        if (!updated) {
          throw { status: 404, message: "Product not found" };
        }

        return updated;
      },
      {
        successMessage: data.publish
          ? MESSAGES.SUCCESS.PRODUCT_PUBLISHED
          : "Product unpublished",
      },
    );
  });

/**
 * Get product facets for filtering
 */
export const $getProductFacets = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      // Get status counts
      const statusCounts = await db
        .select({
          status: product.status,
          count: count(),
        })
        .from(product)
        .groupBy(product.status);

      // Get categories with counts
      const categories = await db
        .select({
          id: category.id,
          name: category.name,
          count: count(),
        })
        .from(category)
        .leftJoin(product, eq(product.categoryId, category.id))
        .where(eq(category.isActive, true))
        .groupBy(category.id, category.name);

      // Get brands with counts
      const brands = await db
        .select({
          id: brand.id,
          name: brand.name,
          count: count(),
        })
        .from(brand)
        .leftJoin(product, eq(product.brandId, brand.id))
        .where(eq(brand.isActive, true))
        .groupBy(brand.id, brand.name);

      return {
        statusCounts: Object.fromEntries(
          statusCounts.map((s) => [s.status, Number(s.count)]),
        ),
        categories,
        brands,
      };
    });
  });

// =============================================================================
// Public: Get storefront facets (categories, brands, price range)
// =============================================================================

export const $getStorefrontFacets = createServerFn({ method: "GET" }).handler(
	async () => {
		return safe(async () => {
			const [categories, brands, priceRange] = await Promise.all([
				db
					.select({
						id: category.id,
						name: category.name,
						slug: category.slug,
						imageUrl: category.imageUrl,
						count: count(),
					})
					.from(category)
					.leftJoin(
						product,
						and(eq(product.categoryId, category.id), eq(product.status, "active")),
					)
					.where(eq(category.isActive, true))
					.groupBy(category.id, category.name, category.slug, category.imageUrl)
					.orderBy(asc(category.sortOrder)),
				db
					.select({
						id: brand.id,
						name: brand.name,
						slug: brand.slug,
						count: count(),
					})
					.from(brand)
					.leftJoin(
						product,
						and(eq(product.brandId, brand.id), eq(product.status, "active")),
					)
					.where(eq(brand.isActive, true))
					.groupBy(brand.id, brand.name, brand.slug)
					.orderBy(asc(brand.name)),
				db
					.select({
						min: sql<number>`COALESCE(MIN(${product.basePrice}), 0)`,
						max: sql<number>`COALESCE(MAX(${product.basePrice}), 0)`,
					})
					.from(product)
					.where(eq(product.status, "active")),
			]);

			return {
				categories: categories.filter((c) => Number(c.count) > 0),
				brands: brands.filter((b) => Number(b.count) > 0),
				priceRange: {
					min: priceRange[0]?.min ?? 0,
					max: priceRange[0]?.max ?? 0,
				},
			};
		});
	},
);

// =============================================================================
// Helper: Get all colors and sizes for variant creation
// =============================================================================

export const $getProductOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    return safe(async () => {
      const [colors, sizes] = await Promise.all([
        db
          .select({
            id: productColor.id,
            name: productColor.name,
            hexCode: productColor.hexCode,
            sortOrder: productColor.sortOrder,
            count: sql<number>`COUNT(DISTINCT ${productVariant.productId})`,
          })
          .from(productColor)
          .innerJoin(
            productVariant,
            and(
              eq(productVariant.colorId, productColor.id),
              eq(productVariant.isActive, true),
            ),
          )
          .innerJoin(
            product,
            and(
              eq(product.id, productVariant.productId),
              eq(product.status, "active"),
            ),
          )
          .groupBy(productColor.id, productColor.name, productColor.hexCode, productColor.sortOrder)
          .orderBy(asc(productColor.sortOrder)),
        db
          .select({
            id: productSize.id,
            name: productSize.name,
            sizeCategory: productSize.sizeCategory,
            sortOrder: productSize.sortOrder,
            count: sql<number>`COUNT(DISTINCT ${productVariant.productId})`,
          })
          .from(productSize)
          .innerJoin(
            productVariant,
            and(
              eq(productVariant.sizeId, productSize.id),
              eq(productVariant.isActive, true),
            ),
          )
          .innerJoin(
            product,
            and(
              eq(product.id, productVariant.productId),
              eq(product.status, "active"),
            ),
          )
          .groupBy(productSize.id, productSize.name, productSize.sizeCategory, productSize.sortOrder)
          .orderBy(asc(productSize.sizeCategory), asc(productSize.sortOrder)),
      ]);

      return { colors, sizes };
    });
  },
);

// =============================================================================
// Related Products (public, for storefront)
// =============================================================================

export const $getRelatedProducts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({
    productId: z.string(),
    categoryId: z.string().optional(),
    brandId: z.string().optional(),
    limit: z.number().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    return safe(async () => {
      const limit = Math.min(data.limit ?? 8, 20);
      const conditions = [
        eq(product.status, "active"),
        sql`${product.id} != ${data.productId}`,
      ];

      // Match same category OR same brand
      const matchConditions = [];
      if (data.categoryId) {
        matchConditions.push(eq(product.categoryId, data.categoryId));
      }
      if (data.brandId) {
        matchConditions.push(eq(product.brandId, data.brandId));
      }

      if (matchConditions.length > 0) {
        conditions.push(or(...matchConditions)!);
      }

      const items = await db.query.product.findMany({
        where: and(...conditions),
        with: {
          brand: { columns: { id: true, name: true, slug: true } },
          category: { columns: { id: true, name: true, slug: true } },
          images: {
            orderBy: [asc(productImage.sortOrder)],
            limit: 2,
            columns: { id: true, url: true, altText: true, isPrimary: true },
          },
          variants: {
            where: eq(productVariant.isActive, true),
            columns: { id: true },
            limit: 1,
          },
        },
        orderBy: sql`RANDOM()`,
        limit,
      });

      return items;
    });
  });

/**
 * Get recommended products for cart page.
 * Takes product IDs from cart, looks up their categories/brands,
 * and returns related products excluding those already in cart.
 */
export const $getCartRecommendations = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({
    productIds: z.array(z.string()),
    limit: z.number().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.productIds.length) return [];

      const limit = Math.min(data.limit ?? 8, 20);

      // Look up categories and brands of cart products
      const cartProducts = await db
        .select({ categoryId: product.categoryId, brandId: product.brandId })
        .from(product)
        .where(inArray(product.id, data.productIds));

      const categoryIds = [...new Set(cartProducts.map((p) => p.categoryId).filter(Boolean))] as string[];
      const brandIds = [...new Set(cartProducts.map((p) => p.brandId).filter(Boolean))] as string[];

      if (!categoryIds.length && !brandIds.length) return [];

      const conditions = [
        eq(product.status, "active"),
        sql`${product.id} != ALL(${data.productIds})`,
      ];

      const matchConditions = [];
      if (categoryIds.length) {
        matchConditions.push(inArray(product.categoryId, categoryIds));
      }
      if (brandIds.length) {
        matchConditions.push(inArray(product.brandId, brandIds));
      }
      conditions.push(or(...matchConditions)!);

      const items = await db.query.product.findMany({
        where: and(...conditions),
        with: {
          brand: { columns: { id: true, name: true, slug: true } },
          category: { columns: { id: true, name: true, slug: true } },
          images: {
            orderBy: [asc(productImage.sortOrder)],
            limit: 2,
            columns: { id: true, url: true, altText: true, isPrimary: true },
          },
          variants: {
            where: eq(productVariant.isActive, true),
            columns: { id: true },
            limit: 1,
          },
        },
        orderBy: sql`RANDOM()`,
        limit,
      });

      return items;
    });
  });
