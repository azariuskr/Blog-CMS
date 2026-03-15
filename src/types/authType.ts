import type { AppRole } from "@/lib/auth/permissions";

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	role: AppRole;
	banned?: boolean;
	emailVerified?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface Session {
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		token: string;
		ipAddress?: string;
		userAgent?: string;
	};
	user: SessionUser;
}
