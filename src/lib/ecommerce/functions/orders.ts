/**
 * Order Server Functions
 *
 * Server functions for order management including:
 * - Admin order listing and detail
 * - Status updates and fulfillment
 * - Shipping and tracking
 * - Cancellation and refunds
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
import { normalizePagination, paginatedResult, getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  order,
  productVariant,
  product,
  stockAdjustment,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES, formatPrice, SHIPPING_CARRIERS } from "@/constants";
import {
  sendOrderShippedEvent,
  sendOrderDeliveredEvent,
  sendOrderCancelledEvent,
} from "@/lib/inngest/ecommerce-events";

// =============================================================================
// Schemas
// =============================================================================

const OrderFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  search: z.string().optional(),
  status: z
    .array(
      z.enum([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ]),
    )
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["createdAt", "total", "orderNumber"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const UpdateOrderStatusSchema = z.object({
  orderId: zId,
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  notes: z.string().optional(),
});

const AddShipmentSchema = z.object({
  orderId: zId,
  trackingNumber: z.string().min(1),
  carrier: z.enum(SHIPPING_CARRIERS as unknown as [string, ...string[]]),
  trackingUrl: z.string().url().optional(),
});

const CancelOrderSchema = z.object({
  orderId: zId,
  reason: z.string().optional(),
  restockItems: z.boolean().default(true),
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get all orders (admin)
 */
export const $adminGetOrders = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => validate(OrderFiltersSchema, data))
  .middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
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

      // Search
      if (params.search) {
        const query = `%${params.search}%`;
        conditions.push(
          or(
            ilike(order.orderNumber, query),
            ilike(order.guestEmail, query),
            sql`EXISTS (SELECT 1 FROM "user" WHERE "user".id = "order".user_id AND ("user".email ILIKE ${query} OR "user".name ILIKE ${query}))`,
          ),
        );
      }

      // Status filter
      if (data.data.status && data.data.status.length > 0) {
        conditions.push(inArray(order.status, data.data.status));
      }

      // Date range
      if (data.data.dateFrom) {
        conditions.push(gte(order.createdAt, new Date(data.data.dateFrom)));
      }
      if (data.data.dateTo) {
        conditions.push(lte(order.createdAt, new Date(data.data.dateTo)));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total = 0 } = {}] = whereClause
        ? await db.select({ total: count() }).from(order).where(whereClause)
        : await db.select({ total: count() }).from(order);

      // Sort
      const sortColumn =
        params.sortBy === "total"
          ? order.total
          : params.sortBy === "orderNumber"
            ? order.orderNumber
            : order.createdAt;
      const sortDirection =
        params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Get orders
      const orders = await db.query.order.findMany({
        where: whereClause,
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
          items: {
            columns: { id: true, quantity: true },
          },
          payments: {
            columns: { id: true, status: true, amount: true },
            limit: 1,
          },
        },
        orderBy: sortDirection,
        limit: params.limit,
        offset,
      });

      // Format orders
      const formattedOrders = orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        totalFormatted: formatPrice(o.total),
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        customer: o.user
          ? {
              id: o.user.id,
              name: o.user.name,
              email: o.user.email,
              image: o.user.image,
            }
          : {
              id: null,
              name: "Guest",
              email: o.guestEmail,
              image: null,
            },
        paymentStatus: o.payments[0]?.status || "pending",
        createdAt: o.createdAt,
        shippedAt: o.shippedAt,
        deliveredAt: o.deliveredAt,
      }));

      return paginatedResult(formattedOrders, total, params);
    });
  });

/**
 * Get single order detail (admin)
 */
export const $adminGetOrder = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ id: zId }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      console.log("[DEBUG] $adminGetOrder called with id:", data.id);
      const orderData = await db.query.order.findFirst({
        where: eq(order.id, data.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
            },
          },
          items: {
            with: {
              variant: {
                with: {
                  product: {
                    columns: { id: true, name: true, slug: true },
                  },
                  color: true,
                  size: true,
                },
              },
            },
          },
          payments: true,
          coupon: {
            columns: { id: true, code: true, discountType: true, discountValue: true },
          },
        },
      });

      console.log("[DEBUG] orderData found:", !!orderData, orderData?.id);
      if (!orderData) {
        throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
      }

      return {
        ...orderData,
        subtotalFormatted: formatPrice(orderData.subtotal),
        discountFormatted: formatPrice(orderData.discount),
        shippingCostFormatted: formatPrice(orderData.shippingCost),
        taxFormatted: formatPrice(orderData.tax),
        totalFormatted: formatPrice(orderData.total),
        items: orderData.items.map((item) => ({
          ...item,
          unitPriceFormatted: formatPrice(item.unitPrice),
          totalPriceFormatted: formatPrice(item.totalPrice),
        })),
      };
    });
  });

/**
 * Update order status
 */
export const $adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateOrderStatusSchema, data))
  .middleware([accessMiddleware({ permissions: { orders: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const currentUser = await getCurrentUser();

        const orderData = await db.query.order.findFirst({
          where: eq(order.id, data.data.orderId),
          with: {
            user: { columns: { email: true } },
          },
        });

        if (!orderData) {
          throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
        }

        const updates: Partial<typeof order.$inferInsert> = {
          status: data.data.status,
          updatedAt: new Date(),
        };

        // Set timestamps based on status
        if (data.data.status === "delivered") {
          updates.deliveredAt = new Date();
          updates.completedAt = new Date();
        } else if (data.data.status === "cancelled") {
          updates.cancelledAt = new Date();
        }

        // Add internal note if provided
        if (data.data.notes) {
          const existingNotes = orderData.internalNotes || "";
          const timestamp = new Date().toISOString();
          const noteEntry = `[${timestamp}] Status changed to ${data.data.status} by ${currentUser?.email}: ${data.data.notes}`;
          updates.internalNotes = existingNotes
            ? `${existingNotes}\n${noteEntry}`
            : noteEntry;
        }

        const [updated] = await db
          .update(order)
          .set(updates)
          .where(eq(order.id, data.data.orderId))
          .returning();

        // Send events for certain status changes
        const email = orderData.user?.email || orderData.guestEmail;
        if (email) {
          if (data.data.status === "delivered") {
            await sendOrderDeliveredEvent({
              orderId: orderData.id,
              orderNumber: orderData.orderNumber,
              userId: orderData.userId ?? undefined,
              email,
            });
          }
        }

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.ORDER_UPDATED },
    );
  });

/**
 * Add shipment tracking to order
 */
export const $adminAddShipment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(AddShipmentSchema, data))
  .middleware([accessMiddleware({ permissions: { orders: ["fulfill"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const orderData = await db.query.order.findFirst({
          where: eq(order.id, data.data.orderId),
          with: {
            user: { columns: { email: true } },
          },
        });

        if (!orderData) {
          throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
        }

        // Determine tracking URL
        let trackingUrl = data.data.trackingUrl;
        if (!trackingUrl) {
          const carrierUrls: Record<string, string> = {
            USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${data.data.trackingNumber}`,
            UPS: `https://www.ups.com/track?tracknum=${data.data.trackingNumber}`,
            FedEx: `https://www.fedex.com/fedextrack/?trknbr=${data.data.trackingNumber}`,
            DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${data.data.trackingNumber}`,
          };
          trackingUrl = carrierUrls[data.data.carrier] || undefined;
        }

        const [updated] = await db
          .update(order)
          .set({
            trackingNumber: data.data.trackingNumber,
            carrier: data.data.carrier,
            trackingUrl,
            status: "shipped",
            shippedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(order.id, data.data.orderId))
          .returning();

        // Send shipped notification
        const email = orderData.user?.email || orderData.guestEmail;
        if (email) {
          await sendOrderShippedEvent({
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            userId: orderData.userId ?? undefined,
            email,
            trackingNumber: data.data.trackingNumber,
            carrier: data.data.carrier,
            trackingUrl,
          });
        }

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.ORDER_SHIPPED },
    );
  });

/**
 * Cancel order
 */
export const $adminCancelOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CancelOrderSchema, data))
  .middleware([accessMiddleware({ permissions: { orders: ["cancel"] } })])
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const currentUser = await getCurrentUser();

        const orderData = await db.query.order.findFirst({
          where: eq(order.id, data.data.orderId),
          with: {
            user: { columns: { email: true } },
            items: true,
          },
        });

        if (!orderData) {
          throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
        }

        // Check if can be cancelled
        if (
          ["delivered", "cancelled", "refunded"].includes(orderData.status)
        ) {
          throw {
            status: 400,
            message: `Cannot cancel order with status: ${orderData.status}`,
          };
        }

        // Restock items if requested
        if (data.data.restockItems) {
          for (const item of orderData.items) {
            if (!item.variantId) continue;

            const variant = await db.query.productVariant.findFirst({
              where: eq(productVariant.id, item.variantId),
            });

            if (variant) {
              const previousStock = variant.stock;
              const newStock = previousStock + item.quantity;

              await db
                .update(productVariant)
                .set({
                  stock: newStock,
                  updatedAt: new Date(),
                })
                .where(eq(productVariant.id, item.variantId));

              // Log stock adjustment
              await db.insert(stockAdjustment).values({
                variantId: item.variantId,
                previousStock,
                newStock,
                adjustment: item.quantity,
                reason: "return",
                orderId: orderData.id,
                userId: currentUser?.id,
                notes: `Order ${orderData.orderNumber} cancelled`,
              });

              // Update product total stock
              await db
                .update(product)
                .set({
                  totalStock: sql`${product.totalStock} + ${item.quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(product.id, variant.productId));
            }
          }
        }

        // Update order
        const [updated] = await db
          .update(order)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            internalNotes: orderData.internalNotes
              ? `${orderData.internalNotes}\n[${new Date().toISOString()}] Cancelled: ${data.data.reason || "No reason provided"}`
              : `[${new Date().toISOString()}] Cancelled: ${data.data.reason || "No reason provided"}`,
            updatedAt: new Date(),
          })
          .where(eq(order.id, data.data.orderId))
          .returning();

        // Send cancellation notification
        const email = orderData.user?.email || orderData.guestEmail;
        if (email) {
          await sendOrderCancelledEvent({
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            userId: orderData.userId ?? undefined,
            email,
            reason: data.data.reason,
          });
        }

        return updated;
      },
      { successMessage: MESSAGES.SUCCESS.ORDER_CANCELLED },
    );
  });

/**
 * Get order statistics
 */
export const $getOrderStats = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get counts by status
      const statusCounts = await db
        .select({
          status: order.status,
          count: count(),
        })
        .from(order)
        .groupBy(order.status);

      // Get today's orders and revenue
      const [todayStats] = await db
        .select({
          orderCount: count(),
          revenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
        })
        .from(order)
        .where(
          and(
            gte(order.createdAt, todayStart),
            inArray(order.status, ["confirmed", "processing", "shipped", "delivered"]),
          ),
        );

      // Get this week's stats
      const [weekStats] = await db
        .select({
          orderCount: count(),
          revenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
        })
        .from(order)
        .where(
          and(
            gte(order.createdAt, weekStart),
            inArray(order.status, ["confirmed", "processing", "shipped", "delivered"]),
          ),
        );

      // Get this month's stats
      const [monthStats] = await db
        .select({
          orderCount: count(),
          revenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
        })
        .from(order)
        .where(
          and(
            gte(order.createdAt, monthStart),
            inArray(order.status, ["confirmed", "processing", "shipped", "delivered"]),
          ),
        );

      // Pending orders count
      const [{ pendingCount = 0 } = {}] = await db
        .select({ pendingCount: count() })
        .from(order)
        .where(eq(order.status, "pending"));

      // Orders needing fulfillment
      const [{ needsFulfillment = 0 } = {}] = await db
        .select({ needsFulfillment: count() })
        .from(order)
        .where(inArray(order.status, ["confirmed", "processing"]));

      return {
        statusCounts: Object.fromEntries(
          statusCounts.map((s) => [s.status, Number(s.count)]),
        ),
        today: {
          orderCount: todayStats?.orderCount || 0,
          revenue: Number(todayStats?.revenue || 0),
          revenueFormatted: formatPrice(Number(todayStats?.revenue || 0)),
        },
        week: {
          orderCount: weekStats?.orderCount || 0,
          revenue: Number(weekStats?.revenue || 0),
          revenueFormatted: formatPrice(Number(weekStats?.revenue || 0)),
        },
        month: {
          orderCount: monthStats?.orderCount || 0,
          revenue: Number(monthStats?.revenue || 0),
          revenueFormatted: formatPrice(Number(monthStats?.revenue || 0)),
        },
        pendingCount: Number(pendingCount),
        needsFulfillment: Number(needsFulfillment),
      };
    });
  });

/**
 * Get daily revenue data for the last N days (default 30)
 * Returns array of { date, revenue, orders } for charting
 */
export const $getDailyRevenue = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ days: z.number().int().positive().max(90).optional() }).parse(data),
  )
  .middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      const days = data.days ?? 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const dailyData = await db
        .select({
          date: sql<string>`DATE(${order.createdAt})`.as("date"),
          revenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
          orders: count(),
        })
        .from(order)
        .where(
          and(
            gte(order.createdAt, startDate),
            inArray(order.status, ["confirmed", "processing", "shipped", "delivered"]),
          ),
        )
        .groupBy(sql`DATE(${order.createdAt})`)
        .orderBy(sql`DATE(${order.createdAt})`);

      // Fill in missing days with 0s
      const result: Array<{ date: string; revenue: number; orders: number }> = [];
      const dataMap = new Map(
        dailyData.map((d) => [d.date, { revenue: Number(d.revenue), orders: Number(d.orders) }]),
      );

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const dayData = dataMap.get(dateStr);
        result.push({
          date: dateStr,
          revenue: dayData?.revenue ?? 0,
          orders: dayData?.orders ?? 0,
        });
      }

      return result;
    });
  });

// =============================================================================
// Customer-Facing Functions
// =============================================================================

/**
 * Get current user's orders
 */
export const $getMyOrders = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        status: z
          .enum([
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
          ])
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return safe(async () => {
      const user = await getCurrentUser();
      if (!user) throw { status: 401, message: MESSAGES.ERROR.UNAUTHORIZED };

      const page = data.page ?? 1;
      const limit = Math.min(data.limit ?? 10, 50);
      const offset = (page - 1) * limit;

      const conditions = [eq(order.userId, user.id)];
      if (data.status) {
        conditions.push(eq(order.status, data.status));
      }

      const whereClause = and(...conditions);

      const [{ total = 0 } = {}] = await db
        .select({ total: count() })
        .from(order)
        .where(whereClause);

      const orders = await db.query.order.findMany({
        where: whereClause,
        with: {
          items: {
            columns: { id: true, productName: true, quantity: true, unitPrice: true, totalPrice: true },
          },
          payments: {
            columns: { id: true, status: true },
            limit: 1,
          },
        },
        orderBy: desc(order.createdAt),
        limit,
        offset,
      });

      const items = orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        totalFormatted: formatPrice(o.total),
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        itemSummary: o.items
          .slice(0, 3)
          .map((i) => i.productName)
          .join(", "),
        paymentStatus: o.payments[0]?.status || "pending",
        trackingNumber: o.trackingNumber,
        carrier: o.carrier,
        trackingUrl: o.trackingUrl,
        createdAt: o.createdAt,
        shippedAt: o.shippedAt,
        deliveredAt: o.deliveredAt,
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  });

/**
 * Get single order detail for current user
 */
export const $getMyOrder = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ id: zId }).parse(data),
  )
  .handler(async ({ data }) => {
    return safe(async () => {
      const user = await getCurrentUser();
      if (!user) throw { status: 401, message: MESSAGES.ERROR.UNAUTHORIZED };

      const orderData = await db.query.order.findFirst({
        where: and(eq(order.id, data.id), eq(order.userId, user.id)),
        with: {
          items: {
            with: {
              variant: {
                with: {
                  product: {
                    columns: { id: true, name: true, slug: true },
                  },
                  color: true,
                  size: true,
                },
              },
            },
          },
          payments: {
            columns: { id: true, status: true, provider: true, paidAt: true },
          },
          coupon: {
            columns: { id: true, code: true, discountType: true, discountValue: true },
          },
        },
      });

      if (!orderData) {
        throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
      }

      return {
        id: orderData.id,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        subtotal: orderData.subtotal,
        subtotalFormatted: formatPrice(orderData.subtotal),
        discount: orderData.discount,
        discountFormatted: formatPrice(orderData.discount),
        shippingCost: orderData.shippingCost,
        shippingCostFormatted: formatPrice(orderData.shippingCost),
        tax: orderData.tax,
        taxFormatted: formatPrice(orderData.tax),
        total: orderData.total,
        totalFormatted: formatPrice(orderData.total),
        couponCode: orderData.couponCode,
        trackingNumber: orderData.trackingNumber,
        carrier: orderData.carrier,
        trackingUrl: orderData.trackingUrl,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        customerNotes: orderData.customerNotes,
        createdAt: orderData.createdAt,
        shippedAt: orderData.shippedAt,
        deliveredAt: orderData.deliveredAt,
        completedAt: orderData.completedAt,
        items: orderData.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantSku: item.variantSku,
          variantOptions: item.variantOptions,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitPriceFormatted: formatPrice(item.unitPrice),
          totalPrice: item.totalPrice,
          totalPriceFormatted: formatPrice(item.totalPrice),
          product: item.variant?.product ?? null,
        })),
        payment: orderData.payments[0] ?? null,
      };
    });
  });

/**
 * Get order facets for filtering
 */
export const $getOrderFacets = createServerFn({ method: "GET" })
  .middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
  .handler(async () => {
    return safe(async () => {
      const statusCounts = await db
        .select({
          status: order.status,
          count: count(),
        })
        .from(order)
        .groupBy(order.status);

      return {
        statusCounts: Object.fromEntries(
          statusCounts.map((s) => [s.status, Number(s.count)]),
        ),
      };
    });
  });
