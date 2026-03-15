import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authQueryOptions } from "@/lib/auth/queries";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ALLOW_WHEN_SIGNED_IN, ROUTES } from "@/constants";

export const Route = createFileRoute("/(auth-pages)")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const allowWhenSignedIn = new Set([
      `${ALLOW_WHEN_SIGNED_IN.TWO_FACTOR}`,
      `${ALLOW_WHEN_SIGNED_IN.SIGN_OUT}`,
      `${ALLOW_WHEN_SIGNED_IN.TWO_FACTOR_AUTH}`,
      `${ALLOW_WHEN_SIGNED_IN.SIGN_OUT_AUTH}`,
      `${ROUTES.AUTH.CALLBACK.VERIFY_EMAIL}`,
      `${ROUTES.AUTH.CALLBACK.ACCEPT_INVITATION}`,
      `${ROUTES.AUTH.ACCEPT_INVITATION}`,
    ]);

    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });

    const rawPath = location.pathname;
    if (
      rawPath.includes("/auth/callback/accept-invitation") ||
      rawPath.includes("/auth/callback/verify-email") ||
      rawPath.includes("/auth/accept-invitation")
    ) {
      return { redirectUrl: ROUTES.DASHBOARD };
    }

    const normalizedPath = rawPath.replace(/\/$/, "");
    const isAllowedWhenSignedIn = Array.from(allowWhenSignedIn).some((p) => {
      const normalizedAllowed = p.replace(/\/$/, "");
      return (
        normalizedPath === normalizedAllowed ||
        normalizedPath.endsWith(normalizedAllowed)
      );
    });

    const isInvitationOrVerifyCallback =
      /\/auth\/callback\/(verify-email|accept-invitation)$/.test(normalizedPath) ||
      /\/auth\/accept-invitation$/.test(normalizedPath);

    if (user && !isAllowedWhenSignedIn && !isInvitationOrVerifyCallback) {
      throw redirect({ to: ROUTES.HOME });
    }

    return { redirectUrl: ROUTES.DASHBOARD };
  }
});

function RouteComponent() {
  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
      {/* Decorative blobs */}
      <div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-10 right-10 -z-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 text-lg font-bold text-foreground transition-colors hover:opacity-80"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span>BlogCMS</span>
          </Link>
          <Link
            to={ROUTES.HOME}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Home
          </Link>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
