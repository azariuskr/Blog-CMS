import { createFileRoute } from "@tanstack/react-router";
import { ShippingView } from "@/components/admin/ecommerce/shipping/shipping-view";

export const Route = createFileRoute("/(authenticated)/admin/shipping")({
  component: ShippingPage,
});

function ShippingPage() {
  return <ShippingView />;
}
