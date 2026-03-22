import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES, ACCOUNT_VIEWS } from "@/constants";

export const Route = createFileRoute("/(authenticated)/account/")({
  beforeLoad: () => {
    throw redirect({
      to: `${ROUTES.ACCOUNT.BASE}/$accountView` as string,
      params: { accountView: `${ACCOUNT_VIEWS.SETTINGS}` } as any,
      replace: true
    });
  },
});
