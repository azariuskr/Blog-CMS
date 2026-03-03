/**
 * E-Commerce Inngest Functions
 *
 * Background jobs for order processing, inventory management,
 * cart cleanup, and notifications.
 */

import { eq, and, lt, sql, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  analyticsEvent,
  order,
  orderItem,
  productVariant,
  product,
  cart,
  cartItem,
  stockAdjustment,
  user,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { inngest } from "./client";
import { CART_CONFIG, INVENTORY_CONFIG, formatPrice } from "@/constants";
import { sendLowStockAlertEvent } from "./ecommerce-events";

// =============================================================================
// Order Created Handler
// =============================================================================

export const orderCreatedFunction = inngest.createFunction(
  { id: "ecommerce-order-created" },
  { event: "ecommerce/order.created" },
  async ({ event, step }) => {
    const { orderId, orderNumber, email, total, itemCount, userId } =
      event.data as {
        orderId: string;
        orderNumber: string;
        email: string;
        total: number;
        itemCount: number;
        userId?: string;
      };

    // Send order confirmation email
    await step.run("send-confirmation-email", async () => {
      // Get order details for email
      const orderDetails = await db.query.order.findFirst({
        where: eq(order.id, orderId),
        with: {
          items: true,
        },
      });

      if (!orderDetails) return;

      await sendEmail({
        to: email,
        subject: `Order Confirmation - ${orderNumber}`,
        template: "order-confirmation",
        data: {
          orderNumber,
          total: formatPrice(total),
          itemCount,
          items: orderDetails.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: formatPrice(item.unitPrice),
            total: formatPrice(item.totalPrice),
          })),
          orderUrl: `${process.env.VITE_APP_URL}/orders/${orderNumber}`,
        },
        userId,
        context: "ecommerce",
        eventProperties: { kind: "order-confirmation", orderId },
      });
    });

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        userId: userId || null,
        eventName: "order.created",
        eventProperties: JSON.stringify({
          orderId,
          orderNumber,
          total,
          itemCount,
        }),
        context: "ecommerce",
      });
    });

    return { ok: true, orderId };
  },
);

// =============================================================================
// Order Paid Handler
// =============================================================================

export const orderPaidFunction = inngest.createFunction(
  { id: "ecommerce-order-paid" },
  { event: "ecommerce/order.paid" },
  async ({ event, step }) => {
    const { orderId, orderNumber, total, paymentId, provider, userId } =
      event.data as {
        orderId: string;
        orderNumber: string;
        email: string;
        total: number;
        paymentId: string;
        provider: string;
        userId?: string;
      };

    // Update order status to confirmed
    await step.run("update-order-status", async () => {
      await db
        .update(order)
        .set({
          status: "confirmed",
          updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));
    });

    // Deduct stock and check for low stock
    const lowStockItems = await step.run("deduct-inventory", async () => {
      const items = await db.query.orderItem.findMany({
        where: eq(orderItem.orderId, orderId),
      });

      const lowStock: Array<{
        variantId: string;
        productName: string;
        sku: string;
        currentStock: number;
        threshold: number;
      }> = [];

      for (const item of items) {
        if (!item.variantId) continue;

        // Get variant with product info
        const variant = await db.query.productVariant.findFirst({
          where: eq(productVariant.id, item.variantId),
          with: { product: true },
        });

        if (!variant) continue;

        const previousStock = variant.stock;
        const newStock = Math.max(0, previousStock - item.quantity);
        const threshold =
          variant.product?.lowStockThreshold ||
          INVENTORY_CONFIG.DEFAULT_LOW_STOCK_THRESHOLD;

        // Update stock
        await db
          .update(productVariant)
          .set({
            stock: newStock,
            reservedStock: sql`GREATEST(0, ${productVariant.reservedStock} - ${item.quantity})`,
            updatedAt: new Date(),
          })
          .where(eq(productVariant.id, item.variantId));

        // Log stock adjustment
        await db.insert(stockAdjustment).values({
          variantId: item.variantId,
          previousStock,
          newStock,
          adjustment: -item.quantity,
          reason: "sale",
          orderId,
        });

        // Update product total stock
        if (variant.productId) {
          await db
            .update(product)
            .set({
              totalStock: sql`${product.totalStock} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(product.id, variant.productId));
        }

        // Check for low stock
        if (newStock <= threshold && previousStock > threshold) {
          lowStock.push({
            variantId: item.variantId,
            productName: variant.product?.name || item.productName,
            sku: variant.sku,
            currentStock: newStock,
            threshold,
          });
        }
      }

      return lowStock;
    });

    // Send low stock alerts
    if (lowStockItems.length > 0) {
      await step.run("send-low-stock-alerts", async () => {
        for (const item of lowStockItems) {
          await sendLowStockAlertEvent(item);
        }
      });
    }

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        userId: userId || null,
        eventName: "order.paid",
        eventProperties: JSON.stringify({
          orderId,
          orderNumber,
          total,
          paymentId,
          provider,
        }),
        context: "ecommerce",
      });
    });

    return { ok: true, orderId, lowStockItems: lowStockItems.length };
  },
);

// =============================================================================
// Order Shipped Handler
// =============================================================================

export const orderShippedFunction = inngest.createFunction(
  { id: "ecommerce-order-shipped" },
  { event: "ecommerce/order.shipped" },
  async ({ event, step }) => {
    const { orderId, orderNumber, email, trackingNumber, carrier, trackingUrl } =
      event.data as {
        orderId: string;
        orderNumber: string;
        email: string;
        trackingNumber: string;
        carrier: string;
        trackingUrl?: string;
      };

    // Send shipping notification email
    await step.run("send-shipping-email", async () => {
      await sendEmail({
        to: email,
        subject: `Your Order ${orderNumber} Has Shipped!`,
        template: "order-shipped",
        data: {
          orderNumber,
          trackingNumber,
          carrier,
          trackingUrl: trackingUrl || `https://track.${carrier.toLowerCase()}.com/${trackingNumber}`,
          orderUrl: `${process.env.VITE_APP_URL}/orders/${orderNumber}`,
        },
        context: "ecommerce",
        eventProperties: { kind: "order-shipped", orderId },
      });
    });

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        eventName: "order.shipped",
        eventProperties: JSON.stringify({
          orderId,
          orderNumber,
          carrier,
          trackingNumber,
        }),
        context: "ecommerce",
      });
    });

    return { ok: true, orderId };
  },
);

// =============================================================================
// Order Delivered Handler
// =============================================================================

export const orderDeliveredFunction = inngest.createFunction(
  { id: "ecommerce-order-delivered" },
  { event: "ecommerce/order.delivered" },
  async ({ event, step }) => {
    const { orderId, orderNumber, email, userId } = event.data as {
      orderId: string;
      orderNumber: string;
      email: string;
      userId?: string;
    };

    // Send delivery confirmation and feedback request
    await step.run("send-delivery-email", async () => {
      await sendEmail({
        to: email,
        subject: `Your Order ${orderNumber} Has Been Delivered`,
        template: "order-delivered",
        data: {
          orderNumber,
          reviewUrl: `${process.env.VITE_APP_URL}/orders/${orderNumber}/review`,
        },
        userId,
        context: "ecommerce",
        eventProperties: { kind: "order-delivered", orderId },
      });
    });

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        userId: userId || null,
        eventName: "order.delivered",
        eventProperties: JSON.stringify({ orderId, orderNumber }),
        context: "ecommerce",
      });
    });

    return { ok: true, orderId };
  },
);

// =============================================================================
// Low Stock Alert Handler
// =============================================================================

export const lowStockAlertFunction = inngest.createFunction(
  { id: "ecommerce-low-stock-alert" },
  { event: "ecommerce/inventory.low_stock" },
  async ({ event, step }) => {
    const { variantId, productName, sku, currentStock, threshold } =
      event.data as {
        variantId: string;
        productName: string;
        sku: string;
        currentStock: number;
        threshold: number;
      };

    // Get admin emails to notify
    const adminEmails = await step.run("get-admin-emails", async () => {
      const admins = await db.query.user.findMany({
        where: sql`${user.role} IN ('admin', 'superAdmin')`,
        columns: { email: true },
      });
      return admins.map((a) => a.email);
    });

    if (adminEmails.length > 0) {
      await step.run("send-low-stock-email", async () => {
        await sendEmail({
          to: adminEmails,
          subject: `Low Stock Alert: ${productName} (${sku})`,
          template: "low-stock-alert",
          data: {
            productName,
            sku,
            currentStock,
            threshold,
            inventoryUrl: `${process.env.VITE_APP_URL}/admin/inventory`,
          },
          context: "ecommerce",
          eventProperties: { kind: "low-stock-alert", variantId },
        });
      });
    }

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        eventName: "inventory.low_stock",
        eventProperties: JSON.stringify({
          variantId,
          productName,
          sku,
          currentStock,
          threshold,
        }),
        context: "ecommerce",
      });
    });

    return { ok: true, notifiedAdmins: adminEmails.length };
  },
);

// =============================================================================
// Abandoned Cart Handler
// =============================================================================

export const cartAbandonedFunction = inngest.createFunction(
  { id: "ecommerce-cart-abandoned" },
  { event: "ecommerce/cart.abandoned" },
  async ({ event, step }) => {
    const { cartId, email, itemCount, total } = event.data as {
      cartId: string;
      userId?: string;
      email?: string;
      sessionId?: string;
      itemCount: number;
      total: number;
      lastActivityAt: string;
    };

    // Wait 1 hour before sending reminder
    await step.sleep("wait-before-reminder", "1h");

    // Check if cart is still abandoned (not converted)
    const cartStillExists = await step.run("check-cart-exists", async () => {
      const existingCart = await db.query.cart.findFirst({
        where: eq(cart.id, cartId),
      });
      return !!existingCart && existingCart.itemCount > 0;
    });

    if (!cartStillExists || !email) {
      return { ok: true, skipped: true, reason: "Cart converted or no email" };
    }

    // Get cart items for email
    const items = await step.run("get-cart-items", async () => {
      return db.query.cartItem.findMany({
        where: eq(cartItem.cartId, cartId),
        with: {
          variant: {
            with: {
              product: true,
              color: true,
              size: true,
            },
          },
        },
      });
    });

    // Send abandoned cart email
    await step.run("send-abandoned-cart-email", async () => {
      await sendEmail({
        to: email,
        subject: "You left something behind!",
        template: "abandoned-cart",
        data: {
          itemCount,
          total: formatPrice(total),
          items: items.map((item) => ({
            name: item.variant?.product?.name || "Product",
            variant: [item.variant?.color?.name, item.variant?.size?.name]
              .filter(Boolean)
              .join(" / "),
            quantity: item.quantity,
            price: formatPrice(item.priceAtAdd),
          })),
          cartUrl: `${process.env.VITE_APP_URL}/cart`,
        },
        context: "ecommerce",
        eventProperties: { kind: "abandoned-cart", cartId },
      });
    });

    return { ok: true, cartId, emailSent: true };
  },
);

// =============================================================================
// Scheduled: Clean Expired Guest Carts
// =============================================================================

export const cleanExpiredCartsFunction = inngest.createFunction(
  { id: "ecommerce-clean-expired-carts" },
  { cron: "0 3 * * *" }, // Daily at 3 AM
  async ({ step }) => {
    const expiryDate = new Date();
    expiryDate.setDate(
      expiryDate.getDate() - CART_CONFIG.GUEST_CART_EXPIRY_DAYS,
    );

    const deletedCount = await step.run("delete-expired-carts", async () => {
      // Delete guest carts older than expiry period
      const result = await db
        .delete(cart)
        .where(
          and(
            isNull(cart.userId), // Guest carts only
            lt(cart.lastActivityAt, expiryDate),
          ),
        )
        .returning({ id: cart.id });

      return result.length;
    });

    // Log analytics
    await step.run("log-analytics", async () => {
      await db.insert(analyticsEvent).values({
        eventName: "carts.cleanup",
        eventProperties: JSON.stringify({ deletedCount }),
        context: "ecommerce",
      });
    });

    return { ok: true, deletedCount };
  },
);

// =============================================================================
// Scheduled: Detect Abandoned Carts
// =============================================================================

export const detectAbandonedCartsFunction = inngest.createFunction(
  { id: "ecommerce-detect-abandoned-carts" },
  { cron: "0 * * * *" }, // Hourly
  async ({ step }) => {
    const cutoffTime = new Date();
    cutoffTime.setHours(
      cutoffTime.getHours() - CART_CONFIG.ABANDONED_CART_HOURS,
    );

    // Find abandoned carts
    const abandonedCarts = await step.run("find-abandoned-carts", async () => {
      return db.query.cart.findMany({
        where: and(
          lt(cart.lastActivityAt, cutoffTime),
          gt(cart.itemCount, 0), // Has items
        ),
        with: {
          user: {
            columns: { email: true },
          },
        },
        limit: 100, // Process in batches
      });
    });

    // Send events for each abandoned cart
    let sentCount = 0;
    for (const abandonedCart of abandonedCarts) {
      // Only send if we have an email
      const email = abandonedCart.user?.email;
      if (!email && !abandonedCart.sessionId) continue;

      await step.run(`send-abandoned-event-${abandonedCart.id}`, async () => {
        await inngest.send({
          name: "ecommerce/cart.abandoned",
          data: {
            cartId: abandonedCart.id,
            userId: abandonedCart.userId,
            email,
            sessionId: abandonedCart.sessionId,
            itemCount: abandonedCart.itemCount,
            total: abandonedCart.total,
            lastActivityAt: new Date(abandonedCart.lastActivityAt).toISOString(),
          },
        });
      });

      sentCount++;
    }

    return { ok: true, foundCarts: abandonedCarts.length, sentEvents: sentCount };
  },
);

// =============================================================================
// Export all functions
// =============================================================================

export const ecommerceFunctions = [
  orderCreatedFunction,
  orderPaidFunction,
  orderShippedFunction,
  orderDeliveredFunction,
  lowStockAlertFunction,
  cartAbandonedFunction,
  cleanExpiredCartsFunction,
  detectAbandonedCartsFunction,
] as const;
