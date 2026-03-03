import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authQueryOptions } from "@/lib/auth/queries";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { ALLOW_WHEN_SIGNED_IN, ROUTES } from "@/constants";

export const Route = createFileRoute("/(auth-pages)")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const allowWhenSignedIn = new Set([
      `${ALLOW_WHEN_SIGNED_IN.TWO_FACTOR}`,
      `${ALLOW_WHEN_SIGNED_IN.SIGN_OUT}`,
      `${ALLOW_WHEN_SIGNED_IN.TWO_FACTOR_AUTH}`,
      `${ALLOW_WHEN_SIGNED_IN.SIGN_OUT_AUTH}`,
    ]);

    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });

    if (user && !allowWhenSignedIn.has(location.pathname)) {
      throw redirect({ to: ROUTES.DASHBOARD });
    }

    return { redirectUrl: ROUTES.DASHBOARD };
  }
});

function RouteComponent() {
  return (
    <div className="storefront relative flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10"
      style={{ background: "linear-gradient(135deg, var(--sf-bg) 0%, var(--sf-bg-warm) 50%, rgba(244,63,94,0.05) 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "var(--sf-rose-light)" }} />
      <div className="absolute bottom-10 right-10 -z-10 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: "var(--sf-orange)" }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/store"
            className="flex items-center gap-2 text-lg font-bold transition-colors hover:opacity-80"
            style={{ color: "var(--sf-rose)", fontFamily: "'Varela Round', sans-serif" }}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>PartyPop</span>
          </Link>
          <Link
            to="/store"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--sf-text-muted)" }}
          >
            ← Back to Store
          </Link>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{ borderColor: "var(--sf-border-light)" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
