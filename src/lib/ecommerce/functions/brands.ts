/**
 * Brand Server Functions
 *
 * Server functions for brand management including:
 * - Admin brand listing, detail, CRUD
 */

import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { brand, product } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const BrandFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  active: z.boolean().optional(),
  sortBy: z.enum(["name", "createdAt", "sortOrder"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const CreateBrandSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

const UpdateBrandSchema = CreateBrandSchema.partial().extend({
  brandId: zId,
});

// =============================================================================
// Helpers
// =============================================================================

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get all brands (admin)
 */
export const $adminGetBrands = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(BrandFiltersSchema, data))
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
          or(ilike(brand.name, query), ilike(brand.description, query)),
        );
      }

      if (data.data.active !== undefined) {
        conditions.push(eq(brand.isActive, data.data.active));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(brand).where(whereClause)
        : await db.select({ total: count() }).from(brand);

      const sortColumn =
        params.sortBy === "name"
          ? brand.name
          : params.sortBy === "sortOrder"
            ? brand.sortOrder
            : brand.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Get brands with product count
      const brands = await db
        .select({
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logoUrl: brand.logoUrl,
          websiteUrl: brand.websiteUrl,
          isActive: brand.isActive,
          sortOrder: brand.sortOrder,
          createdAt: brand.createdAt,
          updatedAt: brand.updatedAt,
          productCount: sql<number>`(SELECT count(*) FROM product WHERE product.brand_id = ${brand.id})::int`,
        })
        .from(brand)
        .where(whereClause)
        .orderBy(sortDirection)
        .limit(params.limit)
        .offset(offset);

      return paginatedResult(brands, total, params);
    });
  });

/**
 * Get single brand (admin)
 */
export const $adminGetBrand = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ brandId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const result = await db.query.brand.findFirst({
        where: eq(brand.id, data.brandId),
      });

      if (!result) {
        throw { status: 404, message: "Brand not found" };
      }

      return result;
    });
  });

/**
 * Create a new brand
 */
export const $adminCreateBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateBrandSchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const slug = data.data.slug || slugify(data.data.name);

        // Check for duplicate slug
        const existing = await db.query.brand.findFirst({
          where: eq(brand.slug, slug),
          columns: { id: true },
        });

        if (existing) {
          throw { status: 400, message: "A brand with this slug already exists" };
        }

        const [newBrand] = await db
          .insert(brand)
          .values({
            name: data.data.name,
            slug,
            description: data.data.description,
            logoUrl: data.data.logoUrl,
            websiteUrl: data.data.websiteUrl,
            isActive: data.data.isActive,
            sortOrder: data.data.sortOrder,
          })
          .returning();

        return newBrand;
      },
      { successMessage: MESSAGES.SUCCESS.BRAND_CREATED },
    );
  });

/**
 * Update a brand
 */
export const $adminUpdateBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateBrandSchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { brandId, ...updateData } = data.data;

        const existing = await db.query.brand.findFirst({
          where: eq(brand.id, brandId),
          columns: { id: true, slug: true },
        });

        if (!existing) {
          throw { status: 404, message: "Brand not found" };
        }

        // Auto-generate slug from name if name changed and no slug provided
        let slug = updateData.slug;
        if (updateData.name && !slug) {
          slug = slugify(updateData.name);
        }

        // Check for duplicate slug if changing
        if (slug && slug !== existing.slug) {
          const slugExists = await db.query.brand.findFirst({
            where: and(
              eq(brand.slug, slug),
              sql`${brand.id} != ${brandId}`,
            ),
            columns: { id: true },
          });

          if (slugExists) {
            throw { status: 400, message: "A brand with this slug already exists" };
          }
        }

        const [updated] = await db
          .update(brand)
          .set({
            ...updateData,
            ...(slug ? { slug } : {}),
            updatedAt: new Date(),
          })
          .where(eq(brand.id, brandId))
          .returning();

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.BRAND_UPDATED },
    );
  });

/**
 * Delete a brand
 */
export const $adminDeleteBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ brandId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const existing = await db.query.brand.findFirst({
          where: eq(brand.id, data.brandId),
          columns: { id: true },
        });

        if (!existing) {
          throw { status: 404, message: "Brand not found" };
        }

        // Check no products reference this brand
        const [{ productCount = 0 } = {}] = await db
          .select({ productCount: count() })
          .from(product)
          .where(eq(product.brandId, data.brandId));

        if (productCount > 0) {
          throw {
            status: 400,
            message: `Cannot delete brand: ${productCount} product(s) still reference it`,
          };
        }

        await db.delete(brand).where(eq(brand.id, data.brandId));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.BRAND_DELETED },
    );
  });
