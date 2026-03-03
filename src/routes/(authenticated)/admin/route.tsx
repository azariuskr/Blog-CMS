import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { type AppRole, ROUTES } from "@/constants";
import { canAccessRoute } from "@/lib/auth/permissions";

export const Route = createFileRoute("/(authenticated)/admin")({
	beforeLoad: async ({ context, location }) => {
		const auth = context.user;
		if (!auth?.user) {
			throw redirect({ to: ROUTES.LOGIN });
		}

		const path = location.pathname;
		const role = auth.user.role as AppRole;
		if (!canAccessRoute(path, role)) {
			throw redirect({ to: "/403" });
		}
	},
	component: RouteComponent,
});
function RouteComponent() {
	return <Outlet />;
}
