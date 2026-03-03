import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/admin/app-layout";
import { type AppRole, ROUTES } from "@/constants";
import { canAccessRoute, getRouteConfig } from "@/lib/auth/permissions";
import { authQueryOptions } from "@/lib/auth/queries";

export const Route = createFileRoute("/(authenticated)")({
  beforeLoad: async ({ context, location }) => {
    // Auth is already prefetched in `src/routes/__root.tsx` into `context.user`
    const auth =
      context.user ??
      (await context.queryClient.ensureQueryData(authQueryOptions()));
    if (!auth?.user) {
      throw redirect({ to: ROUTES.LOGIN });
    }

    const path = location.pathname;
    const role = auth.user.role as AppRole;

    // Admin routes are guarded at `/(authenticated)/admin/route.tsx`.
    if (path.startsWith(ROUTES.ADMIN.BASE)) return;

    // Only enforce routeConfig-based access for routes that declare protection.
    const cfg = getRouteConfig(path);
    if ((cfg?.minRole || cfg?.permissions) && !canAccessRoute(path, role)) {
      throw redirect({ to: "/403" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
