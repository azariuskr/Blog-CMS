/**
 * Category Server Functions
 *
 * Server functions for category management including:
 * - Admin category listing, detail, CRUD
 * - Category tree for hierarchy display
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
import { category, product } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const CategoryFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  active: z.boolean().optional(),
  parentId: zId.optional(),
  sortBy: z.enum(["name", "createdAt", "sortOrder"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parentId: zId.nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  categoryId: zId,
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
 * Get all categories (admin, paginated)
 */
export const $adminGetCategories = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(CategoryFiltersSchema, data))
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
          or(ilike(category.name, query), ilike(category.description, query)),
        );
      }

      if (data.data.active !== undefined) {
        conditions.push(eq(category.isActive, data.data.active));
      }

      if (data.data.parentId) {
        conditions.push(eq(category.parentId, data.data.parentId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(category).where(whereClause)
        : await db.select({ total: count() }).from(category);

      const sortColumn =
        params.sortBy === "name"
          ? category.name
          : params.sortBy === "sortOrder"
            ? category.sortOrder
            : category.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Create parent alias for join
      const parentCategory = sql`(SELECT name FROM category AS pc WHERE pc.id = ${category.parentId})`;

      const categories = await db
        .select({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          imageUrl: category.imageUrl,
          parentId: category.parentId,
          parentName: sql<string | null>`${parentCategory}`,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          productCount: sql<number>`(SELECT count(*) FROM product WHERE product.category_id = ${category.id})::int`,
          childCount: sql<number>`(SELECT count(*) FROM category AS cc WHERE cc.parent_id = ${category.id})::int`,
        })
        .from(category)
        .where(whereClause)
        .orderBy(sortDirection)
        .limit(params.limit)
        .offset(offset);

      return paginatedResult(categories, total, params);
    });
  });

/**
 * Get category tree (flat list ordered for hierarchy display)
 */
export const $adminGetCategoryTree = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      // Get all categories ordered by sortOrder, name
      const allCategories = await db
        .select({
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        })
        .from(category)
        .orderBy(asc(category.sortOrder), asc(category.name));

      // Build tree structure
      type TreeItem = (typeof allCategories)[number] & { depth: number };
      const result: TreeItem[] = [];

      function addChildren(parentId: string | null, depth: number) {
        const children = allCategories.filter(
          (c) => c.parentId === parentId,
        );
        for (const child of children) {
          result.push({ ...child, depth });
          addChildren(child.id, depth + 1);
        }
      }

      addChildren(null, 0);

      return result;
    });
  });

/**
 * Get single category (admin)
 */
export const $adminGetCategory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ categoryId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const result = await db.query.category.findFirst({
        where: eq(category.id, data.categoryId),
        with: {
          parent: { columns: { id: true, name: true } },
        },
      });

      if (!result) {
        throw { status: 404, message: "Category not found" };
      }

      return result;
    });
  });

/**
 * Create a new category
 */
export const $adminCreateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateCategorySchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const slug = data.data.slug || slugify(data.data.name);

        // Check for duplicate slug
        const existing = await db.query.category.findFirst({
          where: eq(category.slug, slug),
          columns: { id: true },
        });

        if (existing) {
          throw { status: 400, message: "A category with this slug already exists" };
        }

        // Verify parent exists if specified
        if (data.data.parentId) {
          const parent = await db.query.category.findFirst({
            where: eq(category.id, data.data.parentId),
            columns: { id: true },
          });
          if (!parent) {
            throw { status: 400, message: "Parent category not found" };
          }
        }

        const [newCategory] = await db
          .insert(category)
          .values({
            name: data.data.name,
            slug,
            description: data.data.description,
            imageUrl: data.data.imageUrl,
            parentId: data.data.parentId ?? null,
            isActive: data.data.isActive,
            sortOrder: data.data.sortOrder,
          })
          .returning();

        return newCategory;
      },
      { successMessage: MESSAGES.SUCCESS.CATEGORY_CREATED },
    );
  });

/**
 * Update a category
 */
export const $adminUpdateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateCategorySchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { categoryId, ...updateData } = data.data;

        const existing = await db.query.category.findFirst({
          where: eq(category.id, categoryId),
          columns: { id: true, slug: true },
        });

        if (!existing) {
          throw { status: 404, message: "Category not found" };
        }

        // Prevent setting self as parent
        if (updateData.parentId === categoryId) {
          throw { status: 400, message: "A category cannot be its own parent" };
        }

        // Auto-generate slug from name if name changed and no slug provided
        let slug = updateData.slug;
        if (updateData.name && !slug) {
          slug = slugify(updateData.name);
        }

        // Check for duplicate slug if changing
        if (slug && slug !== existing.slug) {
          const slugExists = await db.query.category.findFirst({
            where: and(
              eq(category.slug, slug),
              sql`${category.id} != ${categoryId}`,
            ),
            columns: { id: true },
          });

          if (slugExists) {
            throw { status: 400, message: "A category with this slug already exists" };
          }
        }

        // Verify parent exists if specified
        if (updateData.parentId) {
          const parent = await db.query.category.findFirst({
            where: eq(category.id, updateData.parentId),
            columns: { id: true },
          });
          if (!parent) {
            throw { status: 400, message: "Parent category not found" };
          }
        }

        const [updated] = await db
          .update(category)
          .set({
            ...updateData,
            ...(slug ? { slug } : {}),
            parentId: updateData.parentId !== undefined ? (updateData.parentId ?? null) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(category.id, categoryId))
          .returning();

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.CATEGORY_UPDATED },
    );
  });

/**
 * Delete a category
 */
export const $adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ categoryId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { products: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const existing = await db.query.category.findFirst({
          where: eq(category.id, data.categoryId),
          columns: { id: true },
        });

        if (!existing) {
          throw { status: 404, message: "Category not found" };
        }

        // Check no products reference this category
        const [{ productCount = 0 } = {}] = await db
          .select({ productCount: count() })
          .from(product)
          .where(eq(product.categoryId, data.categoryId));

        if (productCount > 0) {
          throw {
            status: 400,
            message: `Cannot delete category: ${productCount} product(s) still reference it`,
          };
        }

        // Check no child categories
        const [{ childCount = 0 } = {}] = await db
          .select({ childCount: count() })
          .from(category)
          .where(eq(category.parentId, data.categoryId));

        if (childCount > 0) {
          throw {
            status: 400,
            message: `Cannot delete category: ${childCount} child category(ies) still reference it`,
          };
        }

        await db.delete(category).where(eq(category.id, data.categoryId));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.CATEGORY_DELETED },
    );
  });
