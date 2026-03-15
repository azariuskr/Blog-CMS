import { OrganizationView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";
import { useActiveOrganization } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/(authenticated)/org/$organizationView")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizationView } = Route.useParams() as { organizationView: string };
  const { data: activeOrg } = useActiveOrganization();

  return (
    <main className="p-4 md:p-6">
      <OrganizationView pathname={organizationView} slug={activeOrg?.slug} />
    </main>
  );
}
