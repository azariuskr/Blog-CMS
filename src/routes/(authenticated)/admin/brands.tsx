import { createFileRoute } from "@tanstack/react-router";
import { BrandFiltersSchema } from "@/lib/filters/schemas";
import { BrandsView } from "@/components/admin/ecommerce/brands/brands-view";

export const Route = createFileRoute("/(authenticated)/admin/brands")({
  validateSearch: (search) => BrandFiltersSchema.parse(search),
  component: BrandsPage,
});

function BrandsPage() {
  const search = Route.useSearch();
  return <BrandsView search={search} />;
}
