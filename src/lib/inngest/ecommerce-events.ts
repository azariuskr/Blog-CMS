/**
 * E-Commerce Inngest Events
 *
 * Event schemas and senders for e-commerce operations.
 */

import { z } from "zod";

import { db } from "@/lib/db";
import { analyticsEvent } from "@/lib/db/schema";
import { inngest } from "./client";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export type SendResult = { success: true } | { success: false; error: string };

// =============================================================================
// Event Schemas
// =============================================================================

export const orderCreatedSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().optional(), // Optional for guest checkout
  email: z.string().email(),
  total: z.number(),
  itemCount: z.number(),
});
export type OrderCreatedPayload = z.infer<typeof orderCreatedSchema>;

export const orderPaidSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().optional(),
  email: z.string().email(),
  total: z.number(),
  paymentId: z.string(),
  provider: z.enum(["stripe", "polar"]),
});
export type OrderPaidPayload = z.infer<typeof orderPaidSchema>;

export const orderShippedSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().optional(),
  email: z.string().email(),
  trackingNumber: z.string(),
  carrier: z.string(),
  trackingUrl: z.string().optional(),
});
export type OrderShippedPayload = z.infer<typeof orderShippedSchema>;

export const orderDeliveredSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().optional(),
  email: z.string().email(),
});
export type OrderDeliveredPayload = z.infer<typeof orderDeliveredSchema>;

export const orderCancelledSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().optional(),
  email: z.string().email(),
  reason: z.string().optional(),
  refundAmount: z.number().optional(),
});
export type OrderCancelledPayload = z.infer<typeof orderCancelledSchema>;

export const lowStockAlertSchema = z.object({
  variantId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  currentStock: z.number(),
  threshold: z.number(),
});
export type LowStockAlertPayload = z.infer<typeof lowStockAlertSchema>;

export const cartAbandonedSchema = z.object({
  cartId: z.string().uuid(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  sessionId: z.string().optional(),
  itemCount: z.number(),
  total: z.number(),
  lastActivityAt: z.string(),
});
export type CartAbandonedPayload = z.infer<typeof cartAbandonedSchema>;

export const reviewSubmittedSchema = z.object({
  reviewId: z.string().uuid(),
  userId: z.string(),
  productId: z.string().uuid(),
  productName: z.string(),
  rating: z.number().min(1).max(5),
});
export type ReviewSubmittedPayload = z.infer<typeof reviewSubmittedSchema>;

export const inventoryAdjustedSchema = z.object({
  variantId: z.string().uuid(),
  sku: z.string(),
  previousStock: z.number(),
  newStock: z.number(),
  adjustment: z.number(),
  reason: z.string(),
  adjustedBy: z.string().optional(), // Admin userId who made the adjustment
});
export type InventoryAdjustedPayload = z.infer<typeof inventoryAdjustedSchema>;

// =============================================================================
// Generic Event Sender Builder
// =============================================================================

function makeEventSender<TSchema extends z.ZodTypeAny>(
  eventName: string,
  schema: TSchema,
) {
  return async (payload: z.infer<TSchema>): Promise<SendResult> => {
    const data = schema.parse(payload);

    try {
      await inngest.send({ name: eventName, data });

      // Best-effort analytics logging when a userId exists
      const maybe = data as unknown as { userId?: string };
      if (maybe.userId) {
        await db.insert(analyticsEvent).values({
          userId: maybe.userId,
          eventName: `ecommerce.${eventName.split("/")[1]}`,
          eventProperties: JSON.stringify(data),
          context: "ecommerce",
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  };
}

// =============================================================================
// Event Senders
// =============================================================================

export const sendOrderCreatedEvent = makeEventSender(
  "ecommerce/order.created",
  orderCreatedSchema,
);

export const sendOrderPaidEvent = makeEventSender(
  "ecommerce/order.paid",
  orderPaidSchema,
);

export const sendOrderShippedEvent = makeEventSender(
  "ecommerce/order.shipped",
  orderShippedSchema,
);

export const sendOrderDeliveredEvent = makeEventSender(
  "ecommerce/order.delivered",
  orderDeliveredSchema,
);

export const sendOrderCancelledEvent = makeEventSender(
  "ecommerce/order.cancelled",
  orderCancelledSchema,
);

export const sendLowStockAlertEvent = makeEventSender(
  "ecommerce/inventory.low_stock",
  lowStockAlertSchema,
);

export const sendCartAbandonedEvent = makeEventSender(
  "ecommerce/cart.abandoned",
  cartAbandonedSchema,
);

export const sendReviewSubmittedEvent = makeEventSender(
  "ecommerce/review.submitted",
  reviewSubmittedSchema,
);

export const sendInventoryAdjustedEvent = makeEventSender(
  "ecommerce/inventory.adjusted",
  inventoryAdjustedSchema,
);
