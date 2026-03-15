/**
 * Redis Cache Integration
 *
 * Provides Redis caching utilities for e-commerce:
 * - Cart caching for fast access
 * - Inventory locks to prevent overselling
 * - Product caching for performance
 */

import { createClient, type RedisClientType } from "redis";
import { env } from "@/env/server";

// =============================================================================
// Redis Client
// =============================================================================

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Get or create Redis client
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && isConnected) {
    return redisClient;
  }

  redisClient = createClient({
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD || undefined,
    database: env.REDIS_DB,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error("[Redis] Max reconnection attempts reached");
          return new Error("Max reconnection attempts reached");
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on("error", (err) => {
    console.error("[Redis] Client error:", err);
    isConnected = false;
  });

  redisClient.on("connect", () => {
    console.log("[Redis] Connected");
    isConnected = true;
  });

  redisClient.on("disconnect", () => {
    console.log("[Redis] Disconnected");
    isConnected = false;
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

// =============================================================================
// Key Patterns
// =============================================================================

const KEYS = {
  cart: (cartId: string) => `cart:${cartId}`,
  cartByUser: (userId: string) => `cart:user:${userId}`,
  cartBySession: (sessionId: string) => `cart:session:${sessionId}`,
  inventoryLock: (variantId: string) => `inv_lock:${variantId}`,
  product: (slug: string) => `product:${slug}`,
  productById: (id: string) => `product:id:${id}`,
  categoryProducts: (categoryId: string) => `category:${categoryId}:products`,
} as const;

// =============================================================================
// TTL Constants (in seconds)
// =============================================================================

const TTL = {
  CART: 24 * 60 * 60, // 24 hours
  INVENTORY_LOCK: 10 * 60, // 10 minutes
  PRODUCT: 60 * 60, // 1 hour
  CATEGORY_PRODUCTS: 30 * 60, // 30 minutes
} as const;

// =============================================================================
// Cart Caching
// =============================================================================

export interface CachedCart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: Array<{
    id: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  couponId?: string;
  updatedAt: string;
}

/**
 * Get cart from cache
 */
export async function getCachedCart(cartId: string): Promise<CachedCart | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(KEYS.cart(cartId));
    if (!data) return null;
    return JSON.parse(data) as CachedCart;
  } catch (error) {
    console.error("[Redis] Error getting cached cart:", error);
    return null;
  }
}

/**
 * Set cart in cache
 */
export async function setCachedCart(cart: CachedCart): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = KEYS.cart(cart.id);
    await client.setEx(key, TTL.CART, JSON.stringify(cart));

    // Also set lookup keys
    if (cart.userId) {
      await client.setEx(KEYS.cartByUser(cart.userId), TTL.CART, cart.id);
    }
    if (cart.sessionId) {
      await client.setEx(KEYS.cartBySession(cart.sessionId), TTL.CART, cart.id);
    }
  } catch (error) {
    console.error("[Redis] Error setting cached cart:", error);
  }
}

/**
 * Invalidate cart cache
 */
export async function invalidateCartCache(cartId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const cart = await getCachedCart(cartId);

    await client.del(KEYS.cart(cartId));

    if (cart?.userId) {
      await client.del(KEYS.cartByUser(cart.userId));
    }
    if (cart?.sessionId) {
      await client.del(KEYS.cartBySession(cart.sessionId));
    }
  } catch (error) {
    console.error("[Redis] Error invalidating cart cache:", error);
  }
}

/**
 * Get cart ID by user ID
 */
export async function getCartIdByUser(userId: string): Promise<string | null> {
  try {
    const client = await getRedisClient();
    return await client.get(KEYS.cartByUser(userId));
  } catch (error) {
    console.error("[Redis] Error getting cart ID by user:", error);
    return null;
  }
}

/**
 * Get cart ID by session ID
 */
export async function getCartIdBySession(sessionId: string): Promise<string | null> {
  try {
    const client = await getRedisClient();
    return await client.get(KEYS.cartBySession(sessionId));
  } catch (error) {
    console.error("[Redis] Error getting cart ID by session:", error);
    return null;
  }
}

// =============================================================================
// Inventory Locking
// =============================================================================

export interface InventoryLock {
  variantId: string;
  quantity: number;
  cartId: string;
  lockedAt: string;
  expiresAt: string;
}

/**
 * Acquire inventory lock for checkout
 * Returns true if lock acquired, false if stock unavailable
 */
export async function acquireInventoryLock(
  variantId: string,
  quantity: number,
  cartId: string,
  availableStock: number,
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = KEYS.inventoryLock(variantId);

    // Use a transaction to atomically check and set
    const existing = await client.get(key);
    let totalReserved = 0;

    if (existing) {
      const locks: InventoryLock[] = JSON.parse(existing);
      // Filter out expired locks and locks from same cart
      const validLocks = locks.filter(
        (lock) =>
          new Date(lock.expiresAt) > new Date() && lock.cartId !== cartId,
      );
      totalReserved = validLocks.reduce((sum, lock) => sum + lock.quantity, 0);
    }

    // Check if we have enough stock
    if (availableStock - totalReserved < quantity) {
      return false;
    }

    // Add our lock
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL.INVENTORY_LOCK * 1000);

    const lock: InventoryLock = {
      variantId,
      quantity,
      cartId,
      lockedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Get all valid locks plus our new one
    const allLocks = existing
      ? [
          ...JSON.parse(existing).filter(
            (l: InventoryLock) =>
              new Date(l.expiresAt) > now && l.cartId !== cartId,
          ),
          lock,
        ]
      : [lock];

    await client.setEx(key, TTL.INVENTORY_LOCK, JSON.stringify(allLocks));
    return true;
  } catch (error) {
    console.error("[Redis] Error acquiring inventory lock:", error);
    return false;
  }
}

/**
 * Release inventory lock
 */
export async function releaseInventoryLock(
  variantId: string,
  cartId: string,
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = KEYS.inventoryLock(variantId);

    const existing = await client.get(key);
    if (!existing) return;

    const locks: InventoryLock[] = JSON.parse(existing);
    const remainingLocks = locks.filter(
      (lock) => lock.cartId !== cartId && new Date(lock.expiresAt) > new Date(),
    );

    if (remainingLocks.length > 0) {
      await client.setEx(key, TTL.INVENTORY_LOCK, JSON.stringify(remainingLocks));
    } else {
      await client.del(key);
    }
  } catch (error) {
    console.error("[Redis] Error releasing inventory lock:", error);
  }
}

/**
 * Get total reserved quantity for a variant
 */
export async function getReservedQuantity(variantId: string): Promise<number> {
  try {
    const client = await getRedisClient();
    const key = KEYS.inventoryLock(variantId);

    const existing = await client.get(key);
    if (!existing) return 0;

    const locks: InventoryLock[] = JSON.parse(existing);
    const now = new Date();

    return locks
      .filter((lock) => new Date(lock.expiresAt) > now)
      .reduce((sum, lock) => sum + lock.quantity, 0);
  } catch (error) {
    console.error("[Redis] Error getting reserved quantity:", error);
    return 0;
  }
}

// =============================================================================
// Product Caching
// =============================================================================

export interface CachedProduct {
  id: string;
  slug: string;
  name: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  status: string;
  totalStock: number;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  variants: Array<{
    id: string;
    sku: string;
    price?: number;
    stock: number;
    colorId?: string;
    sizeId?: string;
  }>;
  brand?: { id: string; name: string };
  category?: { id: string; name: string };
  cachedAt: string;
}

/**
 * Get product from cache by slug
 */
export async function getCachedProduct(slug: string): Promise<CachedProduct | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(KEYS.product(slug));
    if (!data) return null;
    return JSON.parse(data) as CachedProduct;
  } catch (error) {
    console.error("[Redis] Error getting cached product:", error);
    return null;
  }
}

/**
 * Set product in cache
 */
export async function setCachedProduct(product: CachedProduct): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(
      KEYS.product(product.slug),
      TTL.PRODUCT,
      JSON.stringify({
        ...product,
        cachedAt: new Date().toISOString(),
      }),
    );

    // Also cache by ID for quick lookups
    await client.setEx(
      KEYS.productById(product.id),
      TTL.PRODUCT,
      JSON.stringify(product),
    );
  } catch (error) {
    console.error("[Redis] Error setting cached product:", error);
  }
}

/**
 * Invalidate product cache
 */
export async function invalidateProductCache(
  slug: string,
  productId?: string,
): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(KEYS.product(slug));

    if (productId) {
      await client.del(KEYS.productById(productId));
    }
  } catch (error) {
    console.error("[Redis] Error invalidating product cache:", error);
  }
}

// =============================================================================
// Category Products Caching
// =============================================================================

/**
 * Get category product IDs from cache
 */
export async function getCachedCategoryProducts(
  categoryId: string,
): Promise<string[] | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(KEYS.categoryProducts(categoryId));
    if (!data) return null;
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error("[Redis] Error getting cached category products:", error);
    return null;
  }
}

/**
 * Set category product IDs in cache
 */
export async function setCachedCategoryProducts(
  categoryId: string,
  productIds: string[],
): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(
      KEYS.categoryProducts(categoryId),
      TTL.CATEGORY_PRODUCTS,
      JSON.stringify(productIds),
    );
  } catch (error) {
    console.error("[Redis] Error setting cached category products:", error);
  }
}

/**
 * Invalidate category products cache
 */
export async function invalidateCategoryCache(categoryId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(KEYS.categoryProducts(categoryId));
  } catch (error) {
    console.error("[Redis] Error invalidating category cache:", error);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/**
 * Flush all e-commerce related keys
 * Use with caution!
 */
export async function flushEcommerceCache(): Promise<void> {
  try {
    const client = await getRedisClient();

    // Get all keys matching our patterns
    const patterns = ["cart:*", "inv_lock:*", "product:*", "category:*"];

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    }

    console.log("[Redis] E-commerce cache flushed");
  } catch (error) {
    console.error("[Redis] Error flushing e-commerce cache:", error);
  }
}

/**
 * Flush all CMS-related cache keys.
 */
export async function invalidateAllCmsCache(): Promise<void> {
  try {
    const client = await getRedisClient();
    const patterns = ["cms:*", "blog:*", "content:*"];

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    }

    console.log("[Redis] CMS cache invalidated");
  } catch (error) {
    console.error("[Redis] Error invalidating CMS cache:", error);
  }
}
