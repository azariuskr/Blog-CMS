import { createFileRoute } from "@tanstack/react-router";
import { InventoryFiltersSchema } from "@/lib/filters/schemas";
import { InventoryView } from "@/components/admin/ecommerce/inventory/inventory-view";

export const Route = createFileRoute("/(authenticated)/admin/inventory")({
  validateSearch: (search) => InventoryFiltersSchema.parse(search),
  component: InventoryPage,
});

function InventoryPage() {
  const search = Route.useSearch();
  return <InventoryView search={search} />;
}
