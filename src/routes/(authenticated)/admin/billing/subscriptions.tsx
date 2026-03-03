import { createFileRoute } from "@tanstack/react-router";
import { AdminSubscriptionsView } from "@/components/admin/billing/admin-subscriptions-view";
import { SubscriptionFiltersSchema } from "@/lib/filters/schemas";

export const Route = createFileRoute("/(authenticated)/admin/billing/subscriptions")({
  validateSearch: (search) => SubscriptionFiltersSchema.parse(search),
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const search = Route.useSearch();
  return <AdminSubscriptionsView search={search} />;
}
