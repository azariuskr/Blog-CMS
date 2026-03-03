/**
 * Cart Server Functions
 *
 * Server functions for shopping cart management including:
 * - Get/create cart for user or guest session
 * - Add/update/remove items
 * - Apply/remove coupons
 * - Merge guest cart on login
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  cart,
  cartItem,
  coupon,
  couponUsage,
  productImage,
  productVariant,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES, CART_CONFIG, formatPrice } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const AddToCartSchema = z.object({
  variantId: zId,
  quantity: z.number().int().min(1).max(CART_CONFIG.MAX_QUANTITY_PER_ITEM),
});

const UpdateCartItemSchema = z.object({
  cartItemId: zId,
  quantity: z.number().int().min(0).max(CART_CONFIG.MAX_QUANTITY_PER_ITEM),
});

const ApplyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});

// =============================================================================
// Helper: Get or create session ID for guest users
// =============================================================================

function getSessionId(): string | undefined {
  const request = getRequest();
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/guest_session=([^;]+)/);
  return match?.[1];
}

/**
 * Get session ID or create a new one, setting the cookie in the response.
 * Used by mutating cart operations (add, update, remove) to auto-create sessions.
 */
function getOrCreateSessionId(): string {
  const existing = getSessionId();
  if (existing) return existing;

  const newSessionId = crypto.randomUUID();
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  setResponseHeader(
    "Set-Cookie",
    `guest_session=${newSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  return newSessionId;
}

// =============================================================================
// Helper: Calculate cart totals
// =============================================================================

async function recalculateCartTotals(cartId: string) {
  // Get all items with their current prices
  const items = await db.query.cartItem.findMany({
    where: eq(cartItem.cartId, cartId),
    with: {
      variant: {
        with: {
          product: true,
        },
      },
    },
  });

  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const price =
      item.variant?.price ?? item.variant?.product?.salePrice ?? item.variant?.product?.basePrice ?? 0;
    subtotal += price * item.quantity;
    itemCount += item.quantity;
  }

  // Get cart to check for coupon
  const cartData = await db.query.cart.findFirst({
    where: eq(cart.id, cartId),
    with: { coupon: true },
  });

  let discount = 0;
  if (cartData?.coupon) {
    const couponData = cartData.coupon;
    if (couponData.discountType === "percentage") {
      discount = Math.round((subtotal * couponData.discountValue) / 100);
      if (couponData.maxDiscountAmount) {
        discount = Math.min(discount, couponData.maxDiscountAmount);
      }
    } else {
      discount = Math.min(couponData.discountValue, subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount);

  // Update cart totals
  await db
    .update(cart)
    .set({
      subtotal,
      discount,
      total,
      itemCount,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(cart.id, cartId));

  return { subtotal, discount, total, itemCount };
}

// =============================================================================
// Cart Functions
// =============================================================================

/**
 * Get current cart for user or session
 */
export const $getCart = createServerFn({ method: "GET" }).handler(async () => {
  return safe(async () => {
    const user = await getCurrentUser();
    const sessionId = getSessionId();

    let cartData = null;

    // Try to find existing cart
    if (user) {
      cartData = await db.query.cart.findFirst({
        where: eq(cart.userId, user.id),
        with: {
          items: {
            with: {
              variant: {
                with: {
                  product: {
                    columns: {
                      id: true,
                      name: true,
                      slug: true,
                      basePrice: true,
                      salePrice: true,
                    },
                    with: {
                      images: {
                        orderBy: [asc(productImage.sortOrder)],
                        columns: { id: true, url: true, colorId: true, variantId: true, isPrimary: true },
                      },
                    },
                  },
                  color: true,
                  size: true,
                  images: { limit: 1 },
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
                  product: {
                    columns: {
                      id: true,
                      name: true,
                      slug: true,
                      basePrice: true,
                      salePrice: true,
                    },
                    with: {
                      images: {
                        orderBy: [asc(productImage.sortOrder)],
                        columns: { id: true, url: true, colorId: true, variantId: true, isPrimary: true },
                      },
                    },
                  },
                  color: true,
                  size: true,
                  images: { limit: 1 },
                },
              },
            },
          },
          coupon: true,
        },
      });
    }

    if (!cartData) {
      return {
        id: null,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        itemCount: 0,
        coupon: null,
      };
    }

    // Format items with price info
    const formattedItems = cartData.items.map((item) => {
      const price =
        item.variant?.price ??
        item.variant?.product?.salePrice ??
        item.variant?.product?.basePrice ??
        0;
      const originalPrice = item.variant?.product?.basePrice ?? 0;

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
        priceFormatted: formatPrice(price),
        originalPrice,
        originalPriceFormatted: formatPrice(originalPrice),
        lineTotal: price * item.quantity,
        lineTotalFormatted: formatPrice(price * item.quantity),
        product: item.variant?.product,
        variant: {
          id: item.variant?.id,
          sku: item.variant?.sku,
          color: item.variant?.color,
          size: item.variant?.size,
          stock: item.variant?.stock,
          image: item.variant?.images?.[0],
        },
      };
    });

    return {
      id: cartData.id,
      items: formattedItems,
      subtotal: cartData.subtotal,
      subtotalFormatted: formatPrice(cartData.subtotal),
      discount: cartData.discount,
      discountFormatted: formatPrice(cartData.discount),
      total: cartData.total,
      totalFormatted: formatPrice(cartData.total),
      itemCount: cartData.itemCount,
      coupon: cartData.coupon
        ? {
            code: cartData.coupon.code,
            discountType: cartData.coupon.discountType,
            discountValue: cartData.coupon.discountValue,
          }
        : null,
    };
  });
});

/**
 * Add item to cart
 */
export const $addToCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(AddToCartSchema, data))
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const user = await getCurrentUser();
        // Auto-create guest session for anonymous users
        const sessionId = user ? undefined : getOrCreateSessionId();

        // Validate variant exists and has stock
        const variant = await db.query.productVariant.findFirst({
          where: and(
            eq(productVariant.id, data.data.variantId),
            eq(productVariant.isActive, true),
          ),
          with: {
            product: {
              columns: { id: true, name: true, status: true, basePrice: true },
            },
          },
        });

        if (!variant) {
          throw { status: 404, message: MESSAGES.ERROR.VARIANT_NOT_FOUND };
        }

        if (variant.product?.status !== "active") {
          throw { status: 400, message: MESSAGES.ERROR.PRODUCT_NOT_FOUND };
        }

        const availableStock = variant.stock - variant.reservedStock;
        if (availableStock < data.data.quantity) {
          throw { status: 400, message: MESSAGES.ERROR.INSUFFICIENT_STOCK };
        }

        // Get or create cart
        let cartData = null;

        if (user) {
          cartData = await db.query.cart.findFirst({
            where: eq(cart.userId, user.id),
          });
        } else if (sessionId) {
          cartData = await db.query.cart.findFirst({
            where: and(
              eq(cart.sessionId, sessionId),
              sql`${cart.userId} IS NULL`,
            ),
          });
        }

        if (!cartData) {
          const [newCart] = await db
            .insert(cart)
            .values({
              userId: user?.id,
              sessionId: user ? undefined : sessionId,
            })
            .returning();
          cartData = newCart;
        }

        // Check if item already in cart
        const existingItem = await db.query.cartItem.findFirst({
          where: and(
            eq(cartItem.cartId, cartData.id),
            eq(cartItem.variantId, data.data.variantId),
          ),
        });

        const price = variant.price ?? variant.product?.basePrice ?? 0;

        if (existingItem) {
          const newQuantity = existingItem.quantity + data.data.quantity;

          // Check total doesn't exceed stock
          if (newQuantity > availableStock) {
            throw { status: 400, message: MESSAGES.ERROR.INSUFFICIENT_STOCK };
          }

          if (newQuantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
            throw {
              status: 400,
              message: `Maximum ${CART_CONFIG.MAX_QUANTITY_PER_ITEM} items per product`,
            };
          }

          await db
            .update(cartItem)
            .set({
              quantity: newQuantity,
              priceAtAdd: price,
              updatedAt: new Date(),
            })
            .where(eq(cartItem.id, existingItem.id));
        } else {
          await db.insert(cartItem).values({
            cartId: cartData.id,
            variantId: data.data.variantId,
            quantity: data.data.quantity,
            priceAtAdd: price,
          });
        }

        // Recalculate totals
        await recalculateCartTotals(cartData.id);

        return { success: true, cartId: cartData.id };
      },
      { successMessage: MESSAGES.SUCCESS.CART_ITEM_ADDED },
    );
  });

/**
 * Update cart item quantity
 */
export const $updateCartItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(UpdateCartItemSchema, data))
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        // Get cart item
        const item = await db.query.cartItem.findFirst({
          where: eq(cartItem.id, data.data.cartItemId),
          with: {
            cart: true,
            variant: true,
          },
        });

        if (!item) {
          throw { status: 404, message: "Cart item not found" };
        }

        // Verify user owns this cart
        const user = await getCurrentUser();
        const sessionId = getSessionId();

        if (
          (item.cart.userId && item.cart.userId !== user?.id) ||
          (!item.cart.userId && item.cart.sessionId !== sessionId)
        ) {
          throw { status: 403, message: "Access denied" };
        }

        // If quantity is 0, remove item
        if (data.data.quantity === 0) {
          await db.delete(cartItem).where(eq(cartItem.id, item.id));
        } else {
          // Check stock
          const availableStock =
            (item.variant?.stock ?? 0) - (item.variant?.reservedStock ?? 0);
          if (data.data.quantity > availableStock) {
            throw { status: 400, message: MESSAGES.ERROR.INSUFFICIENT_STOCK };
          }

          await db
            .update(cartItem)
            .set({
              quantity: data.data.quantity,
              updatedAt: new Date(),
            })
            .where(eq(cartItem.id, item.id));
        }

        // Recalculate totals
        await recalculateCartTotals(item.cartId);

        return { success: true };
      },
      { successMessage: MESSAGES.SUCCESS.CART_ITEM_UPDATED },
    );
  });

/**
 * Remove item from cart
 */
export const $removeFromCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ cartItemId: zId }).parse(data),
  )
  .handler(async ({ data }) => {
    return safe(
      async () => {
        const item = await db.query.cartItem.findFirst({
          where: eq(cartItem.id, data.cartItemId),
          with: { cart: true },
        });

        if (!item) {
          throw { status: 404, message: "Cart item not found" };
        }

        // Verify user owns this cart
        const user = await getCurrentUser();
        const sessionId = getSessionId();

        if (
          (item.cart.userId && item.cart.userId !== user?.id) ||
          (!item.cart.userId && item.cart.sessionId !== sessionId)
        ) {
          throw { status: 403, message: "Access denied" };
        }

        await db.delete(cartItem).where(eq(cartItem.id, item.id));

        // Recalculate totals
        await recalculateCartTotals(item.cartId);

        return { success: true };
      },
      { successMessage: MESSAGES.SUCCESS.CART_ITEM_REMOVED },
    );
  });

/**
 * Apply coupon to cart
 */
export const $applyCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(ApplyCouponSchema, data))
  .handler(async ({ data }) => {
    return safe(
      async () => {
        if (!data.ok) throw data.error;

        const user = await getCurrentUser();
        const sessionId = getSessionId();

        // Get cart
        let cartData = null;
        if (user) {
          cartData = await db.query.cart.findFirst({
            where: eq(cart.userId, user.id),
          });
        } else if (sessionId) {
          cartData = await db.query.cart.findFirst({
            where: and(
              eq(cart.sessionId, sessionId),
              sql`${cart.userId} IS NULL`,
            ),
          });
        }

        if (!cartData || cartData.itemCount === 0) {
          throw { status: 400, message: MESSAGES.ERROR.CART_EMPTY };
        }

        // Find coupon
        const couponData = await db.query.coupon.findFirst({
          where: and(
            eq(coupon.code, data.data.code.toUpperCase()),
            eq(coupon.isActive, true),
          ),
        });

        if (!couponData) {
          throw { status: 400, message: MESSAGES.ERROR.INVALID_COUPON };
        }

        // Check expiration
        if (couponData.expiresAt && couponData.expiresAt < new Date()) {
          throw { status: 400, message: MESSAGES.ERROR.COUPON_EXPIRED };
        }

        // Check start date
        if (couponData.startsAt && couponData.startsAt > new Date()) {
          throw { status: 400, message: MESSAGES.ERROR.INVALID_COUPON };
        }

        // Check usage limit
        if (
          couponData.usageLimit &&
          couponData.usageCount >= couponData.usageLimit
        ) {
          throw { status: 400, message: MESSAGES.ERROR.COUPON_USAGE_LIMIT };
        }

        // Check minimum order amount
        if (
          couponData.minOrderAmount &&
          cartData.subtotal < couponData.minOrderAmount
        ) {
          throw {
            status: 400,
            message: `${MESSAGES.ERROR.COUPON_MIN_ORDER} (${formatPrice(couponData.minOrderAmount)})`,
          };
        }

        // Check per-user limit
        if (user && couponData.usageLimitPerUser) {
          const userUsage = await db.query.couponUsage.findMany({
            where: and(
              eq(couponUsage.couponId, couponData.id),
              eq(couponUsage.userId, user.id),
            ),
          });

          if (userUsage.length >= couponData.usageLimitPerUser) {
            throw { status: 400, message: MESSAGES.ERROR.COUPON_USAGE_LIMIT };
          }
        }

        // Apply coupon to cart
        await db
          .update(cart)
          .set({
            couponId: couponData.id,
            updatedAt: new Date(),
          })
          .where(eq(cart.id, cartData.id));

        // Recalculate totals
        await recalculateCartTotals(cartData.id);

        return { success: true, couponCode: couponData.code };
      },
      { successMessage: MESSAGES.SUCCESS.COUPON_APPLIED },
    );
  });

/**
 * Remove coupon from cart
 */
export const $removeCoupon = createServerFn({ method: "POST" }).handler(
  async () => {
    return safe(
      async () => {
        const user = await getCurrentUser();
        const sessionId = getSessionId();

        let cartData = null;
        if (user) {
          cartData = await db.query.cart.findFirst({
            where: eq(cart.userId, user.id),
          });
        } else if (sessionId) {
          cartData = await db.query.cart.findFirst({
            where: and(
              eq(cart.sessionId, sessionId),
              sql`${cart.userId} IS NULL`,
            ),
          });
        }

        if (!cartData) {
          throw { status: 404, message: "Cart not found" };
        }

        await db
          .update(cart)
          .set({
            couponId: null,
            discount: 0,
            updatedAt: new Date(),
          })
          .where(eq(cart.id, cartData.id));

        await recalculateCartTotals(cartData.id);

        return { success: true };
      },
      { successMessage: MESSAGES.SUCCESS.COUPON_REMOVED },
    );
  },
);

/**
 * Clear cart
 */
export const $clearCart = createServerFn({ method: "POST" }).handler(
  async () => {
    return safe(async () => {
      const user = await getCurrentUser();
      const sessionId = getSessionId();

      let cartData = null;
      if (user) {
        cartData = await db.query.cart.findFirst({
          where: eq(cart.userId, user.id),
        });
      } else if (sessionId) {
        cartData = await db.query.cart.findFirst({
          where: and(
            eq(cart.sessionId, sessionId),
            sql`${cart.userId} IS NULL`,
          ),
        });
      }

      if (!cartData) {
        return { success: true };
      }

      // Delete all items
      await db.delete(cartItem).where(eq(cartItem.cartId, cartData.id));

      // Reset cart totals
      await db
        .update(cart)
        .set({
          subtotal: 0,
          discount: 0,
          total: 0,
          itemCount: 0,
          couponId: null,
          updatedAt: new Date(),
        })
        .where(eq(cart.id, cartData.id));

      return { success: true };
    });
  },
);

/**
 * Merge guest cart into user cart on login.
 * Accepts an explicit guestSessionId OR reads from guest_session cookie.
 * Clears the guest_session cookie after merge.
 */
export const $mergeGuestCart = createServerFn({ method: "POST" })
  .handler(async () => {
    return safe(async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw { status: 401, message: "Must be logged in" };
      }

      const guestSessionId = getSessionId();
      if (!guestSessionId) {
        return { merged: false, reason: "No guest session" };
      }

      // Find guest cart
      const guestCart = await db.query.cart.findFirst({
        where: and(
          eq(cart.sessionId, guestSessionId),
          sql`${cart.userId} IS NULL`,
        ),
        with: {
          items: true,
        },
      });

      if (!guestCart || guestCart.items.length === 0) {
        // Clear cookie even if no cart found
        setResponseHeader(
          "Set-Cookie",
          "guest_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        );
        return { merged: false, reason: "No guest cart found" };
      }

      // Get or create user cart
      let userCart = await db.query.cart.findFirst({
        where: eq(cart.userId, user.id),
      });

      if (!userCart) {
        const [newCart] = await db
          .insert(cart)
          .values({ userId: user.id })
          .returning();
        userCart = newCart;
      }

      // Merge items
      let itemsMerged = 0;
      for (const guestItem of guestCart.items) {
        const existingItem = await db.query.cartItem.findFirst({
          where: and(
            eq(cartItem.cartId, userCart.id),
            eq(cartItem.variantId, guestItem.variantId),
          ),
        });

        if (existingItem) {
          const newQuantity = Math.min(
            existingItem.quantity + guestItem.quantity,
            CART_CONFIG.MAX_QUANTITY_PER_ITEM,
          );

          await db
            .update(cartItem)
            .set({
              quantity: newQuantity,
              updatedAt: new Date(),
            })
            .where(eq(cartItem.id, existingItem.id));
        } else {
          await db.insert(cartItem).values({
            cartId: userCart.id,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
            priceAtAdd: guestItem.priceAtAdd,
          });
        }
        itemsMerged++;
      }

      // Delete guest cart
      await db.delete(cart).where(eq(cart.id, guestCart.id));

      // Clear guest session cookie
      setResponseHeader(
        "Set-Cookie",
        "guest_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      );

      // Recalculate totals
      await recalculateCartTotals(userCart.id);

      return { merged: true, itemsMerged };
    });
  });
