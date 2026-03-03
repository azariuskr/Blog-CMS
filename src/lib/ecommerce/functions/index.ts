/**
 * E-Commerce Server Functions
 *
 * Barrel export for all e-commerce server functions.
 */

// Products
export {
  $getProducts,
  $getProductBySlug,
  $adminGetProducts,
  $adminGetProduct,
  $adminCreateProduct,
  $adminUpdateProduct,
  $adminDeleteProduct,
  $adminPublishProduct,
  $getProductFacets,
  $getProductOptions,
  $getStorefrontFacets,
  $getRelatedProducts,
  $getCartRecommendations,
} from "./products";

// Variants
export {
  $adminCreateVariant,
  $adminUpdateVariant,
  $adminDeleteVariant,
  $adminBulkCreateVariants,
  $adminAdjustStock,
  $adminBulkStockUpdate,
  $getStockHistory,
} from "./variants";

// Cart
export {
  $getCart,
  $addToCart,
  $updateCartItem,
  $removeFromCart,
  $applyCoupon,
  $removeCoupon,
  $clearCart,
  $mergeGuestCart,
} from "./cart";

// Orders
export {
  $adminGetOrders,
  $adminGetOrder,
  $adminUpdateOrderStatus,
  $adminAddShipment,
  $adminCancelOrder,
  $getOrderStats,
  $getDailyRevenue,
  $getOrderFacets,
  $getMyOrders,
  $getMyOrder,
} from "./orders";

// Checkout
export {
  $createCheckout,
  $verifyPayment,
  $getAddresses,
  $saveAddress,
  $deleteAddress,
} from "./checkout";

// Coupons
export {
  $adminGetCoupons,
  $adminGetCoupon,
  $adminCreateCoupon,
  $adminUpdateCoupon,
  $adminDeleteCoupon,
} from "./coupons";

// Reviews
export {
  $getProductReviews,
  $submitReview,
  $adminGetReviews,
  $adminCreateReview,
  $adminApproveReview,
  $adminRejectReview,
  $adminDeleteReview,
} from "./reviews";

// Wishlist
export { $getWishlist, $toggleWishlist } from "./wishlist";

// Customers
export { $adminGetCustomers } from "./customers";

// Inventory
export { $adminGetInventory } from "./inventory";

// Brands
export {
  $adminGetBrands,
  $adminGetBrand,
  $adminCreateBrand,
  $adminUpdateBrand,
  $adminDeleteBrand,
} from "./brands";

// Product Images
export {
  $adminAddProductImage,
  $adminDeleteProductImage,
  $adminSetPrimaryImage,
  $adminReorderProductImages,
  $adminAssignImageToVariant,
} from "./product-images";

// Colors & Sizes
export {
  $getColors,
  $adminCreateColor,
  $adminUpdateColor,
  $adminDeleteColor,
  $getSizes,
  $adminCreateSize,
  $adminUpdateSize,
  $adminDeleteSize,
} from "./colors-sizes";

// Email Campaigns & Templates
export {
  $adminGetTemplates,
  $adminGetTemplate,
  $adminCreateTemplate,
  $adminUpdateTemplate,
  $adminDeleteTemplate,
  $adminGetTemplateList,
  $adminGetCampaigns,
  $adminGetCampaign,
  $adminCreateCampaign,
  $adminUpdateCampaign,
  $adminDeleteCampaign,
  $adminGetAudienceCount,
} from "./campaigns";

// Finance
export {
  $adminGetPayments,
  $getPaymentStats,
  $adminGetInvoices,
  $adminGetInvoiceDetail,
  $getFinancialReport,
} from "./finance";

// Categories
export {
  $adminGetCategories,
  $adminGetCategory,
  $adminCreateCategory,
  $adminUpdateCategory,
  $adminDeleteCategory,
  $adminGetCategoryTree,
} from "./categories";
