import { createFileRoute } from "@tanstack/react-router";
import { ReviewFiltersSchema } from "@/lib/filters/schemas";
import { ReviewsView } from "@/components/admin/ecommerce/reviews/reviews-view";

export const Route = createFileRoute("/(authenticated)/admin/reviews")({
  validateSearch: (search) => ReviewFiltersSchema.parse(search),
  component: ReviewsPage,
});

function ReviewsPage() {
  const search = Route.useSearch();
  return <ReviewsView search={search} />;
}
