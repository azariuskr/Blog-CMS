/**
 * Coupon Server Functions
 *
 * Server functions for coupon management including:
 * - Admin coupon listing, detail, CRUD
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
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { coupon } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const CouponFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  active: z.boolean().optional(),
  discountType: z.enum(["percentage", "fixed_amount"]).optional(),
  expired: z.boolean().optional(),
  sortBy: z.enum(["createdAt", "code", "usageCount", "expiresAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const CreateCouponSchema = z.object({
  code: z.string().min(1).max(50).transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().int().min(1),
  minOrderAmount: z.number().int().min(0).optional(),
  maxDiscountAmount: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerUser: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const UpdateCouponSchema = CreateCouponSchema.partial().extend({
  couponId: zId,
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get all coupons (admin)
 */
export const $adminGetCoupons = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(CouponFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { coupons: ["read"] } })])
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
          or(ilike(coupon.code, query), ilike(coupon.description, query)),
        );
      }

      if (data.data.active !== undefined) {
        conditions.push(eq(coupon.isActive, data.data.active));
      }

      if (data.data.discountType) {
        conditions.push(eq(coupon.discountType, data.data.discountType));
      }

      if (data.data.expired === true) {
        conditions.push(lte(coupon.expiresAt, new Date()));
      } else if (data.data.expired === false) {
        conditions.push(
          or(
            gte(coupon.expiresAt, new Date()),
            sql`${coupon.expiresAt} IS NULL`,
          ),
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(coupon).where(whereClause)
        : await db.select({ total: count() }).from(coupon);

      const sortColumn =
        params.sortBy === "code"
          ? coupon.code
          : params.sortBy === "usageCount"
            ? coupon.usageCount
            : params.sortBy === "expiresAt"
              ? coupon.expiresAt
              : coupon.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const coupons = await db.query.coupon.findMany({
        where: whereClause,
        orderBy: sortDirection,
        limit: params.limit,
        offset,
      });

      return paginatedResult(coupons, total, params);
    });
  });

/**
 * Get single coupon (admin)
 */
export const $adminGetCoupon = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ couponId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { coupons: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const result = await db.query.coupon.findFirst({
        where: eq(coupon.id, data.couponId),
        with: {
          usages: {
            limit: 20,
            with: {
              user: { columns: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!result) {
        throw { status: 404, message: "Coupon not found" };
      }

      return result;
    });
  });

/**
 * Create a new coupon
 */
export const $adminCreateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateCouponSchema, data))
  .middleware([accessMiddleware({ permissions: { coupons: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        // Check for duplicate code
        const existing = await db.query.coupon.findFirst({
          where: eq(coupon.code, data.data.code),
          columns: { id: true },
        });

        if (existing) {
          throw { status: 400, message: "A coupon with this code already exists" };
        }

        const [newCoupon] = await db
          .insert(coupon)
          .values({
            code: data.data.code,
            description: data.data.description,
            discountType: data.data.discountType,
            discountValue: data.data.discountValue,
            minOrderAmount: data.data.minOrderAmount,
            maxDiscountAmount: data.data.maxDiscountAmount,
            usageLimit: data.data.usageLimit,
            usageLimitPerUser: data.data.usageLimitPerUser,
            isActive: data.data.isActive,
            startsAt: data.data.startsAt ? new Date(data.data.startsAt) : undefined,
            expiresAt: data.data.expiresAt ? new Date(data.data.expiresAt) : undefined,
          })
          .returning();

        return newCoupon;
      },
      { successMessage: MESSAGES.SUCCESS.COUPON_CREATED },
    );
  });

/**
 * Update a coupon
 */
export const $adminUpdateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateCouponSchema, data))
  .middleware([accessMiddleware({ permissions: { coupons: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const { couponId, ...updateData } = data.data;

        const existing = await db.query.coupon.findFirst({
          where: eq(coupon.id, couponId),
          columns: { id: true, code: true },
        });

        if (!existing) {
          throw { status: 404, message: "Coupon not found" };
        }

        // Check for duplicate code if changing
        if (updateData.code && updateData.code !== existing.code) {
          const codeExists = await db.query.coupon.findFirst({
            where: and(
              eq(coupon.code, updateData.code),
              sql`${coupon.id} != ${couponId}`,
            ),
            columns: { id: true },
          });

          if (codeExists) {
            throw { status: 400, message: "A coupon with this code already exists" };
          }
        }

        const [updated] = await db
          .update(coupon)
          .set({
            ...updateData,
            startsAt: updateData.startsAt ? new Date(updateData.startsAt) : undefined,
            expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(coupon.id, couponId))
          .returning();

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.COUPON_UPDATED },
    );
  });

/**
 * Delete a coupon
 */
export const $adminDeleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ couponId: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { coupons: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const existing = await db.query.coupon.findFirst({
          where: eq(coupon.id, data.couponId),
          columns: { id: true },
        });

        if (!existing) {
          throw { status: 404, message: "Coupon not found" };
        }

        await db.delete(coupon).where(eq(coupon.id, data.couponId));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.COUPON_DELETED },
    );
  });
