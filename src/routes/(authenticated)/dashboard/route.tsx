import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/dashboard")({
	beforeLoad: ({ context, location }) => {
		// Allow these routes for all roles, including admins
		const adminPassthrough = [
			"/dashboard/become-author",
			"/dashboard/comments",
			"/dashboard/calendar",
			"/dashboard/assets",
		];
		if (adminPassthrough.includes(location.pathname)) return;

		const role = context.user?.user?.role;
		if (role === "admin" || role === "superAdmin") {
			throw redirect({ to: ROUTES.ADMIN.BASE as string, replace: true });
		}
	},
	component: () => <Outlet />,
});
