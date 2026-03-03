import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/admin/data-table";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { ThrottledAvatar } from "@/components/shared/ThrottledAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { type AppRole, ROLES } from "@/constants";
import { formatDate } from "@/lib/utils";
import type { UserRowModel } from "@/types/user";

interface ColumnContext {
	canWrite: boolean;
	canDelete: boolean;
	onEdit: (user: UserRowModel) => void;
	onDelete: (user: UserRowModel) => void;
}

export function createUsersColumns(
	context: ColumnContext,
): ColumnDef<UserRowModel>[] {
	const { canWrite, canDelete, onEdit, onDelete } = context;

	return [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					aria-label="Select all"
					checked={table.getIsAllPageRowsSelected()}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(Boolean(value))
					}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					aria-label="Select row"
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 32,
		},
		{
			accessorKey: "email",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="User" />
			),
			filterFn: (row, _id, value) => {
				const query = String(value ?? "")
					.toLowerCase()
					.trim();
				if (!query) return true;
				const user = row.original;
				return (
					user.email.toLowerCase().includes(query) ||
					(user.name ?? "").toLowerCase().includes(query)
				);
			},
			cell: ({ row }) => {
				const user = row.original;
				const initials =
					user.name?.charAt(0).toUpperCase() ??
					user.email.charAt(0).toUpperCase();
				return (
					<div className="flex items-center gap-3">
						<ThrottledAvatar
							className="h-10 w-10"
							src={user.image}
							alt={user.name ?? user.email}
							fallback={initials}
						/>
						<div className="min-w-0">
							<div className="truncate font-medium">
								{user.name ?? "Unnamed"}
							</div>
							<div className="truncate text-sm text-muted-foreground">
								{user.email}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "role",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Role" />
			),
			cell: ({ row }) => (
				<RoleBadge
					role={((row.original.role as AppRole) ?? ROLES.USER) as AppRole}
				/>
			),
			filterFn: (row, id, value) => {
				const selected = Array.isArray(value) ? value : [];
				if (selected.length === 0) return true;
				return selected.includes((row.getValue(id) as string) ?? ROLES.USER);
			},
		},
		{
			id: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			accessorFn: (row) =>
				row.banned
					? "banned"
					: row.emailVerified === false
						? "pending"
						: "active",
			cell: ({ row }) => (
				<StatusBadge
					status={
						row.original.banned
							? "banned"
							: row.original.emailVerified === false
								? "pending"
								: "active"
					}
				/>
			),
			filterFn: (row, id, value) => {
				const selected = Array.isArray(value) ? value : [];
				if (selected.length === 0) return true;
				return selected.includes(row.getValue(id) as string);
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.createdAt ? formatDate(row.original.createdAt) : "-"}
				</span>
			),
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const user = row.original;
				const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

				const actionGroups: ActionMenuGroup[] = [
					{
						label: "Actions",
						items: [
							...(canWrite
								? [
										{
											label: "Edit",
											icon: Pencil,
											onClick: () => onEdit(user),
											disabled: isSuperAdmin,
										},
									]
								: []),
							...(canDelete
								? [
										{
											label: "Delete",
											icon: Trash2,
											onClick: () => onDelete(user),
											disabled: isSuperAdmin,
											variant: "destructive" as const,
										},
									]
								: []),
						],
					},
				];

				return <BaseActionMenu groups={actionGroups} />;
			},
		},
	];
}
