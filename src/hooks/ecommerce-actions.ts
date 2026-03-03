/**
 * E-Commerce Mutation Hooks
 *
 * Mutation hooks for all e-commerce write operations.
 * Follows the pattern established in src/hooks/user-actions.ts.
 */

import { QUERY_KEYS } from "@/constants";
import { useAction } from "@/hooks/use-action";
import {
  // Products
  $adminCreateProduct,
  $adminUpdateProduct,
  $adminDeleteProduct,
  $adminPublishProduct,
  // Variants
  $adminCreateVariant,
  $adminUpdateVariant,
  $adminDeleteVariant,
  $adminBulkCreateVariants,
  $adminAdjustStock,
  $adminBulkStockUpdate,
  // Orders
  $adminUpdateOrderStatus,
  $adminAddShipment,
  $adminCancelOrder,
  // Cart
  $addToCart,
  $updateCartItem,
  $removeFromCart,
  $applyCoupon,
  $removeCoupon,
  $clearCart,
  // Coupons
  $adminCreateCoupon,
  $adminUpdateCoupon,
  $adminDeleteCoupon,
  // Reviews
  $adminCreateReview,
  $adminApproveReview,
  $adminRejectReview,
  $adminDeleteReview,
  // Checkout
  $createCheckout,
  $verifyPayment,
  // Brands
  $adminCreateBrand,
  $adminUpdateBrand,
  $adminDeleteBrand,
  // Categories
  $adminCreateCategory,
  $adminUpdateCategory,
  $adminDeleteCategory,
  // Product Images
  $adminAddProductImage,
  $adminDeleteProductImage,
  $adminSetPrimaryImage,
  $adminReorderProductImages,
  $adminAssignImageToVariant,
  // Colors & Sizes
  $adminCreateColor,
  $adminUpdateColor,
  $adminDeleteColor,
  $adminCreateSize,
  $adminUpdateSize,
  $adminDeleteSize,
  // Campaigns & Templates
  $adminCreateCampaign,
  $adminUpdateCampaign,
  $adminDeleteCampaign,
  $adminCreateTemplate,
  $adminUpdateTemplate,
  $adminDeleteTemplate,
} from "@/lib/ecommerce/functions";
import type { OrderStatus } from "@/constants";

// =============================================================================
// PRODUCT HOOKS
// =============================================================================

export function useCreateProduct() {
  return useAction(
    async (vars: {
      name: string;
      slug: string;
      description?: string;
      shortDescription?: string;
      basePrice: number;
      salePrice?: number;
      costPrice?: number;
      status?: "draft" | "active" | "archived";
      isFeatured?: boolean;
      tags?: string[];
      lowStockThreshold?: number;
      metaTitle?: string;
      metaDescription?: string;
      brandId?: string;
      categoryId?: string;
    }) => $adminCreateProduct({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        QUERY_KEYS.PRODUCTS.LIST,
        QUERY_KEYS.PRODUCTS.FACETS,
      ],
      showToast: true,
    },
  );
}

export function useUpdateProduct() {
  return useAction(
    async (vars: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      shortDescription?: string;
      basePrice?: number;
      salePrice?: number;
      costPrice?: number;
      status?: "draft" | "active" | "archived";
      isFeatured?: boolean;
      tags?: string[];
      lowStockThreshold?: number;
      metaTitle?: string;
      metaDescription?: string;
      brandId?: string;
      categoryId?: string;
    }) => $adminUpdateProduct({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        QUERY_KEYS.PRODUCTS.LIST,
        QUERY_KEYS.PRODUCTS.FACETS,
      ],
      showToast: true,
    },
  );
}

export function useDeleteProduct() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteProduct({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        QUERY_KEYS.PRODUCTS.LIST,
        QUERY_KEYS.PRODUCTS.FACETS,
      ],
      showToast: true,
    },
  );
}

export function usePublishProduct() {
  return useAction(
    async (vars: { id: string; publish: boolean }) =>
      $adminPublishProduct({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        QUERY_KEYS.PRODUCTS.LIST,
        QUERY_KEYS.PRODUCTS.FACETS,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// VARIANT HOOKS
// =============================================================================

export function useCreateVariant() {
  return useAction(
    async (vars: {
      productId: string;
      sku: string;
      price?: number;
      colorId?: string;
      sizeId?: string;
      stock?: number;
      weight?: string;
      barcode?: string;
      isActive?: boolean;
    }) => $adminCreateVariant({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        ["products", "detail"],
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useBulkCreateVariants() {
  return useAction(
    async (vars: {
      productId: string;
      colorIds: string[];
      sizeIds: string[];
      skuPrefix: string;
      stock?: number;
      price?: number;
    }) => $adminBulkCreateVariants({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        ["products", "detail"],
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useUpdateVariant() {
  return useAction(
    async (vars: {
      id: string;
      sku?: string;
      price?: number;
      colorId?: string | null;
      sizeId?: string | null;
      weight?: string;
      barcode?: string;
      isActive?: boolean;
    }) => $adminUpdateVariant({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        ["products", "detail"],
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useDeleteVariant() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteVariant({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
        ["products", "detail"],
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useAdjustStock() {
  return useAction(
    async (vars: {
      variantId: string;
      adjustment: number;
      reason: string;
      notes?: string;
    }) => $adminAdjustStock({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
        QUERY_KEYS.INVENTORY.LOW_STOCK,
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useBulkStockUpdate() {
  return useAction(
    async (vars: {
      updates: Array<{
        variantId: string;
        adjustment: number;
        reason: string;
        notes?: string;
      }>;
    }) => $adminBulkStockUpdate({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
        QUERY_KEYS.INVENTORY.LOW_STOCK,
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// ORDER HOOKS
// =============================================================================

export function useUpdateOrderStatus() {
  return useAction(
    async (vars: { orderId: string; status: OrderStatus; notes?: string }) =>
      $adminUpdateOrderStatus({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.ORDERS.PAGINATED_BASE,
        QUERY_KEYS.ORDERS.FACETS,
        QUERY_KEYS.ORDERS.STATS,
      ],
      showToast: true,
    },
  );
}

export function useAddShipment() {
  return useAction(
    async (vars: {
      orderId: string;
      trackingNumber: string;
      carrier: string;
      trackingUrl?: string;
    }) => $adminAddShipment({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.ORDERS.PAGINATED_BASE,
        QUERY_KEYS.ORDERS.FACETS,
        QUERY_KEYS.ORDERS.STATS,
      ],
      showToast: true,
    },
  );
}

export function useCancelOrder() {
  return useAction(
    async (vars: {
      orderId: string;
      reason?: string;
      restockItems?: boolean;
    }) => $adminCancelOrder({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.ORDERS.PAGINATED_BASE,
        QUERY_KEYS.ORDERS.FACETS,
        QUERY_KEYS.ORDERS.STATS,
        QUERY_KEYS.INVENTORY.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// CART HOOKS
// =============================================================================

export function useAddToCart() {
  return useAction(
    async (vars: {
      variantId: string;
      quantity: number;
      sessionId?: string;
    }) => $addToCart({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT, QUERY_KEYS.CART.ITEMS],
      showToast: true,
    },
  );
}

export function useUpdateCartItem() {
  return useAction(
    async (vars: { cartItemId: string; quantity: number }) =>
      $updateCartItem({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT, QUERY_KEYS.CART.ITEMS],
      showToast: true,
    },
  );
}

export function useRemoveFromCart() {
  return useAction(
    async (vars: { cartItemId: string }) =>
      $removeFromCart({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT, QUERY_KEYS.CART.ITEMS],
      showToast: true,
    },
  );
}

export function useApplyCoupon() {
  return useAction(
    async (vars: { code: string }) => $applyCoupon({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT],
      showToast: true,
    },
  );
}

export function useRemoveCoupon() {
  return useAction(
    async () => $removeCoupon(),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT],
      showToast: true,
    },
  );
}

export function useClearCart() {
  return useAction(
    async () => $clearCart(),
    {
      invalidate: [QUERY_KEYS.CART.CURRENT, QUERY_KEYS.CART.ITEMS],
      showToast: true,
    },
  );
}

// =============================================================================
// COUPON HOOKS
// =============================================================================

export function useCreateCoupon() {
  return useAction(
    async (vars: {
      code: string;
      description?: string;
      discountType: "percentage" | "fixed_amount";
      discountValue: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      usageLimit?: number;
      usageLimitPerUser?: number;
      isActive?: boolean;
      startsAt?: string;
      expiresAt?: string;
    }) => $adminCreateCoupon({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COUPONS.PAGINATED_BASE, QUERY_KEYS.COUPONS.LIST],
      showToast: true,
    },
  );
}

export function useUpdateCoupon() {
  return useAction(
    async (vars: {
      couponId: string;
      code?: string;
      description?: string;
      discountType?: "percentage" | "fixed_amount";
      discountValue?: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      usageLimit?: number;
      usageLimitPerUser?: number;
      isActive?: boolean;
      startsAt?: string;
      expiresAt?: string;
    }) => $adminUpdateCoupon({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COUPONS.PAGINATED_BASE, QUERY_KEYS.COUPONS.LIST],
      showToast: true,
    },
  );
}

export function useDeleteCoupon() {
  return useAction(
    async (vars: { couponId: string }) =>
      $adminDeleteCoupon({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COUPONS.PAGINATED_BASE, QUERY_KEYS.COUPONS.LIST],
      showToast: true,
    },
  );
}

// =============================================================================
// REVIEW HOOKS
// =============================================================================

export function useAdminCreateReview() {
  return useAction(
    async (vars: {
      userId: string;
      productId: string;
      rating: number;
      title: string;
      content: string;
      isApproved?: boolean;
    }) => $adminCreateReview({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.REVIEWS.PAGINATED_BASE,
        QUERY_KEYS.REVIEWS.PENDING,
      ],
      showToast: true,
    },
  );
}

export function useApproveReview() {
  return useAction(
    async (vars: { reviewId: string }) =>
      $adminApproveReview({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.REVIEWS.PAGINATED_BASE,
        QUERY_KEYS.REVIEWS.PENDING,
      ],
      showToast: true,
    },
  );
}

export function useRejectReview() {
  return useAction(
    async (vars: { reviewId: string }) =>
      $adminRejectReview({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.REVIEWS.PAGINATED_BASE,
        QUERY_KEYS.REVIEWS.PENDING,
      ],
      showToast: true,
    },
  );
}

export function useDeleteReview() {
  return useAction(
    async (vars: { reviewId: string }) =>
      $adminDeleteReview({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.REVIEWS.PAGINATED_BASE,
        QUERY_KEYS.REVIEWS.PENDING,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// BRAND HOOKS
// =============================================================================

export function useCreateBrand() {
  return useAction(
    async (vars: {
      name: string;
      slug?: string;
      description?: string;
      logoUrl?: string;
      websiteUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
    }) => $adminCreateBrand({ data: vars }),
    {
      invalidate: [QUERY_KEYS.BRANDS.PAGINATED_BASE, QUERY_KEYS.BRANDS.LIST],
      showToast: true,
    },
  );
}

export function useUpdateBrand() {
  return useAction(
    async (vars: {
      brandId: string;
      name?: string;
      slug?: string;
      description?: string;
      logoUrl?: string;
      websiteUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
    }) => $adminUpdateBrand({ data: vars }),
    {
      invalidate: [QUERY_KEYS.BRANDS.PAGINATED_BASE, QUERY_KEYS.BRANDS.LIST],
      showToast: true,
    },
  );
}

export function useDeleteBrand() {
  return useAction(
    async (vars: { brandId: string }) =>
      $adminDeleteBrand({ data: vars }),
    {
      invalidate: [QUERY_KEYS.BRANDS.PAGINATED_BASE, QUERY_KEYS.BRANDS.LIST],
      showToast: true,
    },
  );
}

// =============================================================================
// CATEGORY HOOKS
// =============================================================================

export function useCreateCategory() {
  return useAction(
    async (vars: {
      name: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => $adminCreateCategory({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.CATEGORIES.PAGINATED_BASE,
        QUERY_KEYS.CATEGORIES.LIST,
        QUERY_KEYS.CATEGORIES.TREE,
      ],
      showToast: true,
    },
  );
}

export function useUpdateCategory() {
  return useAction(
    async (vars: {
      categoryId: string;
      name?: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => $adminUpdateCategory({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.CATEGORIES.PAGINATED_BASE,
        QUERY_KEYS.CATEGORIES.LIST,
        QUERY_KEYS.CATEGORIES.TREE,
      ],
      showToast: true,
    },
  );
}

export function useDeleteCategory() {
  return useAction(
    async (vars: { categoryId: string }) =>
      $adminDeleteCategory({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.CATEGORIES.PAGINATED_BASE,
        QUERY_KEYS.CATEGORIES.LIST,
        QUERY_KEYS.CATEGORIES.TREE,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// CHECKOUT HOOKS
// =============================================================================

export function useCreateCheckout() {
  return useAction(
    async (vars: {
      email: string;
      shippingAddressId?: string;
      shippingAddress?: {
        firstName: string;
        lastName: string;
        street1: string;
        street2?: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
        phone?: string;
      };
    }) => $createCheckout({ data: vars }),
    {
      showToast: true,
    },
  );
}

export function useVerifyPayment() {
  return useAction(
    async (vars: { sessionId: string }) =>
      $verifyPayment({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.CART.CURRENT,
        QUERY_KEYS.ORDERS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// PRODUCT IMAGE HOOKS
// =============================================================================

export function useAddProductImage() {
  return useAction(
    async (vars: {
      productId: string;
      url: string;
      altText?: string;
      isPrimary?: boolean;
    }) => $adminAddProductImage({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useDeleteProductImage() {
  return useAction(
    async (vars: { imageId: string }) =>
      $adminDeleteProductImage({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useSetPrimaryImage() {
  return useAction(
    async (vars: { imageId: string; productId: string }) =>
      $adminSetPrimaryImage({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useReorderProductImages() {
  return useAction(
    async (vars: { productId: string; imageIds: string[] }) =>
      $adminReorderProductImages({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

export function useAssignImageToVariant() {
  return useAction(
    async (vars: { imageId: string; variantId?: string | null; colorId?: string | null }) =>
      $adminAssignImageToVariant({ data: vars }),
    {
      invalidate: [
        QUERY_KEYS.PRODUCTS.PAGINATED_BASE,
      ],
      showToast: true,
    },
  );
}

// =============================================================================
// COLOR HOOKS
// =============================================================================

export function useCreateColor() {
  return useAction(
    async (vars: {
      name: string;
      hexCode: string;
      sortOrder?: number;
    }) => $adminCreateColor({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COLORS.LIST],
      showToast: true,
    },
  );
}

export function useUpdateColor() {
  return useAction(
    async (vars: {
      id: string;
      name?: string;
      hexCode?: string;
      sortOrder?: number;
    }) => $adminUpdateColor({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COLORS.LIST],
      showToast: true,
    },
  );
}

export function useDeleteColor() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteColor({ data: vars }),
    {
      invalidate: [QUERY_KEYS.COLORS.LIST],
      showToast: true,
    },
  );
}

// =============================================================================
// SIZE HOOKS
// =============================================================================

export function useCreateSize() {
  return useAction(
    async (vars: {
      name: string;
      sizeCategory: "clothing" | "shoes" | "accessories" | "one_size";
      sortOrder?: number;
    }) => $adminCreateSize({ data: vars }),
    {
      invalidate: [QUERY_KEYS.SIZES.LIST],
      showToast: true,
    },
  );
}

export function useUpdateSize() {
  return useAction(
    async (vars: {
      id: string;
      name?: string;
      sizeCategory?: "clothing" | "shoes" | "accessories" | "one_size";
      sortOrder?: number;
    }) => $adminUpdateSize({ data: vars }),
    {
      invalidate: [QUERY_KEYS.SIZES.LIST],
      showToast: true,
    },
  );
}

export function useDeleteSize() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteSize({ data: vars }),
    {
      invalidate: [QUERY_KEYS.SIZES.LIST],
      showToast: true,
    },
  );
}

// =============================================================================
// CAMPAIGN HOOKS
// =============================================================================

export function useCreateCampaign() {
  return useAction(
    async (vars: {
      name: string;
      description?: string;
      templateId?: string;
      flowDefinition?: { nodes: any[]; edges: any[] };
      audienceFilter?: Record<string, any>;
      scheduledAt?: string;
    }) => $adminCreateCampaign({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CAMPAIGNS.PAGINATED_BASE],
      showToast: true,
    },
  );
}

export function useUpdateCampaign() {
  return useAction(
    async (vars: {
      id: string;
      name?: string;
      description?: string;
      templateId?: string | null;
      status?: "draft" | "scheduled" | "running" | "completed" | "paused";
      flowDefinition?: { nodes: any[]; edges: any[] };
      audienceFilter?: Record<string, any>;
      scheduledAt?: string | null;
    }) => $adminUpdateCampaign({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CAMPAIGNS.PAGINATED_BASE, ["campaigns", "detail"]],
      showToast: true,
    },
  );
}

export function useDeleteCampaign() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteCampaign({ data: vars }),
    {
      invalidate: [QUERY_KEYS.CAMPAIGNS.PAGINATED_BASE],
      showToast: true,
    },
  );
}

// =============================================================================
// EMAIL TEMPLATE HOOKS
// =============================================================================

export function useCreateTemplate() {
  return useAction(
    async (vars: {
      name: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      variables?: string[];
      category?: "general" | "promotional" | "transactional" | "notification";
      isActive?: boolean;
    }) => $adminCreateTemplate({ data: vars }),
    {
      invalidate: [QUERY_KEYS.EMAIL_TEMPLATES.LIST],
      showToast: true,
    },
  );
}

export function useUpdateTemplate() {
  return useAction(
    async (vars: {
      id: string;
      name?: string;
      subject?: string;
      htmlContent?: string;
      textContent?: string;
      variables?: string[];
      category?: "general" | "promotional" | "transactional" | "notification";
      isActive?: boolean;
    }) => $adminUpdateTemplate({ data: vars }),
    {
      invalidate: [QUERY_KEYS.EMAIL_TEMPLATES.LIST, ["email-templates", "detail"]],
      showToast: true,
    },
  );
}

export function useDeleteTemplate() {
  return useAction(
    async (vars: { id: string }) => $adminDeleteTemplate({ data: vars }),
    {
      invalidate: [QUERY_KEYS.EMAIL_TEMPLATES.LIST],
      showToast: true,
    },
  );
}
