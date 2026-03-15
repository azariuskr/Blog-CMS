import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/admin/app-layout";
import { AdminStorageView } from "@/components/admin/storage/admin-storage-view";

export const Route = createFileRoute("/(authenticated)/admin/blog/media")({
	component: BlogMediaPage,
});

function BlogMediaPage() {
	return (
		<PageContainer
			title="Media Library"
			description="Upload and manage images and files for your blog posts."
		>
			<AdminStorageView />
		</PageContainer>
	);
}
