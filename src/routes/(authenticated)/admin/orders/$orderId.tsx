import { createFileRoute } from "@tanstack/react-router";
import { OrderDetailView } from "@/components/admin/ecommerce/orders/order-detail-view";

export const Route = createFileRoute("/(authenticated)/admin/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  return <OrderDetailView orderId={orderId} />;
}
