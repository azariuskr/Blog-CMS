import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/admin/billing")({
  component: AdminBillingLayout,
});

function AdminBillingLayout() {
  return <Outlet />;
}
