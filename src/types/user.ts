/**
 * User row model for data tables and list views.
 * Represents the user data as displayed in the admin users table.
 */
export interface UserRowModel {
	id: string;
	name?: string;
	email: string;
	image?: string | null;
	emailVerified?: boolean;
	role?: string;
	banned?: boolean | null;
	banReason?: string | null;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}
