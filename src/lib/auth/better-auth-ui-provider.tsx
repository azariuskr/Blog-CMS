import * as React from "react";
import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { Link as RouterLink, useRouter } from "@tanstack/react-router";

import { ROUTES, QUERY_KEYS, AUTH_ROUTE_VIEWS } from "@/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import authClient from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";
import { $mergeGuestCart } from "@/lib/ecommerce/functions";
import { uploadAvatar, deleteAvatar } from "@/lib/storage/avatar";
import { env } from "@/env/client";
import { stripBasePath } from "@/lib/url/with-base-path";

type RouterInstance = ReturnType<typeof useRouter>;
type NavigateArgs = Parameters<RouterInstance["navigate"]>[0];
type To = NavigateArgs["to"];

type BetterAuthUiLinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  ref?: React.Ref<HTMLAnchorElement>;
};

function getBasePath(): string {
  try {
    const u = new URL(env.VITE_BASE_URL);
    return u.pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function toRouterPath(path: string): string {
  // Router already has basepath="/template" configured.
  // If we pass /template/... into router.navigate/link it becomes /template/template/...
  return stripBasePath(env.VITE_BASE_URL, path);
}

export function BetterAuthUiLink({ href, ref, ...props }: BetterAuthUiLinkProps) {
  const fixedHref = toRouterPath(href);

  // Cast to `To` to allow Better Auth UI to pass API paths and external URLs
  // that aren't in the typed FileRoutesByPath (e.g., /api/auth/passkey/*)
  // biome-ignore lint/suspicious/noExplicitAny: Better Auth UI passes arbitrary paths
  return <RouterLink ref={ref} to={fixedHref as To} {...props} />;
}

export function BetterAuthUiProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const isMobile = useIsMobile();

  return (
    <AuthQueryProvider sessionQueryOptions={authQueryOptions()}>
      <AuthUIProviderTanstack
        authClient={authClient}
        navigate={(href: string) => {
          router.navigate({ to: toRouterPath(href) as To });
        }}
        replace={(href: string) => {
          router.navigate({ to: toRouterPath(href) as To, replace: true });
        }}
        Link={BetterAuthUiLink}
        redirectTo={toRouterPath(ROUTES.DASHBOARD)}
        onSessionChange={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.USER }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.SESSION }),
            queryClient.removeQueries({ queryKey: authQueryOptions().queryKey }),
            queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey }),
          ]);
          // Merge guest cart on login (best-effort, non-blocking)
          $mergeGuestCart()
            .then((result) => {
              if (result.ok && result.data.merged) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART.CURRENT });
              }
            })
            .catch(() => {});
          await router.invalidate();
        }}
        avatar={{
          upload: async (file) => {
            const result = await uploadAvatar(file);
            return result.imageUrl;
          },
          delete: async () => {
            await deleteAvatar();
          },
        }}
        viewPaths={{
          SIGN_IN: AUTH_ROUTE_VIEWS.LOGIN,
          SIGN_UP: AUTH_ROUTE_VIEWS.SIGNUP,
          SIGN_OUT: AUTH_ROUTE_VIEWS.LOGOUT,
          FORGOT_PASSWORD: AUTH_ROUTE_VIEWS.FORGOT_PASSWORD,
          RESET_PASSWORD: AUTH_ROUTE_VIEWS.RESET_PASSWORD,
          MAGIC_LINK: AUTH_ROUTE_VIEWS.MAGIC_LINK,
          EMAIL_VERIFICATION: AUTH_ROUTE_VIEWS.VERIFY_EMAIL,
          TWO_FACTOR: AUTH_ROUTE_VIEWS.TWO_FACTOR,
          CALLBACK: AUTH_ROUTE_VIEWS.CALLBACK,
        }}
        deleteUser
        magicLink
        // passkey
        {...(env.VITE_ENABLE_PASSKEYS === "true" ? { passkey: true } : {})}
        {...(env.VITE_ENABLE_2FA === "true" ? { twoFactor: ["otp", "totp"] } : {})}
        // twoFactor={["otp", "totp"]}
        account={{
          basePath: "/account",
          viewPaths: {
            SETTINGS: "settings",
            SECURITY: "security",
          },
        }}
        social={{ providers: ["google"] }}
        // freshAge: seconds since last auth action for session to be "fresh"
        // 0 = always require re-auth, 300 = 5 minutes, undefined = no fresh check
        // Set to 5 minutes for passkey/2FA setup operations
        freshAge={60 * 5}
        optimistic={!isMobile}
      >
        {children}
      </AuthUIProviderTanstack>
    </AuthQueryProvider>
  );
}
