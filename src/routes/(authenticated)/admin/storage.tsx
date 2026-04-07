import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/admin/app-layout";
import { MediaLibraryView } from "@/components/admin/storage/media-library-view";

export const Route = createFileRoute("/(authenticated)/admin/storage")({
	component: StoragePage,
});

function StoragePage() {
	return (
		<PageContainer title="Storage" description="Manage files and assets across all categories">
			<MediaLibraryView mode="admin" />
		</PageContainer>
	);
}
