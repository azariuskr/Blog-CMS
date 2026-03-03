/**
 * Finance Server Functions
 *
 * Server functions for the Billing & Finance admin section:
 * - Payment listing with filters
 * - Financial reports and summaries
 * - Invoice data (auto-generated from orders)
 */

import { createServerFn } from "@tanstack/react-start";
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	sql,
	sum,
} from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
	order,
	orderItem,
	payment,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { formatPrice } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const PaymentFiltersSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	search: z.string().optional(),
	status: z.array(z.enum(["pending", "completed", "failed", "refunded"])).optional(),
	provider: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	sortBy: z.enum(["createdAt", "amount", "status"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

const InvoiceFiltersSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	search: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
});

const FinancialReportSchema = z.object({
	period: z.enum(["7d", "30d", "90d", "12m", "all"]).optional(),
});

// =============================================================================
// Payments
// =============================================================================

/**
 * Get paginated payments with filters
 */
export const $adminGetPayments = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => PaymentFiltersSchema.parse(data))
	.middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const params = normalizePagination({
				page: data.page,
				limit: data.limit,
				search: data.search,
				sortBy: data.sortBy,
				sortOrder: data.sortOrder,
			});
			const offset = (params.page - 1) * params.limit;

			const conditions = [];

			if (data.status?.length) {
				conditions.push(inArray(payment.status, data.status));
			}
			if (data.provider) {
				conditions.push(eq(payment.provider, data.provider));
			}
			if (data.dateFrom) {
				conditions.push(gte(payment.createdAt, new Date(data.dateFrom)));
			}
			if (data.dateTo) {
				const endDate = new Date(data.dateTo);
				endDate.setHours(23, 59, 59, 999);
				conditions.push(lte(payment.createdAt, endDate));
			}
			if (params.search) {
				conditions.push(
					or(
						ilike(order.orderNumber, `%${params.search}%`),
						ilike(payment.providerPaymentId, `%${params.search}%`),
					),
				);
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [items, [{ total = 0 } = {}]] = await Promise.all([
				db
					.select({
						id: payment.id,
						orderId: payment.orderId,
						orderNumber: order.orderNumber,
						provider: payment.provider,
						providerPaymentId: payment.providerPaymentId,
						status: payment.status,
						amount: payment.amount,
						currency: payment.currency,
						paidAt: payment.paidAt,
						refundedAt: payment.refundedAt,
						createdAt: payment.createdAt,
						customerEmail: order.guestEmail,
						orderTotal: order.total,
						orderStatus: order.status,
					})
					.from(payment)
					.innerJoin(order, eq(payment.orderId, order.id))
					.where(where)
					.orderBy(
						data.sortBy === "amount"
							? data.sortOrder === "asc"
								? payment.amount
								: desc(payment.amount)
							: desc(payment.createdAt),
					)
					.limit(params.limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(payment)
					.innerJoin(order, eq(payment.orderId, order.id))
					.where(where),
			]);

			return paginatedResult(items, Number(total), params);
		});
	});

/**
 * Get payment statistics summary
 */
export const $getPaymentStats = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			const now = new Date();
			const thirtyDaysAgo = new Date(now);
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const [totals] = await db
				.select({
					totalPayments: count(),
					totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payment.status} = 'completed' THEN ${payment.amount} ELSE 0 END), 0)`,
					totalRefunded: sql<number>`COALESCE(SUM(CASE WHEN ${payment.status} = 'refunded' THEN ${payment.amount} ELSE 0 END), 0)`,
					pendingCount: sql<number>`COUNT(CASE WHEN ${payment.status} = 'pending' THEN 1 END)`,
					completedCount: sql<number>`COUNT(CASE WHEN ${payment.status} = 'completed' THEN 1 END)`,
					failedCount: sql<number>`COUNT(CASE WHEN ${payment.status} = 'failed' THEN 1 END)`,
					refundedCount: sql<number>`COUNT(CASE WHEN ${payment.status} = 'refunded' THEN 1 END)`,
				})
				.from(payment);

			const [last30Days] = await db
				.select({
					totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payment.status} = 'completed' THEN ${payment.amount} ELSE 0 END), 0)`,
					count: count(),
				})
				.from(payment)
				.where(gte(payment.createdAt, thirtyDaysAgo));

			return {
				allTime: {
					totalPayments: Number(totals?.totalPayments ?? 0),
					totalAmount: Number(totals?.totalAmount ?? 0),
					totalAmountFormatted: formatPrice(Number(totals?.totalAmount ?? 0)),
					totalRefunded: Number(totals?.totalRefunded ?? 0),
					totalRefundedFormatted: formatPrice(Number(totals?.totalRefunded ?? 0)),
					netRevenue: Number(totals?.totalAmount ?? 0) - Number(totals?.totalRefunded ?? 0),
					netRevenueFormatted: formatPrice(
						Number(totals?.totalAmount ?? 0) - Number(totals?.totalRefunded ?? 0),
					),
					pendingCount: Number(totals?.pendingCount ?? 0),
					completedCount: Number(totals?.completedCount ?? 0),
					failedCount: Number(totals?.failedCount ?? 0),
					refundedCount: Number(totals?.refundedCount ?? 0),
				},
				last30Days: {
					totalAmount: Number(last30Days?.totalAmount ?? 0),
					totalAmountFormatted: formatPrice(Number(last30Days?.totalAmount ?? 0)),
					count: Number(last30Days?.count ?? 0),
				},
			};
		});
	});

// =============================================================================
// Invoices (generated from paid orders)
// =============================================================================

/**
 * Get paginated invoices (derived from completed orders with payments)
 */
export const $adminGetInvoices = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => InvoiceFiltersSchema.parse(data))
	.middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const params = normalizePagination({
				page: data.page,
				limit: data.limit,
				search: data.search,
			});
			const offset = (params.page - 1) * params.limit;

			const conditions = [
				inArray(order.status, ["confirmed", "processing", "shipped", "delivered"]),
			];

			if (params.search) {
				conditions.push(
					or(
						ilike(order.orderNumber, `%${params.search}%`),
						ilike(order.guestEmail, `%${params.search}%`),
					)!,
				);
			}
			if (data.dateFrom) {
				conditions.push(gte(order.createdAt, new Date(data.dateFrom)));
			}
			if (data.dateTo) {
				const endDate = new Date(data.dateTo);
				endDate.setHours(23, 59, 59, 999);
				conditions.push(lte(order.createdAt, endDate));
			}

			const where = and(...conditions);

			const [items, [{ total = 0 } = {}]] = await Promise.all([
				db
					.select({
						id: order.id,
						orderNumber: order.orderNumber,
						customerEmail: order.guestEmail,
						userId: order.userId,
						status: order.status,
						subtotal: order.subtotal,
						discount: order.discount,
						shippingCost: order.shippingCost,
						tax: order.tax,
						total: order.total,
						couponCode: order.couponCode,
						shippingAddress: order.shippingAddress,
						billingAddress: order.billingAddress,
						createdAt: order.createdAt,
					})
					.from(order)
					.where(where)
					.orderBy(desc(order.createdAt))
					.limit(params.limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(order)
					.where(where),
			]);

			return paginatedResult(items, Number(total), params);
		});
	});

/**
 * Get invoice detail (order + items + payment info)
 */
export const $adminGetInvoiceDetail = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
	.middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const result = await db.query.order.findFirst({
				where: eq(order.id, data.orderId),
				with: {
					items: true,
					payments: true,
				},
			});

			if (!result) throw new Error("Order not found");
			return result;
		});
	});

// =============================================================================
// Financial Reports
// =============================================================================

/**
 * Get financial report data for a given period
 */
export const $getFinancialReport = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => FinancialReportSchema.parse(data))
	.middleware([accessMiddleware({ permissions: { orders: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const period = data.period ?? "30d";
			const now = new Date();
			let startDate: Date;

			switch (period) {
				case "7d":
					startDate = new Date(now);
					startDate.setDate(startDate.getDate() - 7);
					break;
				case "30d":
					startDate = new Date(now);
					startDate.setDate(startDate.getDate() - 30);
					break;
				case "90d":
					startDate = new Date(now);
					startDate.setDate(startDate.getDate() - 90);
					break;
				case "12m":
					startDate = new Date(now);
					startDate.setMonth(startDate.getMonth() - 12);
					break;
				default:
					startDate = new Date(0);
			}
			startDate.setHours(0, 0, 0, 0);

			const validStatuses = ["confirmed", "processing", "shipped", "delivered"] as const;
			const dateCondition = period === "all" ? undefined : gte(order.createdAt, startDate);

			// Revenue summary
			const [revenueSummary] = await db
				.select({
					totalOrders: count(),
					grossRevenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
					totalDiscount: sql<number>`COALESCE(SUM(${order.discount}), 0)`,
					totalShipping: sql<number>`COALESCE(SUM(${order.shippingCost}), 0)`,
					totalTax: sql<number>`COALESCE(SUM(${order.tax}), 0)`,
					subtotal: sql<number>`COALESCE(SUM(${order.subtotal}), 0)`,
					avgOrderValue: sql<number>`COALESCE(AVG(${order.total}), 0)`,
				})
				.from(order)
				.where(
					and(
						inArray(order.status, [...validStatuses]),
						dateCondition,
					),
				);

			// Cancelled/refunded totals
			const [cancelledStats] = await db
				.select({
					cancelledCount: sql<number>`COUNT(CASE WHEN ${order.status} = 'cancelled' THEN 1 END)`,
					refundedCount: sql<number>`COUNT(CASE WHEN ${order.status} = 'refunded' THEN 1 END)`,
					refundedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${order.status} = 'refunded' THEN ${order.total} ELSE 0 END), 0)`,
				})
				.from(order)
				.where(dateCondition);

			// Daily revenue for chart (use appropriate grouping for longer periods)
			const isMonthly = period === "12m" || period === "all";
			const dateGroup = isMonthly
				? sql`TO_CHAR(${order.createdAt}, 'YYYY-MM')`
				: sql`DATE(${order.createdAt})`;

			const revenueByPeriod = await db
				.select({
					date: dateGroup.as("date"),
					revenue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
					orders: count(),
					discount: sql<number>`COALESCE(SUM(${order.discount}), 0)`,
				})
				.from(order)
				.where(
					and(
						inArray(order.status, [...validStatuses]),
						dateCondition,
					),
				)
				.groupBy(dateGroup)
				.orderBy(dateGroup);

			// Top products by revenue
			const topProducts = await db
				.select({
					productName: orderItem.productName,
					totalQuantity: sql<number>`SUM(${orderItem.quantity})`,
					totalRevenue: sql<number>`SUM(${orderItem.totalPrice})`,
					orderCount: sql<number>`COUNT(DISTINCT ${orderItem.orderId})`,
				})
				.from(orderItem)
				.innerJoin(order, eq(orderItem.orderId, order.id))
				.where(
					and(
						inArray(order.status, [...validStatuses]),
						dateCondition,
					),
				)
				.groupBy(orderItem.productName)
				.orderBy(desc(sql`SUM(${orderItem.totalPrice})`))
				.limit(10);

			// Payment method breakdown
			const paymentBreakdown = await db
				.select({
					provider: payment.provider,
					count: count(),
					totalAmount: sql<number>`COALESCE(SUM(${payment.amount}), 0)`,
				})
				.from(payment)
				.where(
					and(
						eq(payment.status, "completed"),
						period === "all" ? undefined : gte(payment.createdAt, startDate),
					),
				)
				.groupBy(payment.provider);

			// Coupon usage
			const couponUsage = await db
				.select({
					couponCode: order.couponCode,
					usageCount: count(),
					totalDiscount: sql<number>`COALESCE(SUM(${order.discount}), 0)`,
					totalOrderValue: sql<number>`COALESCE(SUM(${order.total}), 0)`,
				})
				.from(order)
				.where(
					and(
						inArray(order.status, [...validStatuses]),
						dateCondition,
						sql`${order.couponCode} IS NOT NULL`,
					),
				)
				.groupBy(order.couponCode)
				.orderBy(desc(sql`COUNT(*)`))
				.limit(10);

			return {
				period,
				revenue: {
					grossRevenue: Number(revenueSummary?.grossRevenue ?? 0),
					grossRevenueFormatted: formatPrice(Number(revenueSummary?.grossRevenue ?? 0)),
					subtotal: Number(revenueSummary?.subtotal ?? 0),
					subtotalFormatted: formatPrice(Number(revenueSummary?.subtotal ?? 0)),
					totalDiscount: Number(revenueSummary?.totalDiscount ?? 0),
					totalDiscountFormatted: formatPrice(Number(revenueSummary?.totalDiscount ?? 0)),
					totalShipping: Number(revenueSummary?.totalShipping ?? 0),
					totalShippingFormatted: formatPrice(Number(revenueSummary?.totalShipping ?? 0)),
					totalTax: Number(revenueSummary?.totalTax ?? 0),
					totalTaxFormatted: formatPrice(Number(revenueSummary?.totalTax ?? 0)),
					totalOrders: Number(revenueSummary?.totalOrders ?? 0),
					avgOrderValue: Math.round(Number(revenueSummary?.avgOrderValue ?? 0)),
					avgOrderValueFormatted: formatPrice(Math.round(Number(revenueSummary?.avgOrderValue ?? 0))),
					netRevenue:
						Number(revenueSummary?.grossRevenue ?? 0) -
						Number(cancelledStats?.refundedAmount ?? 0),
					netRevenueFormatted: formatPrice(
						Number(revenueSummary?.grossRevenue ?? 0) -
						Number(cancelledStats?.refundedAmount ?? 0),
					),
				},
				cancellations: {
					cancelledCount: Number(cancelledStats?.cancelledCount ?? 0),
					refundedCount: Number(cancelledStats?.refundedCount ?? 0),
					refundedAmount: Number(cancelledStats?.refundedAmount ?? 0),
					refundedAmountFormatted: formatPrice(Number(cancelledStats?.refundedAmount ?? 0)),
				},
				revenueByPeriod: revenueByPeriod.map((r) => ({
					date: String(r.date),
					revenue: Number(r.revenue),
					orders: Number(r.orders),
					discount: Number(r.discount),
				})),
				topProducts: topProducts.map((p) => ({
					productName: p.productName,
					totalQuantity: Number(p.totalQuantity),
					totalRevenue: Number(p.totalRevenue),
					totalRevenueFormatted: formatPrice(Number(p.totalRevenue)),
					orderCount: Number(p.orderCount),
				})),
				paymentBreakdown: paymentBreakdown.map((p) => ({
					provider: p.provider,
					count: Number(p.count),
					totalAmount: Number(p.totalAmount),
					totalAmountFormatted: formatPrice(Number(p.totalAmount)),
				})),
				couponUsage: couponUsage.map((c) => ({
					couponCode: c.couponCode,
					usageCount: Number(c.usageCount),
					totalDiscount: Number(c.totalDiscount),
					totalDiscountFormatted: formatPrice(Number(c.totalDiscount)),
					totalOrderValue: Number(c.totalOrderValue),
					totalOrderValueFormatted: formatPrice(Number(c.totalOrderValue)),
				})),
			};
		});
	});
