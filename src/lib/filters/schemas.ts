import { z } from "zod";
import { PAGINATION, ROLES } from "@/constants";

export const PaginationSearchSchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(PAGINATION.MAX_LIMIT)
		.optional(),
});

export const SortingSearchSchema = z.object({
	sortBy: z.string().optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const BaseFilterSchema =
	PaginationSearchSchema.merge(SortingSearchSchema);

export const UserFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	role: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(
				z.enum([ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
			),
		)
		.optional(),
	status: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["active", "banned", "pending"])),
		)
		.optional(),
	sortBy: z
		.enum(["name", "email", "createdAt", "updatedAt", "role"])
		.optional(),
});

export const OrganizationFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	plan: z.enum(["free", "author", "author_premium", "site_basic", "site_pro"]).optional(),
	status: z.enum(["active", "inactive", "trial"]).optional(),
	sortBy: z.enum(["name", "createdAt", "memberCount"]).optional(),
});

export const SessionFiltersSchema = BaseFilterSchema.extend({
	userId: z.string().optional(),
	active: z.coerce.boolean().optional(),
	sortBy: z.enum(["createdAt", "lastActive", "expiresAt"]).optional(),
});

// =============================================================================
// Billing Filter Schemas
// =============================================================================

export const SubscriptionFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	plan: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["free", "author", "author_premium", "site_basic", "site_pro"])),
		)
		.optional(),
	status: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["active", "trialing", "past_due", "canceled", "incomplete"])),
		)
		.optional(),
	interval: z.enum(["month", "year"]).optional(),
	sortBy: z
		.enum(["createdAt", "currentPeriodEnd", "plan", "status"])
		.optional(),
});

export const CustomerFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	hasSubscription: z.coerce.boolean().optional(),
	provider: z.enum(["stripe", "polar"]).optional(),
	sortBy: z.enum(["createdAt", "email", "name"]).optional(),
});

export const InvoiceFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	status: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["paid", "open", "draft", "uncollectible", "void"])),
		)
		.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	sortBy: z.enum(["createdAt", "amount", "status"]).optional(),
});

export const CreditTransactionFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	userId: z.string().optional(),
	type: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["purchase", "bonus", "usage", "refund"])),
		)
		.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	sortBy: z.enum(["createdAt", "amount", "type"]).optional(),
});

export type UserFilters = z.infer<typeof UserFiltersSchema>;
export type OrganizationFilters = z.infer<typeof OrganizationFiltersSchema>;
export type SessionFilters = z.infer<typeof SessionFiltersSchema>;
export type PaginationSearch = z.infer<typeof PaginationSearchSchema>;
export type SortingSearch = z.infer<typeof SortingSearchSchema>;

// Billing types
export type SubscriptionFilters = z.infer<typeof SubscriptionFiltersSchema>;
export type CustomerFilters = z.infer<typeof CustomerFiltersSchema>;
export type InvoiceFilters = z.infer<typeof InvoiceFiltersSchema>;
export type CreditTransactionFilters = z.infer<typeof CreditTransactionFiltersSchema>;

// =============================================================================
// E-Commerce Filter Schemas
// =============================================================================

export const ProductFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	status: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["draft", "active", "archived"])),
		)
		.optional(),
	categoryId: z.string().uuid().optional(),
	brandId: z.string().uuid().optional(),
	featured: z.coerce.boolean().optional(),
	sortBy: z
		.enum(["name", "basePrice", "createdAt", "totalStock"])
		.optional(),
});

export const OrderFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	status: z
		.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])),
		)
		.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	sortBy: z.enum(["createdAt", "total", "orderNumber"]).optional(),
});

export const InventoryFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	lowStock: z.coerce.boolean().optional(),
	outOfStock: z.coerce.boolean().optional(),
	categoryId: z.string().uuid().optional(),
	sortBy: z.enum(["sku", "stock", "productName"]).optional(),
});

export const EcommerceCustomerFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	hasOrders: z.coerce.boolean().optional(),
	sortBy: z.enum(["createdAt", "email", "name", "orderCount"]).optional(),
});

export const CouponFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	active: z.coerce.boolean().optional(),
	discountType: z.enum(["percentage", "fixed_amount"]).optional(),
	expired: z.coerce.boolean().optional(),
	sortBy: z.enum(["createdAt", "code", "usageCount", "expiresAt"]).optional(),
});

export const ReviewFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	approved: z.coerce.boolean().optional(),
	rating: z.coerce.number().min(1).max(5).optional(),
	verified: z.coerce.boolean().optional(),
	sortBy: z.enum(["createdAt", "rating", "helpfulCount"]).optional(),
});

export const BrandFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	active: z.coerce.boolean().optional(),
	sortBy: z.enum(["name", "createdAt", "sortOrder"]).optional(),
});

export const CategoryFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	active: z.coerce.boolean().optional(),
	parentId: z.string().uuid().optional(),
	sortBy: z.enum(["name", "createdAt", "sortOrder"]).optional(),
});

// E-commerce types
export type ProductFilters = z.infer<typeof ProductFiltersSchema>;
export type OrderFilters = z.infer<typeof OrderFiltersSchema>;
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;
export type EcommerceCustomerFilters = z.infer<typeof EcommerceCustomerFiltersSchema>;
export type CouponFilters = z.infer<typeof CouponFiltersSchema>;
export type ReviewFilters = z.infer<typeof ReviewFiltersSchema>;
export type BrandFilters = z.infer<typeof BrandFiltersSchema>;
export type CategoryFilters = z.infer<typeof CategoryFiltersSchema>;

// Campaign filters
export const CampaignFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	status: z.enum(["draft", "scheduled", "running", "completed", "paused"]).optional(),
});

export const TemplateFiltersSchema = BaseFilterSchema.extend({
	search: z.string().optional(),
	category: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
});

export type CampaignFilters = z.infer<typeof CampaignFiltersSchema>;
export type TemplateFilters = z.infer<typeof TemplateFiltersSchema>;
