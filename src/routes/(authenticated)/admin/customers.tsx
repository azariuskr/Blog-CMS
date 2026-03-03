import { createFileRoute } from "@tanstack/react-router";
import { EcommerceCustomerFiltersSchema } from "@/lib/filters/schemas";
import { CustomersView } from "@/components/admin/ecommerce/customers/customers-view";

export const Route = createFileRoute("/(authenticated)/admin/customers")({
  validateSearch: (search) => EcommerceCustomerFiltersSchema.parse(search),
  component: CustomersPage,
});

function CustomersPage() {
  const search = Route.useSearch();
  return <CustomersView search={search} />;
}
