import { createFileRoute } from "@tanstack/react-router";
import { ProductFiltersSchema } from "@/lib/filters/schemas";
import { ProductsView } from "@/components/admin/ecommerce/products/products-view";

export const Route = createFileRoute("/(authenticated)/admin/products/")({
  validateSearch: (search) => ProductFiltersSchema.parse(search),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  return <ProductsView search={search} />;
}
