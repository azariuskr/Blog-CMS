import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/admin/products")({
  component: AdminProductsLayout,
});

function AdminProductsLayout() {
  return <Outlet />;
}
