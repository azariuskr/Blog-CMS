import { useNavigate } from "@tanstack/react-router";
import { Key, UserCheck, UserX } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { BaseDialog } from "@/components/shared/base/base-dialog";
import { BaseFormDialog } from "@/components/shared/base/base-form-dialog";
import { FormField } from "@/components/shared/form/form-field";
import { FormSelectField } from "@/components/shared/form/form-select-field";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { type AppRole, QUERY_KEYS, ROLE_OPTIONS, ROLES } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import { useFormAction } from "@/hooks/use-action";
import {
	useBanUser,
	useImpersonateUser,
	useUnbanUser,
} from "@/hooks/user-actions";
import {
	$createUser,
	$deleteUser,
	$setUserPassword,
	$setUserRole,
	$updateUser,
} from "@/lib/auth/functions";
import { useOverlay, useOverlayStore } from "@/lib/store/overlay";
import type { UserRowModel } from "@/types/user";

// Create User Dialog
export function UserCreateDialog({ onSuccess }: { onSuccess?: () => void }) {
	const { isOpen, close } = useOverlay();

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		role: ROLES.USER as AppRole,
	});

	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

	const createMutation = useFormAction(
		async (vars: {
			email: string;
			password: string;
			name: string;
			role?: AppRole;
		}) => $createUser({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
			setErrors: (errors) => setFieldErrors(errors),
			onSuccess: async () => {
				close();
				setFormData({ name: "", email: "", password: "", role: ROLES.USER });
				setFieldErrors({});
				onSuccess?.();
			},
		},
	);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setFieldErrors({});
		createMutation.mutate(formData);
	};

	return (
		<BaseFormDialog
			open={isOpen("createUser")}
			onOpenChange={(open) => !open && close()}
			title="Create User"
			description="Add a new user to the system"
			onSubmit={handleSubmit}
			submitLabel="Create User"
			isSubmitting={createMutation.isPending}
		>
			<FormField
				label="Name"
				name="name"
				value={formData.name}
				onChange={(e) => setFormData({ ...formData, name: e.target.value })}
				placeholder="John Doe"
				error={fieldErrors.name?.[0]}
				required
			/>
			<FormField
				label="Email"
				name="email"
				type="email"
				value={formData.email}
				onChange={(e) => setFormData({ ...formData, email: e.target.value })}
				placeholder="john@example.com"
				error={fieldErrors.email?.[0]}
				required
			/>
			<FormField
				label="Password"
				name="password"
				type="password"
				value={formData.password}
				onChange={(e) => setFormData({ ...formData, password: e.target.value })}
				placeholder="Min 8 characters"
				minLength={8}
				error={fieldErrors.password?.[0]}
				required
			/>
			<FormSelectField
				label="Role"
				value={formData.role}
				onValueChange={(role: AppRole) => setFormData({ ...formData, role })}
				options={ROLE_OPTIONS}
				error={fieldErrors.role?.[0]}
				required
			/>
		</BaseFormDialog>
	);
}

// Edit User Dialog
interface EditUserDialogProps {
	onSuccess?: () => void;
}

export function EditUserDialog({ onSuccess }: EditUserDialogProps) {
	const { close } = useOverlay();
	const editUserOpen = useOverlayStore((s) => s.id === "editUser");
	const overlayData = useOverlayStore((s) => s.data as UserRowModel | null);
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		role: ROLES.USER as AppRole,
	});
	const [updateErrors, setUpdateErrors] = useState<Record<string, string[]>>(
		{},
	);
	const [roleErrors, setRoleErrors] = useState<Record<string, string[]>>({});
	const [newPassword, setNewPassword] = useState("");
	const [passwordErrors, setPasswordErrors] = useState<
		Record<string, string[]>
	>({});
	const [confirmRoleOpen, setConfirmRoleOpen] = useState(false);
	const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
	const [confirmBanOpen, setConfirmBanOpen] = useState(false);
	const [confirmUnbanOpen, setConfirmUnbanOpen] = useState(false);
	const [confirmImpersonateOpen, setConfirmImpersonateOpen] = useState(false);

	const canWrite = useHasPermission({ users: ["write"] });
	const canBan = useHasPermission({ users: ["ban"] });
	const canImpersonate = useHasPermission({ users: ["impersonate"] });

	// Mutations for ban/unban/impersonate
	const banMutation = useBanUser();
	const unbanMutation = useUnbanUser();
	const impersonateMutation = useImpersonateUser();

	const updateMutation = useFormAction(
		async (vars: { userId: string; name?: string; email?: string }) =>
			$updateUser({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
			setErrors: (errors) => setUpdateErrors(errors),
			onSuccess: () => onSuccess?.(),
		},
	);

	const roleMutation = useFormAction(
		async (vars: { userId: string; role: string }) =>
			$setUserRole({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
			setErrors: (errors) => setRoleErrors(errors),
			onSuccess: () => onSuccess?.(),
		},
	);

	const setPasswordMutation = useFormAction(
		async (vars: { userId: string; newPassword: string }) =>
			$setUserPassword({ data: vars }),
		{
			showToast: true,
			setErrors: (errors) => setPasswordErrors(errors),
		},
	);

	const user = overlayData;

	// Populate form data when dialog opens with user data
	useEffect(() => {
		if (!editUserOpen || !user) return;
		setFormData({
			name: user.name ?? "",
			email: user.email,
			role: (user.role as AppRole) ?? ROLES.USER,
		});
		setNewPassword("");
		setUpdateErrors({});
		setRoleErrors({});
		setPasswordErrors({});
		setConfirmRoleOpen(false);
		setConfirmPasswordOpen(false);
		setConfirmBanOpen(false);
		setConfirmUnbanOpen(false);
		setConfirmImpersonateOpen(false);
	}, [editUserOpen, user]);

	// Handlers for ban/unban/impersonate
	const handleBan = async () => {
		if (!user) return;
		setConfirmBanOpen(true);
	};

	const handleConfirmBan = async () => {
		if (!user) return;
		const result = await banMutation.mutateAsync({
			userId: user.id,
			reason: "Banned by admin",
		});
		if (result.ok) {
			setConfirmBanOpen(false);
			onSuccess?.();
		}
	};

	const handleUnban = async () => {
		if (!user) return;
		setConfirmUnbanOpen(true);
	};

	const handleConfirmUnban = async () => {
		if (!user) return;
		const result = await unbanMutation.mutateAsync({ userId: user.id });
		if (result.ok) {
			setConfirmUnbanOpen(false);
			onSuccess?.();
		}
	};

	const handleImpersonate = async () => {
		if (!user) return;
		setConfirmImpersonateOpen(true);
	};

	const handleConfirmImpersonate = async () => {
		if (!user) return;
		const result = await impersonateMutation.mutateAsync({ userId: user.id });
		if (result.ok) {
			setConfirmImpersonateOpen(false);
			navigate({ to: "/admin/users" as string });
		}
	};

	const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
	const currentRole = ((user?.role as AppRole) ?? ROLES.USER) as AppRole;
	const roleChanged = Boolean(user && formData.role !== currentRole);
	const canEditThisUser = canWrite && !isSuperAdmin;

	const save = async (includeRole: boolean) => {
		if (!user) return;

		setUpdateErrors({});
		setRoleErrors({});

		const name = formData.name.trim();
		const email = formData.email.trim();

		const nameChanged = name !== (user.name ?? "");
		const emailChanged = email !== user.email;

		if (nameChanged || emailChanged) {
			const result = await updateMutation.mutateAsync({
				userId: user.id,
				name: name || undefined,
				email: email || undefined,
			});
			if (!result.ok) return;
		}

		if (includeRole && roleChanged) {
			const result = await roleMutation.mutateAsync({
				userId: user.id,
				role: formData.role,
			});
			if (!result.ok) return;
		}

		close();
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!user || !canEditThisUser) return;

		if (roleChanged) {
			setConfirmRoleOpen(true);
			return;
		}

		void save(false);
	};

	const isSaving = updateMutation.isPending || roleMutation.isPending;

	return (
		<>
			<BaseDialog
				open={editUserOpen}
				onOpenChange={(open) => !open && close()}
				title={user ? `Edit ${user.name ?? user.email}` : "Edit User"}
				description={user ? user.email : undefined}
				maxWidth="lg"
			>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField
								label="Name"
								name="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="John Doe"
								error={updateErrors.name?.[0]}
								disabled={!canEditThisUser}
							/>
							<FormField
								label="Email"
								name="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="john@example.com"
								error={updateErrors.email?.[0]}
								disabled={!canEditThisUser}
							/>
						</div>

						<FormSelectField
							label="Role"
							value={formData.role}
							onValueChange={(role: AppRole) =>
								setFormData({ ...formData, role })
							}
							options={ROLE_OPTIONS}
							error={roleErrors.role?.[0]}
							required
							disabled={!canEditThisUser}
						/>

						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Status:</span>
							{user ? (
								<StatusBadge status={user.banned ? "banned" : "active"} />
							) : null}
							{user?.banned && user.banReason ? (
								<span className="text-muted-foreground">
									({user.banReason})
								</span>
							) : null}
						</div>
					</div>

					<Separator />

					<div className="grid gap-3">
						<div className="text-sm font-medium">Security</div>
						<div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
							<FormField
								label="New Password"
								name="newPassword"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Min 8 characters"
								minLength={8}
								error={passwordErrors.newPassword?.[0]}
								disabled={!canEditThisUser}
							/>
							<Button
								type="button"
								variant="outline"
								disabled={
									!canEditThisUser ||
									setPasswordMutation.isPending ||
									!newPassword
								}
								onClick={() => {
									setPasswordErrors({});
									setConfirmPasswordOpen(true);
								}}
							>
								<Key className="mr-2 h-4 w-4" />
								Set Password
							</Button>
						</div>
					</div>

					<Separator />

					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm font-medium">Account Actions</div>
						<div className="flex items-center gap-2">
							{canImpersonate && user && !isSuperAdmin ? (
								<Button
									type="button"
									variant="outline"
									disabled={!canEditThisUser || impersonateMutation.isPending}
									onClick={handleImpersonate}
								>
									Impersonate
								</Button>
							) : null}
							{canBan && user ? (
								user.banned ? (
									<Button
										type="button"
										variant="outline"
										disabled={!canEditThisUser || unbanMutation.isPending}
										onClick={handleUnban}
									>
										<UserCheck className="mr-2 h-4 w-4" />
										Unban
									</Button>
								) : (
									<Button
										type="button"
										variant="destructive"
										disabled={!canEditThisUser || banMutation.isPending}
										onClick={handleBan}
									>
										<UserX className="mr-2 h-4 w-4" />
										Ban
									</Button>
								)
							) : null}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => close()}
							disabled={isSaving}
						>
							Close
						</Button>
						<Button type="submit" disabled={!canEditThisUser || isSaving}>
							Save
						</Button>
					</DialogFooter>
				</form>
			</BaseDialog>

			{/* Confirmation dialogs */}
			<ConfirmRoleChangeDialog
				open={confirmRoleOpen}
				onOpenChange={setConfirmRoleOpen}
				onConfirm={() => {
					void save(true);
					setConfirmRoleOpen(false);
				}}
			/>
			<ConfirmPasswordDialog
				open={confirmPasswordOpen}
				onOpenChange={setConfirmPasswordOpen}
				onConfirm={async () => {
					if (user && newPassword) {
						const result = await setPasswordMutation.mutateAsync({
							userId: user.id,
							newPassword,
						});
						if (result.ok) {
							setConfirmPasswordOpen(false);
							setNewPassword("");
						}
					}
				}}
			/>
			<ConfirmBanDialog
				open={confirmBanOpen}
				onOpenChange={setConfirmBanOpen}
				onConfirm={handleConfirmBan}
			/>
			<ConfirmUnbanDialog
				open={confirmUnbanOpen}
				onOpenChange={setConfirmUnbanOpen}
				onConfirm={handleConfirmUnban}
			/>
			<ConfirmImpersonateDialog
				open={confirmImpersonateOpen}
				onOpenChange={setConfirmImpersonateOpen}
				onConfirm={handleConfirmImpersonate}
			/>
		</>
	);
}

// Delete User Dialog
export function UserDeleteDialog({ onSuccess }: { onSuccess?: () => void }) {
	const { isOpen, close } = useOverlay();
	const overlayData = useOverlayStore((s) => s.data as UserRowModel | null);

	const deleteMutation = useFormAction(
		async (vars: { userId: string }) => $deleteUser({ data: vars }),
		{
			invalidate: [
				QUERY_KEYS.USERS.LIST,
				QUERY_KEYS.USERS.PAGINATED_BASE,
				QUERY_KEYS.USERS.STATS,
			],
			showToast: true,
			onSuccess: () => {
				close();
				onSuccess?.();
			},
		},
	);

	const user = overlayData;

	const handleDelete = async () => {
		if (!user) return;
		const result = await deleteMutation.mutateAsync({ userId: user.id });
		if (result.ok) {
			close();
		}
	};

	return (
		<BaseDialog
			open={isOpen("confirmDelete")}
			onOpenChange={(open) => !open && close()}
			title="Delete user?"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				{user
					? `This will permanently delete ${user.name ?? user.email}.`
					: "This will permanently delete this user."}
			</p>
			<DialogFooter>
				<Button
					variant="outline"
					onClick={() => close()}
					disabled={deleteMutation.isPending}
				>
					Cancel
				</Button>
				<Button
					variant="destructive"
					onClick={handleDelete}
					disabled={!user || deleteMutation.isPending}
				>
					Delete
				</Button>
			</DialogFooter>
		</BaseDialog>
	);
}

// Helper Confirmation Dialog Components
function ConfirmRoleChangeDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Confirm role change"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				Are you sure you want to change this user's role?
			</p>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onClick={onConfirm}>Confirm</Button>
			</DialogFooter>
		</BaseDialog>
	);
}

function ConfirmPasswordDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
}) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Confirm password change"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				Are you sure you want to set a new password for this user?
			</p>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onClick={() => void onConfirm()}>Set Password</Button>
			</DialogFooter>
		</BaseDialog>
	);
}

function ConfirmBanDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Confirm ban"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				Are you sure you want to ban this user?
			</p>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onClick={onConfirm} variant="destructive">
					Ban
				</Button>
			</DialogFooter>
		</BaseDialog>
	);
}

function ConfirmUnbanDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Confirm unban"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				Are you sure you want to unban this user?
			</p>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onClick={onConfirm}>Unban</Button>
			</DialogFooter>
		</BaseDialog>
	);
}

function ConfirmImpersonateDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
}) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Confirm impersonation"
			maxWidth="sm"
		>
			<p className="text-sm text-muted-foreground">
				Are you sure you want to impersonate this user? You will be able to act
				as this user.
			</p>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onClick={() => void onConfirm()} variant="destructive">
					Impersonate
				</Button>
			</DialogFooter>
		</BaseDialog>
	);
}
