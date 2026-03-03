/**
 * E-Commerce Database Schema
 *
 * This schema handles:
 * - Products with variants, images, and inventory
 * - Categories and brands
 * - Shopping carts (supports both guest and authenticated)
 * - Orders and payments
 * - Coupons and discounts
 * - Wishlists and reviews
 * - Collections for product grouping
 * - User addresses
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  json,
  jsonb,
  index,
  uniqueIndex,
  uuid,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

// =============================================================================
// Enums
// =============================================================================

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
]);

export const sizeCategoryEnum = pgEnum("size_category", [
  "clothing",
  "shoes",
  "accessories",
  "one_size",
]);

// =============================================================================
// Brand
// =============================================================================

export const brand = pgTable(
  "brand",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),
    websiteUrl: text("website_url"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("brand_slug_idx").on(table.slug),
    index("brand_is_active_idx").on(table.isActive),
  ],
);

// =============================================================================
// Category (Hierarchical)
// =============================================================================

export const category = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("category_slug_idx").on(table.slug),
    index("category_parent_id_idx").on(table.parentId),
    index("category_is_active_idx").on(table.isActive),
  ],
);

// =============================================================================
// Product Colors
// =============================================================================

export const productColor = pgTable(
  "product_color",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    hexCode: text("hex_code").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_color_name_idx").on(table.name)],
);

// =============================================================================
// Product Sizes
// =============================================================================

export const productSize = pgTable(
  "product_size",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sizeCategory: sizeCategoryEnum("size_category").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_size_category_idx").on(table.sizeCategory),
    uniqueIndex("product_size_name_category_idx").on(
      table.name,
      table.sizeCategory,
    ),
  ],
);

// =============================================================================
// Product
// =============================================================================

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    shortDescription: text("short_description"),

    // Pricing (in cents for precision)
    basePrice: integer("base_price").notNull(), // Base price in cents (USD)
    salePrice: integer("sale_price"), // Optional sale price in cents
    costPrice: integer("cost_price"), // Cost for profit calculations

    // Status
    status: productStatusEnum("status").default("draft").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),

    // Tags (admin-configurable labels shown on storefront)
    tags: text("tags").array().default([]).notNull(),

    // Inventory summary (denormalized for quick access)
    totalStock: integer("total_stock").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(10).notNull(),

    // SEO
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),

    // Relations
    brandId: uuid("brand_id").references(() => brand.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    index("product_slug_idx").on(table.slug),
    index("product_status_idx").on(table.status),
    index("product_brand_id_idx").on(table.brandId),
    index("product_category_id_idx").on(table.categoryId),
    index("product_is_featured_idx").on(table.isFeatured),
    index("product_created_at_idx").on(table.createdAt),
  ],
);

// =============================================================================
// Product Variant (SKU)
// =============================================================================

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),

    // Variant-specific pricing (overrides product price if set)
    price: integer("price"), // Price in cents (USD)

    // Variant attributes
    colorId: uuid("color_id").references(() => productColor.id, {
      onDelete: "set null",
    }),
    sizeId: uuid("size_id").references(() => productSize.id, {
      onDelete: "set null",
    }),

    // Inventory
    stock: integer("stock").default(0).notNull(),
    reservedStock: integer("reserved_stock").default(0).notNull(), // Stock reserved in carts

    // Physical attributes
    weight: numeric("weight", { precision: 10, scale: 2 }), // Weight in kg
    barcode: text("barcode"),

    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("product_variant_product_id_idx").on(table.productId),
    index("product_variant_sku_idx").on(table.sku),
    index("product_variant_color_id_idx").on(table.colorId),
    index("product_variant_size_id_idx").on(table.sizeId),
    uniqueIndex("product_variant_product_color_size_idx").on(
      table.productId,
      table.colorId,
      table.sizeId,
    ),
  ],
);

// =============================================================================
// Product Images
// =============================================================================

export const productImage = pgTable(
  "product_image",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariant.id, {
      onDelete: "cascade",
    }),
    colorId: uuid("color_id").references(() => productColor.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_image_product_id_idx").on(table.productId),
    index("product_image_variant_id_idx").on(table.variantId),
    index("product_image_color_id_idx").on(table.colorId),
    index("product_image_sort_order_idx").on(table.sortOrder),
  ],
);

// =============================================================================
// Coupon
// =============================================================================

export const coupon = pgTable(
  "coupon",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    description: text("description"),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountValue: integer("discount_value").notNull(), // Percentage (0-100) or fixed amount in cents
    minOrderAmount: integer("min_order_amount"), // Minimum order in cents
    maxDiscountAmount: integer("max_discount_amount"), // Cap for percentage discounts
    usageLimit: integer("usage_limit"), // Total uses allowed
    usageCount: integer("usage_count").default(0).notNull(),
    usageLimitPerUser: integer("usage_limit_per_user"), // Uses per user
    isActive: boolean("is_active").default(true).notNull(),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("coupon_code_idx").on(table.code),
    index("coupon_is_active_idx").on(table.isActive),
    index("coupon_expires_at_idx").on(table.expiresAt),
  ],
);

// =============================================================================
// Cart
// =============================================================================

export const cart = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id"), // For guest carts
    couponId: uuid("coupon_id").references(() => coupon.id, {
      onDelete: "set null",
    }),

    // Totals (denormalized for quick display)
    subtotal: integer("subtotal").default(0).notNull(), // In cents
    discount: integer("discount").default(0).notNull(), // In cents
    total: integer("total").default(0).notNull(), // In cents

    itemCount: integer("item_count").default(0).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  },
  (table) => [
    index("cart_user_id_idx").on(table.userId),
    index("cart_session_id_idx").on(table.sessionId),
    index("cart_last_activity_at_idx").on(table.lastActivityAt),
  ],
);

// =============================================================================
// Cart Item
// =============================================================================

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    priceAtAdd: integer("price_at_add").notNull(), // Price when added (in cents)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cart_item_cart_id_idx").on(table.cartId),
    index("cart_item_variant_id_idx").on(table.variantId),
    uniqueIndex("cart_item_cart_variant_idx").on(table.cartId, table.variantId),
  ],
);

// =============================================================================
// Address
// =============================================================================

export const address = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label"), // e.g., "Home", "Office"
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    street1: text("street_1").notNull(),
    street2: text("street_2"),
    city: text("city").notNull(),
    state: text("state"),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("US"),
    phone: text("phone"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("address_user_id_idx").on(table.userId),
    index("address_is_default_idx").on(table.isDefault),
  ],
);

// =============================================================================
// Order
// =============================================================================

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

    // Guest checkout info
    guestEmail: text("guest_email"),

    // Status
    status: orderStatusEnum("status").default("pending").notNull(),

    // Pricing (all in cents)
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").default(0).notNull(),
    shippingCost: integer("shipping_cost").default(0).notNull(),
    tax: integer("tax").default(0).notNull(),
    total: integer("total").notNull(),

    // Coupon reference
    couponId: uuid("coupon_id").references(() => coupon.id, {
      onDelete: "set null",
    }),
    couponCode: text("coupon_code"), // Denormalized for history

    // Shipping address (denormalized JSON for order history)
    shippingAddress: json("shipping_address").$type<{
      firstName: string;
      lastName: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      phone?: string;
    }>(),

    // Billing address
    billingAddress: json("billing_address").$type<{
      firstName: string;
      lastName: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      phone?: string;
    }>(),

    // Shipping info
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    carrier: text("carrier"), // e.g., "USPS", "UPS", "FedEx"
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),

    // Notes
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
  },
  (table) => [
    uniqueIndex("order_number_idx").on(table.orderNumber),
    index("order_user_id_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_created_at_idx").on(table.createdAt),
    index("order_guest_email_idx").on(table.guestEmail),
  ],
);

// =============================================================================
// Order Item
// =============================================================================

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariant.id, {
      onDelete: "set null",
    }),

    // Denormalized product info (for order history even if product deleted)
    productName: text("product_name").notNull(),
    variantSku: text("variant_sku").notNull(),
    variantOptions: text("variant_options"), // e.g., "Blue / Large"

    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(), // Price at purchase (in cents)
    totalPrice: integer("total_price").notNull(), // quantity * unitPrice

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_item_order_id_idx").on(table.orderId),
    index("order_item_variant_id_idx").on(table.variantId),
  ],
);

// =============================================================================
// Payment
// =============================================================================

export const payment = pgTable(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // "stripe" or "polar"
    providerPaymentId: text("provider_payment_id"), // Stripe/Polar payment ID
    providerCheckoutId: text("provider_checkout_id"), // Checkout session ID
    status: paymentStatusEnum("status").default("pending").notNull(),
    amount: integer("amount").notNull(), // In cents
    currency: text("currency").default("usd").notNull(),
    metadata: json("metadata").$type<Record<string, any>>().default({}),
    paidAt: timestamp("paid_at"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("payment_order_id_idx").on(table.orderId),
    index("payment_provider_payment_id_idx").on(table.providerPaymentId),
    index("payment_status_idx").on(table.status),
  ],
);

// =============================================================================
// Wishlist
// =============================================================================

export const wishlist = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wishlist_user_id_idx").on(table.userId),
    index("wishlist_product_id_idx").on(table.productId),
    uniqueIndex("wishlist_user_product_idx").on(table.userId, table.productId),
  ],
);

// =============================================================================
// Review
// =============================================================================

export const review = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(), // 1-5
    title: text("title"),
    content: text("content"),
    isVerifiedPurchase: boolean("is_verified_purchase")
      .default(false)
      .notNull(),
    isApproved: boolean("is_approved").default(false).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("review_user_id_idx").on(table.userId),
    index("review_product_id_idx").on(table.productId),
    index("review_rating_idx").on(table.rating),
    index("review_is_approved_idx").on(table.isApproved),
    uniqueIndex("review_user_product_idx").on(table.userId, table.productId),
  ],
);

// =============================================================================
// Collection
// =============================================================================

export const collection = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    isAutomatic: boolean("is_automatic").default(false).notNull(),
    // Automatic collection rules (e.g., {"category": "shoes", "priceMin": 5000})
    rules: json("rules").$type<Record<string, any>>(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("collection_slug_idx").on(table.slug),
    index("collection_is_active_idx").on(table.isActive),
  ],
);

// =============================================================================
// Collection Products (Many-to-Many)
// =============================================================================

export const collectionProduct = pgTable(
  "collection_product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("collection_product_collection_id_idx").on(table.collectionId),
    index("collection_product_product_id_idx").on(table.productId),
    uniqueIndex("collection_product_unique_idx").on(
      table.collectionId,
      table.productId,
    ),
  ],
);

// =============================================================================
// Stock Adjustment Log (Audit Trail)
// =============================================================================

export const stockAdjustment = pgTable(
  "stock_adjustment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    previousStock: integer("previous_stock").notNull(),
    newStock: integer("new_stock").notNull(),
    adjustment: integer("adjustment").notNull(), // Positive or negative
    reason: text("reason").notNull(), // "sale", "restock", "adjustment", "return", "reservation"
    orderId: uuid("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Admin who made adjustment
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_adjustment_variant_id_idx").on(table.variantId),
    index("stock_adjustment_order_id_idx").on(table.orderId),
    index("stock_adjustment_created_at_idx").on(table.createdAt),
  ],
);

// =============================================================================
// Coupon Usage (Track per-user usage)
// =============================================================================

export const couponUsage = pgTable(
  "coupon_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupon.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    discountAmount: integer("discount_amount").notNull(), // Actual discount applied (in cents)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("coupon_usage_coupon_id_idx").on(table.couponId),
    index("coupon_usage_user_id_idx").on(table.userId),
    index("coupon_usage_order_id_idx").on(table.orderId),
  ],
);

// =============================================================================
// Relations
// =============================================================================

// Category relations (self-referencing for hierarchy)
export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "categoryParent",
  }),
  children: many(category, { relationName: "categoryParent" }),
  products: many(product),
}));

// Brand relations
export const brandRelations = relations(brand, ({ many }) => ({
  products: many(product),
}));

// Product relations
export const productRelations = relations(product, ({ one, many }) => ({
  brand: one(brand, {
    fields: [product.brandId],
    references: [brand.id],
  }),
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  variants: many(productVariant),
  images: many(productImage),
  wishlists: many(wishlist),
  reviews: many(review),
  collections: many(collectionProduct),
}));

// Product variant relations
export const productVariantRelations = relations(
  productVariant,
  ({ one, many }) => ({
    product: one(product, {
      fields: [productVariant.productId],
      references: [product.id],
    }),
    color: one(productColor, {
      fields: [productVariant.colorId],
      references: [productColor.id],
    }),
    size: one(productSize, {
      fields: [productVariant.sizeId],
      references: [productSize.id],
    }),
    images: many(productImage),
    cartItems: many(cartItem),
    orderItems: many(orderItem),
    stockAdjustments: many(stockAdjustment),
  }),
);

// Product image relations
export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id],
  }),
  variant: one(productVariant, {
    fields: [productImage.variantId],
    references: [productVariant.id],
  }),
  color: one(productColor, {
    fields: [productImage.colorId],
    references: [productColor.id],
  }),
}));

// Product color relations
export const productColorRelations = relations(productColor, ({ many }) => ({
  variants: many(productVariant),
}));

// Product size relations
export const productSizeRelations = relations(productSize, ({ many }) => ({
  variants: many(productVariant),
}));

// Cart relations
export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(user, {
    fields: [cart.userId],
    references: [user.id],
  }),
  coupon: one(coupon, {
    fields: [cart.couponId],
    references: [coupon.id],
  }),
  items: many(cartItem),
}));

// Cart item relations
export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id],
  }),
  variant: one(productVariant, {
    fields: [cartItem.variantId],
    references: [productVariant.id],
  }),
}));

// Address relations
export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, {
    fields: [address.userId],
    references: [user.id],
  }),
}));

// Order relations
export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  coupon: one(coupon, {
    fields: [order.couponId],
    references: [coupon.id],
  }),
  items: many(orderItem),
  payments: many(payment),
  stockAdjustments: many(stockAdjustment),
  reviews: many(review),
}));

// Order item relations
export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  variant: one(productVariant, {
    fields: [orderItem.variantId],
    references: [productVariant.id],
  }),
}));

// Payment relations
export const paymentRelations = relations(payment, ({ one }) => ({
  order: one(order, {
    fields: [payment.orderId],
    references: [order.id],
  }),
}));

// Coupon relations
export const couponRelations = relations(coupon, ({ many }) => ({
  carts: many(cart),
  orders: many(order),
  usages: many(couponUsage),
}));

// Coupon usage relations
export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupon, {
    fields: [couponUsage.couponId],
    references: [coupon.id],
  }),
  user: one(user, {
    fields: [couponUsage.userId],
    references: [user.id],
  }),
  order: one(order, {
    fields: [couponUsage.orderId],
    references: [order.id],
  }),
}));

// Wishlist relations
export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(user, {
    fields: [wishlist.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [wishlist.productId],
    references: [product.id],
  }),
}));

// Review relations
export const reviewRelations = relations(review, ({ one }) => ({
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
  order: one(order, {
    fields: [review.orderId],
    references: [order.id],
  }),
}));

// Collection relations
export const collectionRelations = relations(collection, ({ many }) => ({
  products: many(collectionProduct),
}));

// Collection product relations
export const collectionProductRelations = relations(
  collectionProduct,
  ({ one }) => ({
    collection: one(collection, {
      fields: [collectionProduct.collectionId],
      references: [collection.id],
    }),
    product: one(product, {
      fields: [collectionProduct.productId],
      references: [product.id],
    }),
  }),
);

// Stock adjustment relations
export const stockAdjustmentRelations = relations(
  stockAdjustment,
  ({ one }) => ({
    variant: one(productVariant, {
      fields: [stockAdjustment.variantId],
      references: [productVariant.id],
    }),
    order: one(order, {
      fields: [stockAdjustment.orderId],
      references: [order.id],
    }),
    user: one(user, {
      fields: [stockAdjustment.userId],
      references: [user.id],
    }),
  }),
);

// =============================================================================
// Type Exports
// =============================================================================

export type Brand = typeof brand.$inferSelect;
export type NewBrand = typeof brand.$inferInsert;

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

export type ProductColor = typeof productColor.$inferSelect;
export type NewProductColor = typeof productColor.$inferInsert;

export type ProductSize = typeof productSize.$inferSelect;
export type NewProductSize = typeof productSize.$inferInsert;

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type ProductVariant = typeof productVariant.$inferSelect;
export type NewProductVariant = typeof productVariant.$inferInsert;

export type ProductImage = typeof productImage.$inferSelect;
export type NewProductImage = typeof productImage.$inferInsert;

export type Cart = typeof cart.$inferSelect;
export type NewCart = typeof cart.$inferInsert;

export type CartItem = typeof cartItem.$inferSelect;
export type NewCartItem = typeof cartItem.$inferInsert;

export type Address = typeof address.$inferSelect;
export type NewAddress = typeof address.$inferInsert;

export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;

export type OrderItem = typeof orderItem.$inferSelect;
export type NewOrderItem = typeof orderItem.$inferInsert;

export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;

export type Coupon = typeof coupon.$inferSelect;
export type NewCoupon = typeof coupon.$inferInsert;

export type CouponUsage = typeof couponUsage.$inferSelect;
export type NewCouponUsage = typeof couponUsage.$inferInsert;

export type Wishlist = typeof wishlist.$inferSelect;
export type NewWishlist = typeof wishlist.$inferInsert;

export type Review = typeof review.$inferSelect;
export type NewReview = typeof review.$inferInsert;

export type Collection = typeof collection.$inferSelect;
export type NewCollection = typeof collection.$inferInsert;

export type CollectionProduct = typeof collectionProduct.$inferSelect;
export type NewCollectionProduct = typeof collectionProduct.$inferInsert;

export type StockAdjustment = typeof stockAdjustment.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustment.$inferInsert;

// =============================================================================
// Email Templates
// =============================================================================

export const emailTemplate = pgTable(
  "email_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    htmlContent: text("html_content").notNull(),
    textContent: text("text_content"),
    variables: text("variables").array().default([]).notNull(),
    category: text("category").default("general").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("email_template_category_idx").on(table.category)],
);

// =============================================================================
// Email Campaigns
// =============================================================================

export const emailCampaign = pgTable(
  "email_campaign",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("draft").notNull(), // draft, scheduled, running, completed, paused
    templateId: uuid("template_id").references(() => emailTemplate.id, {
      onDelete: "set null",
    }),
    flowDefinition: jsonb("flow_definition")
      .$type<{ nodes: any[]; edges: any[] }>()
      .default({ nodes: [], edges: [] })
      .notNull(),
    audienceFilter: jsonb("audience_filter")
      .$type<Record<string, any>>()
      .default({})
      .notNull(),
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    totalRecipients: integer("total_recipients").default(0).notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_campaign_status_idx").on(table.status),
    index("email_campaign_scheduled_idx").on(table.scheduledAt),
  ],
);

// Email template relations
export const emailTemplateRelations = relations(emailTemplate, ({ many }) => ({
  campaigns: many(emailCampaign),
}));

// Email campaign relations
export const emailCampaignRelations = relations(
  emailCampaign,
  ({ one }) => ({
    template: one(emailTemplate, {
      fields: [emailCampaign.templateId],
      references: [emailTemplate.id],
    }),
    creator: one(user, {
      fields: [emailCampaign.createdBy],
      references: [user.id],
    }),
  }),
);

// Type exports
export type EmailTemplate = typeof emailTemplate.$inferSelect;
export type NewEmailTemplate = typeof emailTemplate.$inferInsert;

export type EmailCampaign = typeof emailCampaign.$inferSelect;
export type NewEmailCampaign = typeof emailCampaign.$inferInsert;
