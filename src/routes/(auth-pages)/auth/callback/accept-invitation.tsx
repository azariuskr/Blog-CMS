import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { InlineSpinner } from "@/components/shared/Spinner";
import { QUERY_KEYS, ROUTES } from "@/constants";
import { authQueryOptions } from "@/lib/auth/queries";
import { organization, useSession } from "@/lib/auth/auth-client";

type RouterInstance = ReturnType<typeof useRouter>;
type NavigateArgs = Parameters<RouterInstance["navigate"]>[0];
type To = NavigateArgs["to"];

export const Route = createFileRoute("/(auth-pages)/auth/callback/accept-invitation")({
  component: AcceptInvitationCallbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    invitationId: (search.invitationId as string) || "",
    redirectTo: (search.redirectTo as string) || ROUTES.ACCOUNT.ORGANIZATIONS,
  }),
});

function AcceptInvitationCallbackPage() {
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const { invitationId, redirectTo } = Route.useSearch();
  const { data: session, isPending: sessionPending } = useSession();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Accepting invitation...");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;

    if (!invitationId) {
      setStatus("error");
      setMessage("Invitation link is missing an invitationId.");
      return;
    }

    if (sessionPending) return;

    if (!session?.user) {
      const returnTo = `${ROUTES.AUTH.CALLBACK.ACCEPT_INVITATION}?invitationId=${encodeURIComponent(invitationId)}&redirectTo=${encodeURIComponent(redirectTo)}`;
      router.navigate({
        to: ROUTES.AUTH.BASE + "/login" as To,
        search: { redirectTo: returnTo } as never,
        replace: true,
      });
      return;
    }

    ranRef.current = true;

    const run = async () => {
      try {
        const result = await organization.acceptInvitation({
          invitationId,
          fetchOptions: { throw: true },
        });

        if ((result as any)?.error) {
          throw new Error((result as any).error.message || "Failed to accept invitation.");
        }

        setStatus("success");
        setMessage("Invitation accepted. Redirecting...");

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.USER }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.SESSION }),
          queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS.LIST }),
        ]);
        await router.invalidate();

        setTimeout(() => {
          router.navigate({ to: redirectTo as To, replace: true });
        }, 500);
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        const normalized = text.toLowerCase();

        if (
          normalized.includes("already") ||
          normalized.includes("member") ||
          normalized.includes("accepted")
        ) {
          setStatus("success");
          setMessage("Invitation was already accepted. Redirecting...");
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.USER }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.SESSION }),
            queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS.LIST }),
          ]);
          await router.invalidate();
          setTimeout(() => {
            router.navigate({ to: redirectTo as To, replace: true });
          }, 500);
          return;
        }

        setStatus("error");
        setMessage(text || "Could not accept invitation.");
      }
    };

    void run();
  }, [invitationId, redirectTo, router, queryClient, session?.user, sessionPending]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-lg bg-card p-8 text-center shadow-lg">
      {status === "processing" && <InlineSpinner size="xl" className="text-primary" />}
      {status === "success" && (
        <div className="rounded-full bg-green-500/10 p-4">
          <svg className="h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {status === "error" && (
        <div className="rounded-full bg-red-500/10 p-4">
          <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}

      <h2 className="text-xl font-semibold">
        {status === "processing" ? "Processing invitation" : status === "success" ? "Done" : "Something went wrong"}
      </h2>

      <p className="text-sm text-muted-foreground">{message}</p>

      {status === "error" && (
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => router.navigate({ to: ROUTES.ACCOUNT.ORGANIZATIONS as To })}
          type="button"
        >
          Go to organizations
        </button>
      )}
    </div>
  );
}
