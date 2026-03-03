import { createFileRoute } from "@tanstack/react-router";
import { AdminBillingOverview } from "@/components/admin/billing/admin-billing-overview";

export const Route = createFileRoute("/(authenticated)/admin/billing/")({
  component: AdminBillingPage,
});

function AdminBillingPage() {
  return <AdminBillingOverview />;
}
