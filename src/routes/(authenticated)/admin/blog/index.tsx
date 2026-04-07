import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/admin/blog/")(
	{
		beforeLoad: () => {
			throw redirect({ to: ROUTES.ADMIN.BASE });
		},
		component: () => null,
	},
);
