import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/billing")({
  component: BillingLayout,
});

function BillingLayout() {
  return <Outlet />;
}
