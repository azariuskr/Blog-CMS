import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "@/hooks/use-action";
import authClient from "@/lib/auth/auth-client";
import { toAction } from "@/hooks/use-action";
import { authQueryOptions } from "@/lib/auth/queries";
import { QUERY_KEYS } from "@/constants";

export function useSignOut() {
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const mutation = useAction(signOutAction, {
    showToast: false,
    invalidate: [
      QUERY_KEYS.AUTH.USER,
      QUERY_KEYS.AUTH.SESSION,
      authQueryOptions().queryKey,
    ],
    onSuccess: async () => {
      // Match your AuthUIProviderTanstack behavior
      qc.removeQueries({ queryKey: authQueryOptions().queryKey });
      await router.invalidate();
      await navigate({ to: "/login" });
    },
  });

  return { signOut: () => mutation.mutateAsync(undefined as never), mutation };
}

export async function signOutAction() {
  return toAction(async () => {
    await authClient.signOut();
    return null;
  });
}
