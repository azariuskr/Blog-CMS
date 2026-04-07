import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/admin/blog/media")({
	beforeLoad: () => {
		throw redirect({ to: ROUTES.DASHBOARD_ASSETS as string, replace: true });
	},
	component: () => null,
});
