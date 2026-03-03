import { createFileRoute } from "@tanstack/react-router";
import { ProductFormView } from "@/components/admin/ecommerce/products/product-form-view";

export const Route = createFileRoute("/(authenticated)/admin/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  return <ProductFormView mode="create" />;
}
