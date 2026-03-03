import { createFileRoute } from "@tanstack/react-router";
import { AdminCustomersView } from "@/components/admin/billing/admin-customers-view";
import { CustomerFiltersSchema } from "@/lib/filters/schemas";

export const Route = createFileRoute("/(authenticated)/admin/billing/customers")({
  validateSearch: (search) => CustomerFiltersSchema.parse(search),
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const search = Route.useSearch();
  return <AdminCustomersView search={search} />;
}
