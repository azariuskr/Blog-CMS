import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/admin/orders")({
  component: AdminOrdersLayout,
});

function AdminOrdersLayout() {
  return <Outlet />;
}
