/**
 * Review Server Functions
 *
 * Server functions for review moderation including:
 * - Admin review listing
 * - Approve, reject, and delete reviews
 */

import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { getCurrentUser, normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { review, order, orderItem } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const ReviewFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  approved: z.boolean().optional(),
  rating: z.number().min(1).max(5).optional(),
  verified: z.boolean().optional(),
  sortBy: z.enum(["createdAt", "rating", "helpfulCount"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Get approved reviews for a product (public)
 */
const ProductReviewsInputSchema = z.object({
	productId: zId,
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
});

export const $getProductReviews = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ProductReviewsInputSchema, data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const page = data.data.page ?? 1;
			const limit = data.data.limit ?? 10;
			const offset = (page - 1) * limit;

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(review)
				.where(
					and(eq(review.productId, data.data.productId), eq(review.isApproved, true)),
				);

			const [stats] = await db
				.select({
					avgRating: avg(review.rating),
					totalReviews: count(),
				})
				.from(review)
				.where(
					and(eq(review.productId, data.data.productId), eq(review.isApproved, true)),
				);

			const reviews = await db.query.review.findMany({
				where: and(
					eq(review.productId, data.data.productId),
					eq(review.isApproved, true),
				),
				with: {
					user: { columns: { id: true, name: true, image: true } },
				},
				orderBy: [desc(review.createdAt)],
				limit,
				offset,
			});

			return {
				items: reviews.map((r) => ({
					id: r.id,
					rating: r.rating,
					title: r.title,
					content: r.content,
					isVerifiedPurchase: r.isVerifiedPurchase,
					helpfulCount: r.helpfulCount,
					userName: r.user?.name ?? "Anonymous",
					userImage: r.user?.image ?? null,
					createdAt: r.createdAt,
				})),
				total: Number(total),
				page,
				totalPages: Math.ceil(Number(total) / limit),
				avgRating: stats?.avgRating ? Number(stats.avgRating) : 0,
				totalReviews: Number(stats?.totalReviews ?? 0),
			};
		});
	});

/**
 * Submit a review (authenticated user - must have a delivered order for this product)
 */
const SubmitReviewSchema = z.object({
	productId: zId,
	rating: z.number().int().min(1).max(5),
	title: z.string().min(1).max(200),
	content: z.string().min(10).max(2000),
});

export const $submitReview = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(SubmitReviewSchema, data))
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const user = await getCurrentUser();
			if (!user) throw { status: 401, message: "Sign in to leave a review" };

			// Check if user has a delivered order containing this product
			const purchased = await db
				.select({ id: order.id })
				.from(order)
				.innerJoin(orderItem, eq(orderItem.orderId, order.id))
				.where(
					and(
						eq(order.userId, user.id),
						eq(order.status, "delivered"),
						sql`EXISTS (SELECT 1 FROM product_variant pv WHERE pv.id = ${orderItem.variantId} AND pv.product_id = ${data.data.productId})`,
					),
				)
				.limit(1);

			if (purchased.length === 0) {
				throw { status: 403, message: "You can only review products from your delivered orders" };
			}

			// Check if user already reviewed this product
			const existing = await db.query.review.findFirst({
				where: and(
					eq(review.userId, user.id),
					eq(review.productId, data.data.productId),
				),
				columns: { id: true },
			});

			if (existing) {
				throw { status: 400, message: "You have already reviewed this product" };
			}

			const [newReview] = await db
				.insert(review)
				.values({
					userId: user.id,
					productId: data.data.productId,
					rating: data.data.rating,
					title: data.data.title,
					content: data.data.content,
					isVerifiedPurchase: true,
					isApproved: false, // Needs admin approval
				})
				.returning();

			return newReview;
		}, { successMessage: MESSAGES.SUCCESS.REVIEW_SUBMITTED });
	});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Create a review on behalf of a customer (admin)
 */
const AdminCreateReviewSchema = z.object({
  userId: z.string().min(1),
  productId: zId,
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  isApproved: z.boolean().default(true),
});

export const $adminCreateReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(AdminCreateReviewSchema, data))
  .middleware([accessMiddleware({ permissions: { reviews: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        // Check if user already reviewed this product
        const existing = await db.query.review.findFirst({
          where: and(
            eq(review.userId, data.data.userId),
            eq(review.productId, data.data.productId),
          ),
          columns: { id: true },
        });

        if (existing) {
          throw { status: 400, message: "This user has already reviewed this product" };
        }

        // Check if verified purchase
        const purchased = await db
          .select({ id: order.id })
          .from(order)
          .innerJoin(orderItem, eq(orderItem.orderId, order.id))
          .where(
            and(
              eq(order.userId, data.data.userId),
              eq(order.status, "delivered"),
              sql`EXISTS (SELECT 1 FROM product_variant pv WHERE pv.id = ${orderItem.variantId} AND pv.product_id = ${data.data.productId})`,
            ),
          )
          .limit(1);

        const [newReview] = await db
          .insert(review)
          .values({
            userId: data.data.userId,
            productId: data.data.productId,
            rating: data.data.rating,
            title: data.data.title,
            content: data.data.content,
            isVerifiedPurchase: purchased.length > 0,
            isApproved: data.data.isApproved,
          })
          .returning();

        return newReview;
      },
      { successMessage: MESSAGES.SUCCESS.REVIEW_SUBMITTED },
    );
  });

/**
 * Get all reviews (admin)
 */
export const $adminGetReviews = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(ReviewFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { reviews: ["read"] } })])
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
            ilike(review.title, query),
            ilike(review.content, query),
          ),
        );
      }

      if (data.data.approved !== undefined) {
        conditions.push(eq(review.isApproved, data.data.approved));
      }

      if (data.data.rating !== undefined) {
        conditions.push(eq(review.rating, data.data.rating));
      }

      if (data.data.verified !== undefined) {
        conditions.push(eq(review.isVerifiedPurchase, data.data.verified));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(review).where(whereClause)
        : await db.select({ total: count() }).from(review);

      // Get pending count
      const [{ pendingCount = 0 } = {}] = await db
        .select({ pendingCount: count() })
        .from(review)
        .where(eq(review.isApproved, false));

      const sortColumn =
        params.sortBy === "rating"
          ? review.rating
          : params.sortBy === "helpfulCount"
            ? review.helpfulCount
            : review.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const reviews = await db.query.review.findMany({
        where: whereClause,
        with: {
          product: {
            columns: { id: true, name: true },
            with: {
              images: {
                where: sql`is_primary = true`,
                limit: 1,
                columns: { url: true },
              },
            },
          },
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: sortDirection,
        limit: params.limit,
        offset,
      });

      // Format reviews
      const formattedReviews = reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isApproved: r.isApproved,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        productId: r.productId,
        productName: r.product.name,
        productImage: r.product.images[0]?.url ?? null,
        userId: r.user?.id ?? null,
        userName: r.user?.name ?? null,
        userEmail: r.user?.email ?? "",
        userImage: r.user?.image ?? null,
        createdAt: r.createdAt,
      }));

      return {
        ...paginatedResult(formattedReviews, total, params),
        pendingCount: Number(pendingCount),
      };
    });
  });

/**
 * Approve a review
 */
const ReviewIdSchema = z.object({ reviewId: zId });

export const $adminApproveReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(ReviewIdSchema, data))
  .middleware([accessMiddleware({ permissions: { reviews: ["approve"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const [updated] = await db
          .update(review)
          .set({ isApproved: true, updatedAt: new Date() })
          .where(eq(review.id, data.data.reviewId))
          .returning();

        if (!updated) {
          throw { status: 404, message: "Review not found" };
        }

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.REVIEW_APPROVED },
    );
  });

/**
 * Reject a review (unapprove)
 */
export const $adminRejectReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(ReviewIdSchema, data))
  .middleware([accessMiddleware({ permissions: { reviews: ["approve"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const [updated] = await db
          .update(review)
          .set({ isApproved: false, updatedAt: new Date() })
          .where(eq(review.id, data.data.reviewId))
          .returning();

        if (!updated) {
          throw { status: 404, message: "Review not found" };
        }

        return updated;
      },
      { successMessage: "Review rejected" },
    );
  });

/**
 * Delete a review
 */
export const $adminDeleteReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(ReviewIdSchema, data))
  .middleware([accessMiddleware({ permissions: { reviews: ["delete"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const existing = await db.query.review.findFirst({
          where: eq(review.id, data.data.reviewId),
          columns: { id: true },
        });

        if (!existing) {
          throw { status: 404, message: "Review not found" };
        }

        await db.delete(review).where(eq(review.id, data.data.reviewId));

        return { deleted: true };
      },
      { successMessage: MESSAGES.SUCCESS.REVIEW_DELETED },
    );
  });
