/**
 * Customer Server Functions
 *
 * Server functions for e-commerce customer aggregation.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  and,
  count,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { order, user } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate } from "@/lib/validation";

// =============================================================================
// Schemas
// =============================================================================

const CustomerFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  hasOrders: z.boolean().optional(),
  sortBy: z.enum(["createdAt", "email", "name", "orderCount"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get customers with order aggregation (admin)
 */
export const $adminGetCustomers = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(CustomerFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { customers: ["read"] } })])
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

      // Build customer query with order aggregation
      const conditions = [];

      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(
          or(ilike(user.name, query), ilike(user.email, query)),
        );
      }

      if (data.data.hasOrders === true) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM "order" WHERE "order".user_id = "user".id)`,
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(user).where(whereClause)
        : await db.select({ total: count() }).from(user);

      // Determine sort
      const sortDirection = params.sortOrder === "desc" ? "DESC" : "ASC";
      const sortExpr =
        params.sortBy === "orderCount"
          ? sql`order_count ${sql.raw(sortDirection)}`
          : params.sortBy === "email"
            ? sql`${user.email} ${sql.raw(sortDirection)}`
            : params.sortBy === "name"
              ? sql`${user.name} ${sql.raw(sortDirection)}`
              : sql`${user.createdAt} ${sql.raw(sortDirection)}`;

      // Query customers with aggregated order data
      const customers = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          orderCount: sql<number>`COALESCE(COUNT("order".id), 0)`.as("order_count"),
          totalSpent: sql<number>`COALESCE(SUM("order".total), 0)`.as("total_spent"),
          lastOrderAt: sql<Date | null>`MAX("order".created_at)`.as("last_order_at"),
          avgOrderValue: sql<number>`COALESCE(AVG("order".total), 0)`.as("avg_order_value"),
        })
        .from(user)
        .leftJoin(order, eq(order.userId, user.id))
        .where(whereClause)
        .groupBy(user.id, user.name, user.email, user.image, user.createdAt)
        .orderBy(sortExpr)
        .limit(params.limit)
        .offset(offset);

      const formattedCustomers = customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        image: c.image,
        orderCount: Number(c.orderCount),
        totalSpent: Number(c.totalSpent),
        lastOrderAt: c.lastOrderAt,
        createdAt: c.createdAt,
      }));

      return paginatedResult(formattedCustomers, total, params);
    });
  });
