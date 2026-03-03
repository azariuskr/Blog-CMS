import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import type { BulkOperation } from "@/components/admin/data-table/bulk-actions";
import {
	EditUserDialog,
	UserCreateDialog,
	UserDeleteDialog,
} from "@/components/admin/users/dialogs";
import { createUsersColumns } from "@/components/admin/users/users-columns";
import { UsersTable } from "@/components/admin/users/users-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useHasPermission, useSession } from "@/hooks/auth-hooks";
import {
	useBanUser,
	useDeleteUser,
	useStopImpersonation,
	useUnbanUser,
} from "@/hooks/user-actions";
import { useUsersPaginated } from "@/lib/auth/queries";
import { useFilters } from "@/lib/filters/core";
import type { UserFilters } from "@/lib/filters/schemas";
import { UserFiltersSchema } from "@/lib/filters/schemas";
import { useOverlay } from "@/lib/store/overlay";
import type { UserRowModel } from "@/types/user";

interface UsersViewProps {
	search?: UserFilters;
}

export function Users({ search }: UsersViewProps) {
	const navigate = useNavigate();
	const { data: session } = useSession();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...UserFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: UserFilters) => UserFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	const { data: usersResult, isLoading } = useUsersPaginated({
		page: filters.page ?? 1,
		limit: filters.limit ?? 10,
		search: filters.search,
		role: filters.role,
		status: filters.status,
		sortBy: filters.sortBy,
		sortOrder: filters.sortOrder,
	});

	// Permissions
	const canCreate = useHasPermission({ users: ["create"] });
	const canWrite = useHasPermission({ users: ["write"] });
	const canDelete = useHasPermission({ users: ["delete"] });

	// Impersonation state
	const stopImpersonationMutation = useStopImpersonation();
	const isImpersonating = Boolean(
		(session as { session?: { impersonatedBy?: string } })?.session
			?.impersonatedBy,
	);

	// Extract users data
	const users: UserRowModel[] = usersResult?.ok
		? (usersResult.data.items ?? [])
		: [];
	const totalPages = usersResult?.ok ? usersResult.data.totalPages : 1;

	// Column definitions with action handlers
	const columns = useMemo(
		() =>
			createUsersColumns({
				canWrite,
				canDelete,
				onEdit: (user) => {
					// Pass data directly to open() to ensure it's set atomically
					open("editUser", user);
				},
				onDelete: (user) => {
					open("confirmDelete", user);
				},
			}),
		[canWrite, canDelete, open],
	);

	// Bulk action mutations
	const banMutation = useBanUser();
	const unbanMutation = useUnbanUser();
	const deleteMutation = useDeleteUser();

	const bulkOperations = useMemo<
		BulkOperation<UserRowModel, { userId: string }>[]
	>(
		() => [
			{
				label: "Ban",
				icon: UserX,
				variant: "outline",
				getItemData: (row) => ({ userId: row.original.id }),
				execute: (vars) => banMutation.mutateAsync(vars),
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0) toast.success(`Banned ${successCount} users`);
					if (failureCount > 0)
						toast.error(`Failed to ban ${failureCount} users`);
				},
			},
			{
				label: "Unban",
				icon: UserCheck,
				variant: "outline",
				getItemData: (row) => ({ userId: row.original.id }),
				execute: (vars) => unbanMutation.mutateAsync(vars),
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0) toast.success(`Unbanned ${successCount} users`);
					if (failureCount > 0)
						toast.error(`Failed to unban ${failureCount} users`);
				},
			},
			{
				label: "Delete",
				icon: Trash2,
				variant: "destructive",
				requireConfirmation: true,
				confirmationMessage: undefined, // Uses default: "Are you sure you want to delete X user(s)?"
				getItemData: (row) => ({ userId: row.original.id }),
				execute: (vars) => deleteMutation.mutateAsync(vars),
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0) toast.success(`Deleted ${successCount} users`);
					if (failureCount > 0)
						toast.error(`Failed to delete ${failureCount} users`);
				},
			},
		],
		[banMutation, unbanMutation, deleteMutation],
	);

	// Handle stop impersonation
	const handleStopImpersonation = useCallback(async () => {
		const result = await stopImpersonationMutation.mutateAsync();
		if (result.ok) {
			navigate({ to: ROUTES.ADMIN.USERS });
		}
	}, [stopImpersonationMutation, navigate]);

	return (
		<PageContainer
			title="User Management"
			description="Manage users, roles, and permissions"
			actions={
				<>
					{isImpersonating && (
						<Button
							variant="outline"
							disabled={stopImpersonationMutation.isPending}
							onClick={handleStopImpersonation}
						>
							Stop impersonation
						</Button>
					)}
					<Button onClick={() => open("createUser")} disabled={!canCreate}>
						<Plus className="mr-2 h-4 w-4" />
						Add User
					</Button>
				</>
			}
		>
			<Card>
				<CardContent>
					<UsersTable
						data={users}
						columns={columns}
						filters={filters}
						setFilters={setFilters}
						isLoading={isLoading}
						bulkOperations={bulkOperations}
						pageCount={totalPages}
					/>
				</CardContent>
			</Card>

			{/* Dialogs */}
			<UserCreateDialog />
			<EditUserDialog />
			<UserDeleteDialog />
		</PageContainer>
	);
}
