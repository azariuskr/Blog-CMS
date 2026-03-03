/**
 * E-Commerce Query Options & Hooks
 *
 * Query option factories and useQuery hooks for all e-commerce data.
 * Follows the pattern established in src/lib/auth/queries.ts.
 */

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import {
  $adminGetProducts,
  $adminGetProduct,
  $getProductFacets,
  $getProductOptions,
  $getStorefrontFacets,
  $adminGetOrders,
  $adminGetOrder,
  $getOrderStats,
  $getDailyRevenue,
  $getOrderFacets,
  $adminGetInventory,
  $adminGetCoupons,
  $adminGetCoupon,
  $adminGetCustomers,
  $adminGetReviews,
  $getProductReviews,
  $getCart,
  $getStockHistory,
  $getWishlist,
  $getMyOrders,
  $getMyOrder,
  $getAddresses,
  $adminGetBrands,
  $adminGetBrand,
  $adminGetCategories,
  $adminGetCategory,
  $adminGetCategoryTree,
  $getColors,
  $getSizes,
  $adminGetCampaigns,
  $adminGetCampaign,
  $adminGetTemplates,
  $adminGetTemplate,
  $adminGetTemplateList,
  $adminGetPayments,
  $getPaymentStats,
  $adminGetInvoices,
  $adminGetInvoiceDetail,
  $getFinancialReport,
} from "./functions";
import type { ProductFilters } from "@/lib/filters/schemas";
import type { OrderFilters } from "@/lib/filters/schemas";
import type { InventoryFilters } from "@/lib/filters/schemas";
import type { CouponFilters } from "@/lib/filters/schemas";
import type { EcommerceCustomerFilters } from "@/lib/filters/schemas";
import type { ReviewFilters } from "@/lib/filters/schemas";
import type { BrandFilters } from "@/lib/filters/schemas";
import type { CategoryFilters } from "@/lib/filters/schemas";
import type { CampaignFilters, TemplateFilters } from "@/lib/filters/schemas";

// =============================================================================
// QUERY OPTIONS
// =============================================================================

// Products
export const adminProductsQueryOptions = (params: ProductFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.PRODUCTS.PAGINATED(params),
    queryFn: () => $adminGetProducts({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const adminProductQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.PRODUCTS.DETAIL(productId),
    queryFn: () => $adminGetProduct({ data: { id: productId } }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!productId,
  });

export const productFacetsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.PRODUCTS.FACETS,
    queryFn: () => $getProductFacets(),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

export const productOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...QUERY_KEYS.PRODUCTS.LIST, "options"],
    queryFn: () => $getProductOptions(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// Orders
export const adminOrdersQueryOptions = (params: OrderFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.ORDERS.PAGINATED(params),
    queryFn: () => $adminGetOrders({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const adminOrderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.ORDERS.DETAIL(orderId),
    queryFn: async () => {
      console.log("[DEBUG-QUERY] Fetching order:", orderId);
      try {
        const result = await $adminGetOrder({ data: { id: orderId } });
        console.log("[DEBUG-QUERY] Order result:", JSON.stringify(result).substring(0, 200));
        return result;
      } catch (err) {
        console.error("[DEBUG-QUERY] Order fetch error:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!orderId,
  });

export const orderStatsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.ORDERS.STATS,
    queryFn: () => $getOrderStats(),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

export const dailyRevenueQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["orders", "dailyRevenue", days ?? 30],
    queryFn: () => $getDailyRevenue({ data: { days } }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

export const orderFacetsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.ORDERS.FACETS,
    queryFn: () => $getOrderFacets(),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

// Inventory
export const adminInventoryQueryOptions = (params: InventoryFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.INVENTORY.PAGINATED(params),
    queryFn: () => $adminGetInventory({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

// Coupons
export const adminCouponsQueryOptions = (params: CouponFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.COUPONS.PAGINATED(params),
    queryFn: () => $adminGetCoupons({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const adminCouponQueryOptions = (couponId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.COUPONS.DETAIL(couponId),
    queryFn: () => $adminGetCoupon({ data: { couponId } }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!couponId,
  });

// Brands
export const adminBrandsQueryOptions = (params: BrandFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.BRANDS.PAGINATED(params),
    queryFn: () => $adminGetBrands({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const adminBrandQueryOptions = (brandId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.BRANDS.DETAIL(brandId),
    queryFn: () => $adminGetBrand({ data: { brandId } }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!brandId,
  });

// Categories
export const adminCategoriesQueryOptions = (params: CategoryFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.CATEGORIES.PAGINATED(params),
    queryFn: () => $adminGetCategories({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const adminCategoryQueryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.CATEGORIES.DETAIL(categoryId),
    queryFn: () => $adminGetCategory({ data: { categoryId } }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    enabled: !!categoryId,
  });

export const adminCategoryTreeQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.CATEGORIES.TREE,
    queryFn: () => $adminGetCategoryTree(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// Customers
export const adminCustomersQueryOptions = (params: EcommerceCustomerFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.CUSTOMERS.PAGINATED(params),
    queryFn: () => $adminGetCustomers({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

// Reviews
export const adminReviewsQueryOptions = (params: ReviewFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.REVIEWS.PAGINATED(params),
    queryFn: () => $adminGetReviews({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

// Cart
export const cartQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.CART.CURRENT,
    queryFn: () => $getCart(),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
  });

// Stock history
export const stockHistoryQueryOptions = (variantId: string) =>
  queryOptions({
    queryKey: [...QUERY_KEYS.INVENTORY.LIST, "history", variantId],
    queryFn: () => $getStockHistory({ data: { variantId } }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!variantId,
  });

// Storefront facets (categories, brands, price range)
export const storefrontFacetsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "facets"],
    queryFn: () => $getStorefrontFacets(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// Product reviews (public)
export const productReviewsQueryOptions = (productId: string, page = 1) =>
  queryOptions({
    queryKey: [...QUERY_KEYS.REVIEWS.BY_PRODUCT(productId), page],
    queryFn: () => $getProductReviews({ data: { productId, page, limit: 10 } }),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    enabled: !!productId,
  });

// Wishlist
export const wishlistQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.WISHLIST.ITEMS,
    queryFn: () => $getWishlist(),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
  });

// My Orders (customer-facing)
export const myOrdersQueryOptions = (params: { page?: number; status?: string }) =>
  queryOptions({
    queryKey: QUERY_KEYS.MY_ORDERS.PAGINATED(params),
    queryFn: () => $getMyOrders({ data: params as any }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const myOrderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.MY_ORDERS.DETAIL(orderId),
    queryFn: () => $getMyOrder({ data: { id: orderId } }),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    enabled: !!orderId,
  });

// Addresses
export const addressesQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.ADDRESSES.LIST,
    queryFn: () => $getAddresses(),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
  });

// Colors
export const colorsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.COLORS.LIST,
    queryFn: () => $getColors(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// Sizes
export const sizesQueryOptions = (category?: "clothing" | "shoes" | "accessories" | "one_size") =>
  queryOptions({
    queryKey: [...QUERY_KEYS.SIZES.LIST, category ?? "all"],
    queryFn: () => $getSizes({ data: { category } }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// =============================================================================
// QUERY HOOKS
// =============================================================================

// Products
export function useAdminProducts(params: ProductFilters) {
  return useQuery(adminProductsQueryOptions(params));
}

export function useAdminProduct(productId: string) {
  return useQuery(adminProductQueryOptions(productId));
}

export function useProductFacets() {
  return useQuery(productFacetsQueryOptions());
}

export function useProductOptions() {
  return useQuery(productOptionsQueryOptions());
}

// Orders
export function useAdminOrders(params: OrderFilters) {
  return useQuery(adminOrdersQueryOptions(params));
}

export function useAdminOrder(orderId: string) {
  return useQuery(adminOrderQueryOptions(orderId));
}

export function useOrderStats() {
  return useQuery(orderStatsQueryOptions());
}

export function useDailyRevenue(days?: number) {
  return useQuery(dailyRevenueQueryOptions(days));
}

export function useOrderFacets() {
  return useQuery(orderFacetsQueryOptions());
}

// Inventory
export function useAdminInventory(params: InventoryFilters) {
  return useQuery(adminInventoryQueryOptions(params));
}

// Coupons
export function useAdminCoupons(params: CouponFilters) {
  return useQuery(adminCouponsQueryOptions(params));
}

export function useAdminCoupon(couponId: string) {
  return useQuery(adminCouponQueryOptions(couponId));
}

// Brands
export function useAdminBrands(params: BrandFilters) {
  return useQuery(adminBrandsQueryOptions(params));
}

export function useAdminBrand(brandId: string) {
  return useQuery(adminBrandQueryOptions(brandId));
}

// Categories
export function useAdminCategories(params: CategoryFilters) {
  return useQuery(adminCategoriesQueryOptions(params));
}

export function useAdminCategory(categoryId: string) {
  return useQuery(adminCategoryQueryOptions(categoryId));
}

export function useAdminCategoryTree() {
  return useQuery(adminCategoryTreeQueryOptions());
}

// Customers
export function useAdminCustomers(params: EcommerceCustomerFilters) {
  return useQuery(adminCustomersQueryOptions(params));
}

// Reviews
export function useAdminReviews(params: ReviewFilters) {
  return useQuery(adminReviewsQueryOptions(params));
}

// Cart
export function useCart() {
  return useQuery(cartQueryOptions());
}

// Stock history
export function useStockHistory(variantId: string) {
  return useQuery(stockHistoryQueryOptions(variantId));
}

// Storefront facets
export function useStorefrontFacets() {
  return useQuery(storefrontFacetsQueryOptions());
}

// Product reviews
export function useProductReviews(productId: string, page = 1) {
  return useQuery(productReviewsQueryOptions(productId, page));
}

// Wishlist
export function useWishlist() {
  return useQuery(wishlistQueryOptions());
}

// My Orders (customer)
export function useMyOrders(params: { page?: number; status?: string } = {}) {
  return useQuery(myOrdersQueryOptions(params));
}

export function useMyOrder(orderId: string) {
  return useQuery(myOrderQueryOptions(orderId));
}

// Addresses
export function useAddresses() {
  return useQuery(addressesQueryOptions());
}

// Colors
export function useColors() {
  return useQuery(colorsQueryOptions());
}

// Sizes
export function useSizes(category?: "clothing" | "shoes" | "accessories" | "one_size") {
  return useQuery(sizesQueryOptions(category));
}

// =============================================================================
// TYPES
// =============================================================================

export type AdminProductsResult = Awaited<ReturnType<typeof $adminGetProducts>>;
export type AdminProductResult = Awaited<ReturnType<typeof $adminGetProduct>>;
export type ProductFacetsResult = Awaited<ReturnType<typeof $getProductFacets>>;
export type ProductOptionsResult = Awaited<ReturnType<typeof $getProductOptions>>;
export type AdminOrdersResult = Awaited<ReturnType<typeof $adminGetOrders>>;
export type AdminOrderResult = Awaited<ReturnType<typeof $adminGetOrder>>;
export type OrderStatsResult = Awaited<ReturnType<typeof $getOrderStats>>;
export type OrderFacetsResult = Awaited<ReturnType<typeof $getOrderFacets>>;
export type AdminInventoryResult = Awaited<ReturnType<typeof $adminGetInventory>>;
export type AdminCouponsResult = Awaited<ReturnType<typeof $adminGetCoupons>>;
export type AdminCouponResult = Awaited<ReturnType<typeof $adminGetCoupon>>;
export type AdminCustomersResult = Awaited<ReturnType<typeof $adminGetCustomers>>;
export type AdminReviewsResult = Awaited<ReturnType<typeof $adminGetReviews>>;
export type CartResult = Awaited<ReturnType<typeof $getCart>>;
export type StockHistoryResult = Awaited<ReturnType<typeof $getStockHistory>>;
export type StorefrontFacetsResult = Awaited<ReturnType<typeof $getStorefrontFacets>>;
export type ProductReviewsResult = Awaited<ReturnType<typeof $getProductReviews>>;
export type WishlistResult = Awaited<ReturnType<typeof $getWishlist>>;
export type MyOrdersResult = Awaited<ReturnType<typeof $getMyOrders>>;
export type MyOrderResult = Awaited<ReturnType<typeof $getMyOrder>>;
export type AddressesResult = Awaited<ReturnType<typeof $getAddresses>>;
export type AdminBrandsResult = Awaited<ReturnType<typeof $adminGetBrands>>;
export type AdminBrandResult = Awaited<ReturnType<typeof $adminGetBrand>>;
export type AdminCategoriesResult = Awaited<ReturnType<typeof $adminGetCategories>>;
export type AdminCategoryResult = Awaited<ReturnType<typeof $adminGetCategory>>;
export type AdminCategoryTreeResult = Awaited<ReturnType<typeof $adminGetCategoryTree>>;
export type ColorsResult = Awaited<ReturnType<typeof $getColors>>;
export type SizesResult = Awaited<ReturnType<typeof $getSizes>>;
export type AdminCampaignsResult = Awaited<ReturnType<typeof $adminGetCampaigns>>;
export type AdminCampaignResult = Awaited<ReturnType<typeof $adminGetCampaign>>;
export type AdminTemplatesResult = Awaited<ReturnType<typeof $adminGetTemplates>>;
export type AdminTemplateResult = Awaited<ReturnType<typeof $adminGetTemplate>>;
export type AdminTemplateListResult = Awaited<ReturnType<typeof $adminGetTemplateList>>;

// =============================================================================
// Campaigns
// =============================================================================

export const adminCampaignsQueryOptions = (params: CampaignFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.CAMPAIGNS.PAGINATED(params),
    queryFn: () => $adminGetCampaigns({ data: params }),
    placeholderData: keepPreviousData,
  });

export const adminCampaignQueryOptions = (id: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.CAMPAIGNS.DETAIL(id),
    queryFn: () => $adminGetCampaign({ data: { id } }),
    enabled: !!id,
  });

export function useAdminCampaigns(params: CampaignFilters) {
  return useQuery(adminCampaignsQueryOptions(params));
}

export function useAdminCampaign(id: string) {
  return useQuery(adminCampaignQueryOptions(id));
}

// =============================================================================
// Email Templates
// =============================================================================

export const adminTemplatesQueryOptions = (params: TemplateFilters) =>
  queryOptions({
    queryKey: QUERY_KEYS.EMAIL_TEMPLATES.LIST,
    queryFn: () => $adminGetTemplates({ data: params }),
    placeholderData: keepPreviousData,
  });

export const adminTemplateQueryOptions = (id: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.EMAIL_TEMPLATES.DETAIL(id),
    queryFn: () => $adminGetTemplate({ data: { id } }),
    enabled: !!id,
  });

export const adminTemplateListQueryOptions = () =>
  queryOptions({
    queryKey: [...QUERY_KEYS.EMAIL_TEMPLATES.LIST, "dropdown"],
    queryFn: () => $adminGetTemplateList(),
    staleTime: 1000 * 60 * 5,
  });

export function useAdminTemplates(params: TemplateFilters) {
  return useQuery(adminTemplatesQueryOptions(params));
}

export function useAdminTemplate(id: string) {
  return useQuery(adminTemplateQueryOptions(id));
}

export function useAdminTemplateList() {
  return useQuery(adminTemplateListQueryOptions());
}

// =============================================================================
// Finance - Payments, Invoices, Reports
// =============================================================================

export type PaymentFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ("pending" | "completed" | "failed" | "refunded")[];
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
};

export type InvoiceFilters = {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const adminPaymentsQueryOptions = (params: PaymentFilters) =>
  queryOptions({
    queryKey: ["finance", "payments", params],
    queryFn: () => $adminGetPayments({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const paymentStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["finance", "payment-stats"],
    queryFn: () => $getPaymentStats(),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

export const adminInvoicesQueryOptions = (params: InvoiceFilters) =>
  queryOptions({
    queryKey: ["finance", "invoices", params],
    queryFn: () => $adminGetInvoices({ data: params }),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const invoiceDetailQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: ["finance", "invoice-detail", orderId],
    queryFn: () => $adminGetInvoiceDetail({ data: { orderId } }),
    enabled: !!orderId,
  });

export const financialReportQueryOptions = (period?: "7d" | "30d" | "90d" | "12m" | "all") =>
  queryOptions({
    queryKey: ["finance", "report", period ?? "30d"],
    queryFn: () => $getFinancialReport({ data: { period } }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

export function useAdminPayments(params: PaymentFilters) {
  return useQuery(adminPaymentsQueryOptions(params));
}

export function usePaymentStats() {
  return useQuery(paymentStatsQueryOptions());
}

export function useAdminInvoices(params: InvoiceFilters) {
  return useQuery(adminInvoicesQueryOptions(params));
}

export function useInvoiceDetail(orderId: string) {
  return useQuery(invoiceDetailQueryOptions(orderId));
}

export function useFinancialReport(period?: "7d" | "30d" | "90d" | "12m" | "all") {
  return useQuery(financialReportQueryOptions(period));
}
