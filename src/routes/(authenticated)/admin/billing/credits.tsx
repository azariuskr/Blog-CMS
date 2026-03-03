import { createFileRoute } from "@tanstack/react-router";
import { AdminCreditsView } from "@/components/admin/billing/admin-credits-view";
import { CreditTransactionFiltersSchema } from "@/lib/filters/schemas";

export const Route = createFileRoute("/(authenticated)/admin/billing/credits")({
  validateSearch: (search) => CreditTransactionFiltersSchema.parse(search),
  component: AdminCreditsPage,
});

function AdminCreditsPage() {
  const search = Route.useSearch();
  return <AdminCreditsView search={search} />;
}
