/**
 * Checkout Server Functions
 *
 * Server functions for the checkout flow including:
 * - Creating orders from cart
 * - Payment processing with Stripe/Polar
 * - Payment verification
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  cart,
  cartItem,
  order,
  orderItem,
  payment,
  coupon,
  couponUsage,
  productVariant,
  address,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";
import { sendOrderCreatedEvent, sendOrderPaidEvent } from "@/lib/inngest/ecommerce-events";
import { getBillingProvider, isStripeEnabled, isPolarEnabled } from "@/lib/billing/plans";
import { stripeClient } from "@/lib/billing/stripe-plugin";
import { env } from "@/env/server";
import { withBasePath } from "@/lib/url/with-base-path";

// =============================================================================
// Schemas
// =============================================================================

const AddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().default("US"),
  phone: z.string().optional(),
});

const CreateCheckoutSchema = z.object({
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  sameAsShipping: z.boolean().default(true),
  email: z.string().email().optional(), // Required for guest checkout
  customerNotes: z.string().max(500).optional(),
  saveAddress: z.boolean().default(false),
});

const VerifyPaymentSchema = z.object({
  orderId: zId,
  sessionId: z.string().optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getSessionId(): string | undefined {
  const request = getRequest();
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/guest_session=([^;]+)/);
  return match?.[1];
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// =============================================================================
// Checkout Functions
// =============================================================================

/**
 * Create checkout - converts cart to order and creates payment session
 */
export const $createCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(CreateCheckoutSchema, data))
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      const user = await getCurrentUser();
      const sessionId = getSessionId();

      // Get cart
      let cartData = null;
      if (user) {
        cartData = await db.query.cart.findFirst({
          where: eq(cart.userId, user.id),
          with: {
            items: {
              with: {
                variant: {
                  with: {
                    product: true,
                    color: true,
                    size: true,
                  },
                },
              },
            },
            coupon: true,
          },
        });
      } else if (sessionId) {
        cartData = await db.query.cart.findFirst({
          where: and(eq(cart.sessionId, sessionId), sql`${cart.userId} IS NULL`),
          with: {
            items: {
              with: {
                variant: {
                  with: {
                    product: true,
                    color: true,
                    size: true,
                  },
                },
              },
            },
            coupon: true,
          },
        });
      }

      if (!cartData || cartData.items.length === 0) {
        throw { status: 400, message: MESSAGES.ERROR.CART_EMPTY };
      }

      // Validate email for guest checkout
      const email = user?.email || data.data.email;
      if (!email) {
        throw { status: 400, message: "Email is required for checkout" };
      }

      // Validate stock availability
      for (const item of cartData.items) {
        if (!item.variant) continue;
        const availableStock = item.variant.stock - item.variant.reservedStock;
        if (item.quantity > availableStock) {
          throw {
            status: 400,
            message: `${item.variant.product?.name || "Product"} has insufficient stock`,
          };
        }
      }

      // Prepare addresses
      const shippingAddress = data.data.shippingAddress;
      const billingAddress = data.data.sameAsShipping
        ? shippingAddress
        : data.data.billingAddress || shippingAddress;

      // Create order
      const orderNumber = generateOrderNumber();
      const [newOrder] = await db
        .insert(order)
        .values({
          orderNumber,
          userId: user?.id,
          guestEmail: user ? null : email,
          status: "pending",
          subtotal: cartData.subtotal,
          discount: cartData.discount,
          shippingCost: 0, // Would calculate based on shipping method
          tax: 0, // Would calculate based on address
          total: cartData.total,
          couponId: cartData.couponId,
          couponCode: cartData.coupon?.code,
          shippingAddress,
          billingAddress,
          customerNotes: data.data.customerNotes,
        })
        .returning();

      // Create order items
      for (const item of cartData.items) {
        if (!item.variant) continue;

        const price =
          item.variant.price ??
          item.variant.product?.salePrice ??
          item.variant.product?.basePrice ??
          0;

        const variantOptions = [
          item.variant.color?.name,
          item.variant.size?.name,
        ]
          .filter(Boolean)
          .join(" / ");

        await db.insert(orderItem).values({
          orderId: newOrder.id,
          variantId: item.variant.id,
          productName: item.variant.product?.name || "Product",
          variantSku: item.variant.sku,
          variantOptions: variantOptions || null,
          quantity: item.quantity,
          unitPrice: price,
          totalPrice: price * item.quantity,
        });

        // Reserve stock
        await db
          .update(productVariant)
          .set({
            reservedStock: sql`${productVariant.reservedStock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariant.id, item.variant.id));
      }

      // Save address if requested (skip if identical address already exists)
      if (user && data.data.saveAddress) {
        const existing = await db.query.address.findFirst({
          where: and(
            eq(address.userId, user.id),
            eq(address.street1, shippingAddress.street1),
            eq(address.city, shippingAddress.city),
            eq(address.postalCode, shippingAddress.postalCode),
            eq(address.country, shippingAddress.country),
          ),
        });
        if (!existing) {
          await db.insert(address).values({
            userId: user.id,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            company: shippingAddress.company,
            street1: shippingAddress.street1,
            street2: shippingAddress.street2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country,
            phone: shippingAddress.phone,
          });
        }
      }

      // Record coupon usage
      if (cartData.couponId && cartData.discount > 0) {
        await db.insert(couponUsage).values({
          couponId: cartData.couponId,
          userId: user?.id,
          orderId: newOrder.id,
          discountAmount: cartData.discount,
        });

        // Increment coupon usage count
        await db
          .update(coupon)
          .set({
            usageCount: sql`${coupon.usageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupon.id, cartData.couponId));
      }

      // Create payment session based on provider
      const provider = getBillingProvider();
      // const baseUrl = process.env.VITE_BASE_URL || "http://localhost:3000";
      // const successUrl = `${baseUrl}/checkout/success?order=${newOrder.id}`;
      // const cancelUrl = `${baseUrl}/checkout/cancel?order=${newOrder.id}`;
      const successUrl = withBasePath(env.VITE_BASE_URL, `/checkout/success?order=${newOrder.id}`);
      const cancelUrl = withBasePath(env.VITE_BASE_URL, `/checkout/cancel?order=${newOrder.id}`);
      console.log("Checkout URLs:", { successUrl, cancelUrl, provider });
      let checkoutUrl: string | null = null;
      let checkoutSessionId: string | null = null;
      console.log("DEBUG BILLING:", {
        provider,
        stripeEnabled: isStripeEnabled(),
        stripeClientExists: !!stripeClient,
        stripeKeyLoaded: !!env.STRIPE_SECRET_KEY,
      });
      if (provider === "stripe" && isStripeEnabled() && stripeClient) {
        // Create Stripe checkout session
        const lineItems = cartData.items.map((item) => {
          const price =
            item.variant?.price ??
            item.variant?.product?.salePrice ??
            item.variant?.product?.basePrice ??
            0;

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.variant?.product?.name || "Product",
                description: [item.variant?.color?.name, item.variant?.size?.name]
                  .filter(Boolean)
                  .join(" / ") || undefined,
              },
              unit_amount: price,
            },
            quantity: item.quantity,
          };
        });

        // Add discount if applicable
        const discounts = cartData.discount > 0 ? [{
          coupon: await (async () => {
            // Create one-time coupon in Stripe for the discount
            const stripeCoupon = await stripeClient.coupons.create({
              amount_off: cartData.discount,
              currency: "usd",
              name: cartData.coupon?.code || "Discount",
              duration: "once",
            });
            return stripeCoupon.id;
          })(),
        }] : undefined;

        const session = await stripeClient.checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          discounts,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: email,
          metadata: {
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            type: "ecommerce_order",
          },
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
        });

        checkoutUrl = session.url;
        checkoutSessionId = session.id;

        // Create payment record
        await db.insert(payment).values({
          orderId: newOrder.id,
          provider: "stripe",
          providerCheckoutId: session.id,
          status: "pending",
          amount: newOrder.total,
          currency: "usd",
        });
      } else if (provider === "polar" && isPolarEnabled()) {
        // Would integrate with Polar checkout here
        throw { status: 501, message: "Polar checkout not yet implemented for e-commerce" };
      } else {
        throw { status: 500, message: "No payment provider configured" };
      }

      // Send order created event
      await sendOrderCreatedEvent({
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        userId: user?.id,
        email,
        total: newOrder.total,
        itemCount: cartData.items.reduce((sum, i) => sum + i.quantity, 0),
      });

      return {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        checkoutUrl,
        checkoutSessionId,
        provider,
      };
    });
  });

/**
 * Verify payment completion
 */
export const $verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(VerifyPaymentSchema, data))
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;

      // Get order
      const orderData = await db.query.order.findFirst({
        where: eq(order.id, data.data.orderId),
        with: {
          payments: true,
          user: { columns: { email: true } },
        },
      });

      if (!orderData) {
        throw { status: 404, message: MESSAGES.ERROR.ORDER_NOT_FOUND };
      }

      // Check if already confirmed
      if (orderData.status !== "pending") {
        return {
          success: true,
          orderNumber: orderData.orderNumber,
          status: orderData.status,
          alreadyProcessed: true,
        };
      }

      const paymentRecord = orderData.payments[0];
      if (!paymentRecord) {
        throw { status: 400, message: "No payment found for order" };
      }

      const provider = getBillingProvider();

      // Verify with Stripe
      if (provider === "stripe" && isStripeEnabled() && stripeClient) {
        const sessionId = data.data.sessionId || paymentRecord.providerCheckoutId;
        if (!sessionId) {
          throw { status: 400, message: "No checkout session found" };
        }

        const session = await stripeClient.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return {
            success: false,
            orderNumber: orderData.orderNumber,
            status: "pending",
            paymentStatus: session.payment_status,
          };
        }

        // Update payment record
        await db
          .update(payment)
          .set({
            providerPaymentId: session.payment_intent as string,
            status: "completed",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));

        // Update order status
        await db
          .update(order)
          .set({
            status: "confirmed",
            updatedAt: new Date(),
          })
          .where(eq(order.id, orderData.id));

        // Clear cart
        const user = await getCurrentUser();
        const sessionIdCookie = getSessionId();

        if (user) {
          const userCart = await db.query.cart.findFirst({
            where: eq(cart.userId, user.id),
          });
          if (userCart) {
            await db.delete(cartItem).where(eq(cartItem.cartId, userCart.id));
            await db
              .update(cart)
              .set({
                subtotal: 0,
                discount: 0,
                total: 0,
                itemCount: 0,
                couponId: null,
              })
              .where(eq(cart.id, userCart.id));
          }
        } else if (sessionIdCookie) {
          const guestCart = await db.query.cart.findFirst({
            where: and(
              eq(cart.sessionId, sessionIdCookie),
              sql`${cart.userId} IS NULL`,
            ),
          });
          if (guestCart) {
            await db.delete(cart).where(eq(cart.id, guestCart.id));
          }
        }

        // Send order paid event
        const email = orderData.user?.email || orderData.guestEmail;
        if (email) {
          await sendOrderPaidEvent({
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            userId: orderData.userId ?? undefined,
            email,
            total: orderData.total,
            paymentId: session.payment_intent as string,
            provider: "stripe",
          });
        }

        return {
          success: true,
          orderNumber: orderData.orderNumber,
          status: "confirmed",
        };
      }

      throw { status: 500, message: "Payment verification failed" };
    });
  });

/**
 * Get user's saved addresses
 */
export const $getAddresses = createServerFn({ method: "GET" }).handler(
  async () => {
    return safe(async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { addresses: [] };
      }

      const addresses = await db.query.address.findMany({
        where: eq(address.userId, user.id),
        orderBy: sql`${address.isDefault} DESC, ${address.createdAt} DESC`,
      });

      return { addresses };
    });
  },
);

/**
 * Save a new address
 */
const SaveAddressSchema = AddressSchema.extend({
  label: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const $saveAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(SaveAddressSchema, data))
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const user = await getCurrentUser();
        if (!user) {
          throw { status: 401, message: "Must be logged in" };
        }

        // Check if identical address already exists for this user
        const existing = await db.query.address.findFirst({
          where: and(
            eq(address.userId, user.id),
            eq(address.street1, data.data.street1),
            eq(address.city, data.data.city),
            eq(address.postalCode, data.data.postalCode),
            eq(address.country, data.data.country),
          ),
        });

        if (existing) {
          // Update existing address instead of creating a duplicate
          const [updated] = await db
            .update(address)
            .set({
              firstName: data.data.firstName,
              lastName: data.data.lastName,
              company: data.data.company,
              street2: data.data.street2,
              state: data.data.state,
              phone: data.data.phone,
              label: data.data.label,
              isDefault: data.data.isDefault,
            })
            .where(eq(address.id, existing.id))
            .returning();

          if (data.data.isDefault) {
            await db
              .update(address)
              .set({ isDefault: false })
              .where(and(eq(address.userId, user.id), sql`${address.id} != ${existing.id}`));
          }

          return updated;
        }

        // If setting as default, unset others
        if (data.data.isDefault) {
          await db
            .update(address)
            .set({ isDefault: false })
            .where(eq(address.userId, user.id));
        }

        const [newAddress] = await db
          .insert(address)
          .values({
            userId: user.id,
            label: data.data.label,
            firstName: data.data.firstName,
            lastName: data.data.lastName,
            company: data.data.company,
            street1: data.data.street1,
            street2: data.data.street2,
            city: data.data.city,
            state: data.data.state,
            postalCode: data.data.postalCode,
            country: data.data.country,
            phone: data.data.phone,
            isDefault: data.data.isDefault,
          })
          .returning();

        return newAddress;
      },
      { successMessage: MESSAGES.SUCCESS.ADDRESS_SAVED },
    );
  });

/**
 * Delete an address
 */
export const $deleteAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ addressId: zId }).parse(data),
  )
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const user = await getCurrentUser();
        if (!user) {
          throw { status: 401, message: "Must be logged in" };
        }

        const existing = await db.query.address.findFirst({
          where: and(eq(address.id, data.addressId), eq(address.userId, user.id)),
        });

        if (!existing) {
          throw { status: 404, message: MESSAGES.ERROR.ADDRESS_NOT_FOUND };
        }

        await db.delete(address).where(eq(address.id, data.addressId));

        return { success: true };
      },
      { successMessage: MESSAGES.SUCCESS.ADDRESS_DELETED },
    );
  });
