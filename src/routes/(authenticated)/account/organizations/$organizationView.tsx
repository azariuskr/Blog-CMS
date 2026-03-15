import { OrganizationView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/(authenticated)/account/organizations/$organizationView",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizationView } = Route.useParams() as { organizationView: string };
  return <OrganizationView pathname={organizationView} />;
}
