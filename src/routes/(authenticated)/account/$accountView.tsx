import { createFileRoute } from "@tanstack/react-router";
import { AccountView } from "@/components/admin/app-views";
import { ACCOUNT_VIEWS } from "@/constants";

const allowedViews = Object.values(ACCOUNT_VIEWS);

export const Route = createFileRoute("/(authenticated)/account/$accountView")({
  params: {
    parse: (params) => {
      const view = params.accountView;
      if (!allowedViews.includes(view as typeof allowedViews[number])) {
        return { accountView: ACCOUNT_VIEWS.SETTINGS };
      }
      return { accountView: view };
    },
    stringify: (params) => params,
  },
  ssr: false,
  component: AccountPage,
});

function AccountPage() {
  return <AccountView />;
}
