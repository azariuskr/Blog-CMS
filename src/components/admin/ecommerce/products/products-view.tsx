import { useNavigate } from "@tanstack/react-router";
import { Archive, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import type { BulkOperation } from "@/components/admin/data-table/bulk-actions";
import {
	createProductColumns,
	type ProductRowModel,
} from "@/components/admin/ecommerce/products/products-columns";
import { ProductsTable } from "@/components/admin/ecommerce/products/products-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
	useDeleteProduct,
	usePublishProduct,
} from "@/hooks/ecommerce-actions";
import { useFilters } from "@/lib/filters/core";
import type { ProductFilters } from "@/lib/filters/schemas";
import { ProductFiltersSchema } from "@/lib/filters/schemas";
import { useAdminProducts, useProductFacets } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import { ConfirmDeleteProductDialog } from "@/components/admin/ecommerce/overlays";

interface ProductsViewProps {
	search?: ProductFilters;
}

export function ProductsView({ search }: ProductsViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...ProductFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: ProductFilters) => ProductFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	// Permissions
	const canWrite = useHasPermission({ products: ["write"] });
	const canDelete = useHasPermission({ products: ["delete"] });
	const canPublish = useHasPermission({ products: ["publish"] });

	const { data: productsData, isLoading } = useAdminProducts(filters);
	const { data: facetsData } = useProductFacets();
	const publishMutation = usePublishProduct();
	const deleteMutation = useDeleteProduct();

	const products: ProductRowModel[] = (productsData?.ok ? productsData.data.items : []).map((p: any) => ({
		...p,
		imageUrl: p.images?.[0]?.url ?? null,
		brandName: p.brand?.name ?? null,
		categoryName: p.category?.name ?? null,
	})) as ProductRowModel[];
	const totalPages = productsData?.ok ? productsData.data.totalPages : 1;
	const facets = facetsData?.ok ? facetsData.data : null;

	const columns = useMemo(
		() =>
			createProductColumns({
				canWrite,
				canDelete,
				canPublish,
				onEdit: (product) => {
					navigate({ to: ROUTES.ADMIN.PRODUCT_DETAIL(product.id) as string });
				},
				onDelete: (product) => {
					open("confirmDeleteProduct", product);
				},
				onPublish: (product) => {
					publishMutation.mutate({ id: product.id, publish: true });
				},
				onArchive: (product) => {
					publishMutation.mutate({ id: product.id, publish: false });
				},
				onView: (product) => {
					navigate({ to: ROUTES.ADMIN.PRODUCT_DETAIL(product.id) as string });
				},
			}),
		[canWrite, canDelete, canPublish, navigate, open, publishMutation],
	);

	const bulkOperations = useMemo<
		BulkOperation<ProductRowModel, { productId: string }>[]
	>(
		() => [
			{
				label: "Archive",
				icon: Archive,
				variant: "outline",
				getItemData: (row) => ({ productId: row.original.id }),
				execute: async (vars) => {
					await publishMutation.mutateAsync({ id: vars.productId, publish: false });
				},
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0)
						toast.success(`Archived ${successCount} products`);
					if (failureCount > 0)
						toast.error(`Failed to archive ${failureCount} products`);
				},
			},
			{
				label: "Delete",
				icon: Trash2,
				variant: "destructive",
				requireConfirmation: true,
				getItemData: (row) => ({ productId: row.original.id }),
				execute: async (vars) => {
					await deleteMutation.mutateAsync({ id: vars.productId });
				},
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0)
						toast.success(`Deleted ${successCount} products`);
					if (failureCount > 0)
						toast.error(`Failed to delete ${failureCount} products`);
				},
			},
		],
		[publishMutation, deleteMutation],
	);

	return (
	<>
		<PageContainer
			title="Products"
			description="Manage your product catalog"
			actions={
				<Button
					onClick={() => navigate({ to: ROUTES.ADMIN.PRODUCT_NEW })}
					disabled={!canWrite}
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Product
				</Button>
			}
		>
			<Card>
				<CardContent>
					<ProductsTable
						data={products}
						columns={columns}
						filters={filters}
						setFilters={setFilters}
						isLoading={isLoading}
						bulkOperations={bulkOperations}
						pageCount={totalPages}
						facets={facets}
					/>
				</CardContent>
			</Card>
		</PageContainer>

		<ConfirmDeleteProductDialog />
	</>
	);
}
