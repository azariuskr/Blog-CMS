import { createFileRoute } from "@tanstack/react-router";
import { CouponFiltersSchema } from "@/lib/filters/schemas";
import { CouponsView } from "@/components/admin/ecommerce/coupons/coupons-view";

export const Route = createFileRoute("/(authenticated)/admin/coupons")({
  validateSearch: (search) => CouponFiltersSchema.parse(search),
  component: CouponsPage,
});

function CouponsPage() {
  const search = Route.useSearch();
  return <CouponsView search={search} />;
}
