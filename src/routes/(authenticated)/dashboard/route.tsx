import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/dashboard")({
	beforeLoad: ({ context, location }) => {
		// Allow become-author for all roles — even admins may want to set up an author profile
		if (location.pathname === "/dashboard/become-author") return;

		const role = context.user?.user?.role;
		if (role === "admin" || role === "superAdmin") {
			throw redirect({ to: ROUTES.ADMIN.BASE as string, replace: true });
		}
	},
	component: () => <Outlet />,
});
