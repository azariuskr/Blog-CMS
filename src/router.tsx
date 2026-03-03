import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { NotFoundError } from "@/components/errors/not-found-error";
import { DelayedPending } from "@/components/shared/DelayedPending";
import { FullScreenSpinner } from "@/components/shared/Spinner";
import * as TanstackQuery from "@/integrations/tanstack-query/root-provider";
// Import the generated route tree
import { routeTree } from "@/routeTree.gen";

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    basepath: "/template",
    context: {
      ...rqContext,
      user: null,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 60,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFoundError />,
    defaultPendingComponent: () => (
      <DelayedPending delayMs={200}>
        <FullScreenSpinner />
      </DelayedPending>
    ),
    scrollRestoration: true,
    defaultStructuralSharing: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return router;
};
