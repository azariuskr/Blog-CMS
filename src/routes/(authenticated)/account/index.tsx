import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES, ACCOUNT_VIEWS } from "@/constants";

export const Route = createFileRoute("/(authenticated)/account/")({
  beforeLoad: () => {
    throw redirect({
      to: `${ROUTES.ACCOUNT.BASE}/$accountView`,
      params: { accountView: `${ACCOUNT_VIEWS.SETTINGS}` },
      replace: true
    });
  },
});
