import { createFileRoute } from "@tanstack/react-router";
import { CategoryFiltersSchema } from "@/lib/filters/schemas";
import { CategoriesView } from "@/components/admin/ecommerce/categories/categories-view";

export const Route = createFileRoute("/(authenticated)/admin/categories")({
  validateSearch: (search) => CategoryFiltersSchema.parse(search),
  component: CategoriesPage,
});

function CategoriesPage() {
  const search = Route.useSearch();
  return <CategoriesView search={search} />;
}
