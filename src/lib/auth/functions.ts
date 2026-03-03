import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import z from "zod";
import { type AppRole, ROLE_HIERARCHY, ROLES } from "@/constants";
import { env } from "@/env/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate } from "@/lib/validation";
import { auth } from "./auth";
import { accessMiddleware } from "./middleware";
import { canAccessRoute, getRoleCapabilities } from "./permissions";
import {
	adminApi,
	cookiePrefix,
	forwardSetCookies,
	getCurrentUser,
	normalizePagination,
	paginatedResult,
	serializeClearCookie,
} from "./server";

const BanUserSchema = z.object({
	userId: z.string().min(1),
	reason: z.string().optional(),
	expiresIn: z.number().optional(),
});

const SetRoleSchema = z.object({
	userId: z.string().min(1),
	role: z.enum(ROLE_HIERARCHY as unknown as [AppRole, ...AppRole[]]),
});

const UserIdSchema = z.object({ userId: z.string().min(1) });

const CreateUserSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1),
	role: z.enum(ROLE_HIERARCHY as unknown as [AppRole, ...AppRole[]]).optional(),
});

const UpdateUserSchema = z.object({
	userId: z.string().min(1),
	name: z.string().optional(),
	email: z.string().email().optional(),
});

const SetPasswordSchema = z.object({
	userId: z.string().min(1),
	newPassword: z.string().min(8),
});

const RouteSchema = z.object({ route: z.string().min(1) });

const SessionTokenSchema = z.object({ token: z.string().min(1) });

const ListUsersPaginatedSchema = z.object({
	page: z.number().int().positive().optional(),
	limit: z.number().int().positive().optional(),
	search: z.string().optional(),
	role: z.array(z.string().min(1)).optional(),
	status: z.array(z.enum(["active", "banned", "pending"])).optional(),
	sortBy: z
		.enum(["name", "email", "createdAt", "updatedAt", "role"])
		.optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

const UserFacetsSchema = z.object({
	search: z.string().optional(),
	role: z.array(z.string().min(1)).optional(),
	status: z.array(z.enum(["active", "banned", "pending"])).optional(),
});

function buildUsersWhereClause({
	search,
	roles,
	statuses,
	exclude,
}: {
	search?: string;
	roles: string[];
	statuses: Array<"active" | "banned" | "pending">;
	exclude?: "role" | "status";
}) {
	const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof or>> = [];

	if (search) {
		const query = `%${search}%`;
		conditions.push(
			or(ilike(userTable.email, query), ilike(userTable.name, query)),
		);
	}

	if (exclude !== "role" && roles.length > 0) {
		conditions.push(inArray(userTable.role, roles));
	}

	if (exclude !== "status" && statuses.length > 0) {
		const notBanned = or(eq(userTable.banned, false), isNull(userTable.banned));

		const statusConditions = statuses.map((status) => {
			if (status === "banned") return eq(userTable.banned, true);
			if (status === "pending")
				return and(notBanned, eq(userTable.emailVerified, false));
			return and(notBanned, eq(userTable.emailVerified, true));
		});

		conditions.push(or(...statusConditions));
	}

	return conditions.length > 0 ? and(...conditions) : undefined;
}

async function assertTargetNotSuperAdmin(userId: string) {
	const user = await adminApi.getUser(userId);
	if (!user) {
		throw { status: 404, message: "User not found" };
	}

	if (user.role === ROLES.SUPER_ADMIN) {
		throw { status: 403, message: "Super admin accounts cannot be modified." };
	}
}

export const $getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const session = await auth.api.getSession({
				headers: getRequest().headers,
				returnHeaders: true,
			});

			forwardSetCookies(session.headers);

			// Return in the format Better Auth expects
			if (session.response?.user && session.response?.session) {
				return {
					user: session.response.user,
					session: session.response.session,
				};
			}

			return null;
		} catch (error) {
			console.error("Failed to get session:", error);
			return null;
		}
	},
);

// QUERIES (GET)
export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
		returnHeaders: true,
	});

	forwardSetCookies(session.headers);

	return session.response?.user || null;
});

export const $getMyRoleInfo = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getCurrentUser();
		if (!user) return null;

		const role = user.role as AppRole;
		const capabilities = getRoleCapabilities(role);

		return {
			userId: user.id,
			role,
			capabilities,
		};
	},
);

export const $listUsers = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			const result = await adminApi.listUsers();
			return result;
		});
	});

export const $listUsersPaginated = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ListUsersPaginatedSchema, data))
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const params = normalizePagination({
				page: data.data.page,
				limit: data.data.limit,
				search: data.data.search,
				sortBy: data.data.sortBy,
				sortOrder: data.data.sortOrder,
			});

			const roles = data.data.role?.filter(Boolean) ?? [];
			const statuses = data.data.status ?? [];
			const whereClause = buildUsersWhereClause({
				search: params.search,
				roles,
				statuses,
			});

			const [{ total = 0 } = {}] = whereClause
				? await db.select({ total: count() }).from(userTable).where(whereClause)
				: await db.select({ total: count() }).from(userTable);

			const offset = (params.page - 1) * params.limit;

			const sortBy = params.sortBy ?? "createdAt";
			const sortOrder = params.sortBy ? params.sortOrder : "desc";

			const orderColumn = (() => {
				switch (sortBy) {
					case "name":
						return userTable.name;
					case "email":
						return userTable.email;
					case "createdAt":
						return userTable.createdAt;
					case "updatedAt":
						return userTable.updatedAt;
					case "role":
						return userTable.role;
					default:
						return userTable.createdAt;
				}
			})();

			const orderDirection =
				sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

			const items = await (whereClause
				? db
						.select({
							id: userTable.id,
							name: userTable.name,
							email: userTable.email,
							image: userTable.image,
							emailVerified: userTable.emailVerified,
							role: userTable.role,
							banned: userTable.banned,
							banReason: userTable.banReason,
							createdAt: userTable.createdAt,
							updatedAt: userTable.updatedAt,
						})
						.from(userTable)
						.where(whereClause)
				: db
						.select({
							id: userTable.id,
							name: userTable.name,
							email: userTable.email,
							image: userTable.image,
							emailVerified: userTable.emailVerified,
							role: userTable.role,
							banned: userTable.banned,
							banReason: userTable.banReason,
							createdAt: userTable.createdAt,
							updatedAt: userTable.updatedAt,
						})
						.from(userTable)
			)
				.orderBy(orderDirection, desc(userTable.createdAt))
				.limit(params.limit)
				.offset(offset);

			return paginatedResult(items, total, params);
		});
	});

export const $getUserFacets = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(UserFacetsSchema, data))
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const search = data.data.search?.trim() || undefined;
			const roles = data.data.role?.filter(Boolean) ?? [];
			const statuses = data.data.status ?? [];

			const roleWhere = buildUsersWhereClause({
				search,
				roles,
				statuses,
				exclude: "role",
			});

			const statusWhere = buildUsersWhereClause({
				search,
				roles,
				statuses,
				exclude: "status",
			});

			const roleRows = await (roleWhere
				? db
						.select({
							role: userTable.role,
							total: count(),
						})
						.from(userTable)
						.where(roleWhere)
				: db
						.select({
							role: userTable.role,
							total: count(),
						})
						.from(userTable)
			).groupBy(userTable.role);

			const roleCounts: Record<string, number> = Object.fromEntries(
				ROLE_HIERARCHY.map((r) => [r, 0]),
			);
			for (const row of roleRows) {
				roleCounts[row.role] = Number(row.total);
			}

			const [{ banned = 0, pending = 0, active = 0 } = {}] = await (statusWhere
				? db
						.select({
							banned: sql<number>`sum(case when ${userTable.banned} = true then 1 else 0 end)`,
							pending: sql<number>`sum(case when (${userTable.banned} is null or ${userTable.banned} = false) and ${userTable.emailVerified} = false then 1 else 0 end)`,
							active: sql<number>`sum(case when (${userTable.banned} is null or ${userTable.banned} = false) and ${userTable.emailVerified} = true then 1 else 0 end)`,
						})
						.from(userTable)
						.where(statusWhere)
				: db
						.select({
							banned: sql<number>`sum(case when ${userTable.banned} = true then 1 else 0 end)`,
							pending: sql<number>`sum(case when (${userTable.banned} is null or ${userTable.banned} = false) and ${userTable.emailVerified} = false then 1 else 0 end)`,
							active: sql<number>`sum(case when (${userTable.banned} is null or ${userTable.banned} = false) and ${userTable.emailVerified} = true then 1 else 0 end)`,
						})
						.from(userTable));

			return {
				roleCounts,
				statusCounts: {
					active: Number(active ?? 0),
					pending: Number(pending ?? 0),
					banned: Number(banned ?? 0),
				},
			};
		});
	});

export const $getDashboardUserStats = createServerFn({ method: "GET" })
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async () => {
		return safe(async () => {
			const [{ totalUsers = 0 } = {}] = await db
				.select({ totalUsers: count() })
				.from(userTable);

			const [{ adminCount = 0 } = {}] = await db
				.select({ adminCount: count() })
				.from(userTable)
				.where(inArray(userTable.role, [ROLES.ADMIN, ROLES.SUPER_ADMIN]));

			const [{ activeCount = 0 } = {}] = await db
				.select({ activeCount: count() })
				.from(userTable)
				.where(or(eq(userTable.banned, false), isNull(userTable.banned)));

			const recentUsers = await db
				.select({
					id: userTable.id,
					name: userTable.name,
					email: userTable.email,
					image: userTable.image,
					emailVerified: userTable.emailVerified,
					role: userTable.role,
					banned: userTable.banned,
					createdAt: userTable.createdAt,
				})
				.from(userTable)
				.orderBy(desc(userTable.createdAt))
				.limit(5);

			return { totalUsers, adminCount, activeCount, recentUsers };
		});
	});

// ACTIONS (POST)
export const $clearTrustedDevice = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(z.object({}), data);
	})
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;

				const prefix = cookiePrefix();
				const trustedDeviceCookie = `${prefix}${env.COOKIE_PREFIX}.trust_device`;
				setResponseHeader(
					"Set-Cookie",
					serializeClearCookie(trustedDeviceCookie),
				);
				return { cleared: true };
			},
			{ successMessage: "Trusted device cleared" },
		);
	});

export const $banUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(BanUserSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["ban"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				await assertTargetNotSuperAdmin(validated.userId);

				return adminApi.banUser(
					validated.userId,
					validated.reason,
					validated.expiresIn,
				);
			},
			{ successMessage: "User banned successfully" },
		);
	});

export const $unbanUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(z.object({ userId: z.string().min(1) }), data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["ban"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				await assertTargetNotSuperAdmin(validated.userId);

				return adminApi.unbanUser(validated.userId);
			},
			{ successMessage: "User unbanned successfully" },
		);
	});

export const $setUserRole = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(SetRoleSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				await assertTargetNotSuperAdmin(validated.userId);

				return adminApi.setRole(validated.userId, validated.role);
			},
			{ successMessage: "Role updated successfully" },
		);
	});

// USER CRUD OPERATIONS

export const $getUserById = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UserIdSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const user = await adminApi.getUser(validated.userId);
			if (!user) {
				throw { status: 404, message: "User not found" };
			}

			return user;
		});
	});

export const $createUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(CreateUserSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["create"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				return adminApi.createUser(validated);
			},
			{ successMessage: "User created successfully" },
		);
	});

export const $updateUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UpdateUserSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const { userId, ...updateData } = data.data;

				await assertTargetNotSuperAdmin(userId);

				return adminApi.updateUser(userId, updateData);
			},
			{ successMessage: "User updated successfully" },
		);
	});

export const $deleteUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UserIdSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["delete"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				await assertTargetNotSuperAdmin(validated.userId);

				return adminApi.deleteUser(validated.userId);
			},
			{ successMessage: "User deleted successfully" },
		);
	});

export const $setUserPassword = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(SetPasswordSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				await assertTargetNotSuperAdmin(validated.userId);

				return adminApi.setPassword(validated.userId, validated.newPassword);
			},
			{ successMessage: "Password changed successfully" },
		);
	});

// SESSION MANAGEMENT
export const $listUserSessions = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UserIdSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			return adminApi.listUserSessions(validated.userId);
		});
	});

export const $revokeSession = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(SessionTokenSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				return adminApi.revokeSession(validated.token);
			},
			{ successMessage: "Session revoked successfully" },
		);
	});

export const $revokeAllUserSessions = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UserIdSchema, data);
	})
	.middleware([accessMiddleware({ permissions: { users: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				return adminApi.revokeSessions(validated.userId);
			},
			{ successMessage: "All sessions revoked successfully" },
		);
	});

// IMPERSONATION
export const $impersonateUser = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(UserIdSchema, data);
	})
	.middleware([accessMiddleware({ minRole: "admin" })])
	.handler(async ({ data }) => {
		return safe(
			async () => {
				if (!data.ok) throw data.error;
				const validated = data.data;

				const result = await adminApi.impersonate(validated.userId);

				// Forward cookies for impersonation session
				if (result && "headers" in result) {
					forwardSetCookies(result.headers as Headers);
				}

				return result;
			},
			{ successMessage: "Now impersonating user" },
		);
	});

export const $stopImpersonation = createServerFn({ method: "POST" })
	.middleware([accessMiddleware({ requireAuth: true })])
	.handler(async () => {
		return safe(
			async () => {
				const result = await adminApi.stopImpersonation();

				// Forward cookies to restore original session
				if (result && "headers" in result) {
					forwardSetCookies(result.headers as Headers);
				}

				return result;
			},
			{ successMessage: "Stopped impersonating" },
		);
	});

// ROUTE ACCESS CHECK
export const $checkRouteAccess = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		return validate(RouteSchema, data);
	})
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;
			const validated = data.data;

			const user = await getCurrentUser();
			const role = user?.role as AppRole | undefined;
			const allowed = canAccessRoute(validated.route, role);

			return { route: validated.route, allowed, role: role ?? null };
		});
	});
