import { createFileRoute } from "@tanstack/react-router";
import { RbacView } from "@/components/admin/app-views";

export const Route = createFileRoute("/(authenticated)/admin/rbac")({
	component: RbacPage,
});

function RbacPage() {
	return <RbacView />;
}
