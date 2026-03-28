import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageContainer } from "@/components/admin/app-layout";
import { AdminStorageView } from "@/components/admin/storage/admin-storage-view";
import { UserMediaView } from "@/components/blog/UserMediaView";
import { ROLES, ROUTES } from "@/constants";
import { useRole } from "@/hooks/auth-hooks";

export const Route = createFileRoute("/(authenticated)/dashboard/assets")({
	beforeLoad: ({ context }) => {
		// Block regular users — media is for authors and above only
		const role = context.user?.user?.role;
		if (!role || role === ROLES.USER) {
			throw redirect({ to: ROUTES.DASHBOARD as string, replace: true });
		}
	},
	component: DashboardAssetsPage,
});

function DashboardAssetsPage() {
	const role = useRole();

	const isAdminLevel =
		role === ROLES.ADMIN ||
		role === ROLES.SUPER_ADMIN ||
		role === ROLES.MODERATOR;

	if (isAdminLevel) {
		return (
			<PageContainer
				title="Media & Assets"
				description="Manage all user media and storage."
			>
				<AdminStorageView />
			</PageContainer>
		);
	}

	// Authors see their personal media view with quota
	return (
		<PageContainer
			title="My Media"
			description="Upload and manage images for your posts."
		>
			<UserMediaView />
		</PageContainer>
	);
}
