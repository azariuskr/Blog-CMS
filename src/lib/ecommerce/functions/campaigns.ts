/**
 * Email Campaign & Template Server Functions
 *
 * CRUD for email templates and campaigns.
 * Campaign execution via Inngest.
 */

import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { normalizePagination, paginatedResult } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { emailTemplate, emailCampaign, user } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate, zId } from "@/lib/validation";
import { MESSAGES } from "@/constants";

// =============================================================================
// Schemas
// =============================================================================

const TemplateFiltersSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	search: z.string().optional(),
	category: z.string().optional(),
	isActive: z.boolean().optional(),
});

const CreateTemplateSchema = z.object({
	name: z.string().min(1).max(255),
	subject: z.string().min(1).max(500),
	htmlContent: z.string().min(1),
	textContent: z.string().optional(),
	variables: z.array(z.string().max(50)).max(20).default([]),
	category: z
		.enum(["general", "promotional", "transactional", "notification"])
		.default("general"),
	isActive: z.boolean().default(true),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
	id: zId,
});

const CampaignFiltersSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	search: z.string().optional(),
	status: z
		.enum(["draft", "scheduled", "running", "completed", "paused"])
		.optional(),
});

const CreateCampaignSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().max(1000).optional(),
	templateId: zId.optional(),
	flowDefinition: z
		.object({
			nodes: z.array(z.any()),
			edges: z.array(z.any()),
		})
		.default({ nodes: [], edges: [] }),
	audienceFilter: z.record(z.string(), z.any()).default({}),
	scheduledAt: z.string().datetime().optional(),
});

const UpdateCampaignSchema = z.object({
	id: zId,
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(1000).optional(),
	templateId: zId.nullable().optional(),
	status: z
		.enum(["draft", "scheduled", "running", "completed", "paused"])
		.optional(),
	flowDefinition: z
		.object({
			nodes: z.array(z.any()),
			edges: z.array(z.any()),
		})
		.optional(),
	audienceFilter: z.record(z.string(), z.any()).optional(),
	scheduledAt: z.string().datetime().nullable().optional(),
});

// =============================================================================
// Email Template Functions
// =============================================================================

export const $adminGetTemplates = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(TemplateFiltersSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
				search: data.data.search,
			});

			const offset = (params.page - 1) * params.limit;
			const conditions = [];

			if (params.search) {
				const query = `%${params.search}%`;
				conditions.push(
					or(
						ilike(emailTemplate.name, query),
						ilike(emailTemplate.subject, query),
					),
				);
			}

			if (data.data.category) {
				conditions.push(eq(emailTemplate.category, data.data.category));
			}

			if (data.data.isActive !== undefined) {
				conditions.push(eq(emailTemplate.isActive, data.data.isActive));
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(emailTemplate)
				.where(whereClause);

			const items = await db
				.select()
				.from(emailTemplate)
				.where(whereClause)
				.orderBy(desc(emailTemplate.createdAt))
				.limit(params.limit)
				.offset(offset);

			return paginatedResult(items, total, params);
		});
	});

export const $adminGetTemplate = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		z.object({ id: zId }).parse(data),
	)
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const result = await db.query.emailTemplate.findFirst({
				where: eq(emailTemplate.id, data.id),
			});
			if (!result) throw { status: 404, message: "Template not found" };
			return result;
		});
	});

export const $adminCreateTemplate = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateTemplateSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const [result] = await db
					.insert(emailTemplate)
					.values({
						name: data.data.name,
						subject: data.data.subject,
						htmlContent: data.data.htmlContent,
						textContent: data.data.textContent,
						variables: data.data.variables,
						category: data.data.category,
						isActive: data.data.isActive,
					})
					.returning();

				return result;
			},
			{ successMessage: MESSAGES.SUCCESS.TEMPLATE_CREATED },
		);
	});

export const $adminUpdateTemplate = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpdateTemplateSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const { id, ...updateData } = data.data;

				const existing = await db.query.emailTemplate.findFirst({
					where: eq(emailTemplate.id, id),
					columns: { id: true },
				});

				if (!existing)
					throw { status: 404, message: "Template not found" };

				const [result] = await db
					.update(emailTemplate)
					.set({ ...updateData, updatedAt: new Date() })
					.where(eq(emailTemplate.id, id))
					.returning();

				return result;
			},
			{ successMessage: MESSAGES.SUCCESS.TEMPLATE_UPDATED },
		);
	});

export const $adminDeleteTemplate = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		z.object({ id: zId }).parse(data),
	)
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				// Check if used by campaigns
				const campaigns = await db.query.emailCampaign.findMany({
					where: eq(emailCampaign.templateId, data.id),
					columns: { id: true },
					limit: 1,
				});

				if (campaigns.length > 0) {
					throw {
						status: 400,
						message:
							"Cannot delete template that is used by campaigns",
					};
				}

				await db
					.delete(emailTemplate)
					.where(eq(emailTemplate.id, data.id));
				return { deleted: true };
			},
			{ successMessage: MESSAGES.SUCCESS.TEMPLATE_DELETED },
		);
	});

// List all active templates (for dropdowns)
export const $adminGetTemplateList = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async () => {
		return safe(async () => {
			return db
				.select({
					id: emailTemplate.id,
					name: emailTemplate.name,
					subject: emailTemplate.subject,
					category: emailTemplate.category,
				})
				.from(emailTemplate)
				.where(eq(emailTemplate.isActive, true))
				.orderBy(asc(emailTemplate.name));
		});
	});

// =============================================================================
// Email Campaign Functions
// =============================================================================

export const $adminGetCampaigns = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(CampaignFiltersSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
				search: data.data.search,
			});

			const offset = (params.page - 1) * params.limit;
			const conditions = [];

			if (params.search) {
				const query = `%${params.search}%`;
				conditions.push(
					or(
						ilike(emailCampaign.name, query),
						ilike(emailCampaign.description, query),
					),
				);
			}

			if (data.data.status) {
				conditions.push(eq(emailCampaign.status, data.data.status));
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(emailCampaign)
				.where(whereClause);

			const items = await db
				.select({
					id: emailCampaign.id,
					name: emailCampaign.name,
					description: emailCampaign.description,
					status: emailCampaign.status,
					templateId: emailCampaign.templateId,
					scheduledAt: emailCampaign.scheduledAt,
					startedAt: emailCampaign.startedAt,
					completedAt: emailCampaign.completedAt,
					totalRecipients: emailCampaign.totalRecipients,
					sentCount: emailCampaign.sentCount,
					failedCount: emailCampaign.failedCount,
					createdAt: emailCampaign.createdAt,
					templateName: emailTemplate.name,
				})
				.from(emailCampaign)
				.leftJoin(
					emailTemplate,
					eq(emailCampaign.templateId, emailTemplate.id),
				)
				.where(whereClause)
				.orderBy(desc(emailCampaign.createdAt))
				.limit(params.limit)
				.offset(offset);

			return paginatedResult(items, total, params);
		});
	});

export const $adminGetCampaign = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		z.object({ id: zId }).parse(data),
	)
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const result = await db.query.emailCampaign.findFirst({
				where: eq(emailCampaign.id, data.id),
				with: {
					template: {
						columns: {
							id: true,
							name: true,
							subject: true,
							category: true,
						},
					},
				},
			});
			if (!result) throw { status: 404, message: "Campaign not found" };
			return result;
		});
	});

export const $adminCreateCampaign = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(CreateCampaignSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data, context }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const [result] = await db
					.insert(emailCampaign)
					.values({
						name: data.data.name,
						description: data.data.description,
						templateId: data.data.templateId,
						flowDefinition: data.data.flowDefinition,
						audienceFilter: data.data.audienceFilter,
						scheduledAt: data.data.scheduledAt
							? new Date(data.data.scheduledAt)
							: undefined,
						status: data.data.scheduledAt ? "scheduled" : "draft",
						createdBy: (context as any).user?.id,
					})
					.returning();

				return result;
			},
			{ successMessage: MESSAGES.SUCCESS.CAMPAIGN_CREATED },
		);
	});

export const $adminUpdateCampaign = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(UpdateCampaignSchema, data))
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const { id, ...updateData } = data.data;

				const existing = await db.query.emailCampaign.findFirst({
					where: eq(emailCampaign.id, id),
					columns: { id: true, status: true },
				});

				if (!existing)
					throw { status: 404, message: "Campaign not found" };

				// Don't allow editing running campaigns
				if (
					existing.status === "running" &&
					updateData.status !== "paused"
				) {
					throw {
						status: 400,
						message: "Cannot edit a running campaign",
					};
				}

				const values: Record<string, any> = {
					...updateData,
					updatedAt: new Date(),
				};

				if (updateData.scheduledAt) {
					values.scheduledAt = new Date(updateData.scheduledAt);
				} else if (updateData.scheduledAt === null) {
					values.scheduledAt = null;
				}

				const [result] = await db
					.update(emailCampaign)
					.set(values)
					.where(eq(emailCampaign.id, id))
					.returning();

				return result;
			},
			{ successMessage: MESSAGES.SUCCESS.CAMPAIGN_UPDATED },
		);
	});

export const $adminDeleteCampaign = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		z.object({ id: zId }).parse(data),
	)
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				const existing = await db.query.emailCampaign.findFirst({
					where: eq(emailCampaign.id, data.id),
					columns: { id: true, status: true },
				});

				if (!existing)
					throw { status: 404, message: "Campaign not found" };

				if (existing.status === "running") {
					throw {
						status: 400,
						message: "Cannot delete a running campaign",
					};
				}

				await db
					.delete(emailCampaign)
					.where(eq(emailCampaign.id, data.id));
				return { deleted: true };
			},
			{ successMessage: MESSAGES.SUCCESS.CAMPAIGN_DELETED },
		);
	});

// Get audience count for a filter
export const $adminGetAudienceCount = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		z.object({ filter: z.record(z.string(), z.any()) }).parse(data),
	)
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(async () => {
			const conditions = [];

			if (data.filter.hasOrdered) {
				conditions.push(
					sql`EXISTS (SELECT 1 FROM "order" WHERE "order"."user_id" = "user"."id")`,
				);
			}

			if (data.filter.role) {
				conditions.push(eq(user.role, data.filter.role));
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(user)
				.where(
					and(
						eq(user.emailVerified, true),
						whereClause,
					),
				);

			return { count: total };
		});
	});
