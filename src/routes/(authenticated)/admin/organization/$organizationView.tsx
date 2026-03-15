import { OrganizationView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/(authenticated)/organization/$organizationView" as any,
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizationView } = Route.useParams() as any;
  return <OrganizationView pathname={organizationView} />;
}
