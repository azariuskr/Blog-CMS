import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/admin/app-layout";
import { AdminStorageView } from "@/components/admin/storage/admin-storage-view";

export const Route = createFileRoute("/(authenticated)/dashboard/assets")({
	component: DashboardAssetsPage,
});

function DashboardAssetsPage() {
	return (
		<PageContainer
			title="My Assets"
			description="Upload and manage your images and files."
		>
			<AdminStorageView />
		</PageContainer>
	);
}
