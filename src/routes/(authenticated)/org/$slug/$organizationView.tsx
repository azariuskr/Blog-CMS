import { OrganizationView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/org/$slug/$organizationView")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug, organizationView } = Route.useParams() as {
    slug: string;
    organizationView: string;
  };

  return (
    <main className="p-4 md:p-6">
      <OrganizationView pathname={organizationView} slug={slug} />
    </main>
  );
}
