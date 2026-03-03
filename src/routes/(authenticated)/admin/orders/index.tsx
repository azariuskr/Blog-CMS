import { createFileRoute } from "@tanstack/react-router";
import { OrderFiltersSchema } from "@/lib/filters/schemas";
import { OrdersView } from "@/components/admin/ecommerce/orders/orders-view";

export const Route = createFileRoute("/(authenticated)/admin/orders/")({
  validateSearch: (search) => OrderFiltersSchema.parse(search),
  component: OrdersPage,
});

function OrdersPage() {
  const search = Route.useSearch();
  return <OrdersView search={search} />;
}
