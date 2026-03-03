import { createFileRoute } from "@tanstack/react-router";
import { ProductFormView } from "@/components/admin/ecommerce/products/product-form-view";

export const Route = createFileRoute(
  "/(authenticated)/admin/products/$productId",
)({
  component: EditProductPage,
});

function EditProductPage() {
  const { productId } = Route.useParams();
  return <ProductFormView mode="edit" productId={productId} />;
}
