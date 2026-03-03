import { useNavigate } from "@tanstack/react-router";
import { Truck, XCircle } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import type { BulkOperation } from "@/components/admin/data-table/bulk-actions";
import {
	createOrderColumns,
	type OrderRowModel,
} from "@/components/admin/ecommerce/orders/orders-columns";
import { OrdersTable } from "@/components/admin/ecommerce/orders/orders-table";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
	useAddShipment,
	useCancelOrder,
	useUpdateOrderStatus,
} from "@/hooks/ecommerce-actions";
import { useFilters } from "@/lib/filters/core";
import type { OrderFilters } from "@/lib/filters/schemas";
import { OrderFiltersSchema } from "@/lib/filters/schemas";
import { useAdminOrders, useOrderFacets } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";
import {
	ShipOrderDialog,
	CancelOrderDialog,
} from "@/components/admin/ecommerce/overlays";

interface OrdersViewProps {
	search?: OrderFilters;
}

export function OrdersView({ search }: OrdersViewProps) {
	const navigate = useNavigate();
	const { open } = useOverlay();

	const defaultSearch = useMemo(
		() => ({ ...OrderFiltersSchema.parse({}), page: 1, limit: 10 }),
		[],
	);
	const currentSearch = { ...defaultSearch, ...(search ?? {}) };

	const { filters, setFilters } = useFilters(
		currentSearch,
		navigate as unknown as (opts: {
			search: (prev: OrderFilters) => OrderFilters;
		}) => void,
		{ defaults: defaultSearch },
	);

	// Permissions
	const canWrite = useHasPermission({ orders: ["write"] });
	const canFulfill = useHasPermission({ orders: ["fulfill"] });
	const canCancel = useHasPermission({ orders: ["cancel"] });

	const { data: ordersData, isLoading } = useAdminOrders(filters);
	const { data: facetsData } = useOrderFacets();
	const shipMutation = useAddShipment();
	const cancelMutation = useCancelOrder();
	const updateStatusMutation = useUpdateOrderStatus();

	const orders: OrderRowModel[] = (ordersData?.ok
		? ordersData.data.items.map((o: any) => ({
				id: o.id,
				orderNumber: o.orderNumber,
				status: o.status,
				total: o.total,
				itemCount: o.itemCount,
				customerName: o.customer?.name ?? null,
				customerEmail: o.customer?.email ?? "",
				shippingCity: null,
				trackingNumber: null,
				createdAt: new Date(o.createdAt),
				updatedAt: new Date(o.createdAt),
			}))
		: []) as OrderRowModel[];
	const totalPages = ordersData?.ok ? ordersData.data.totalPages : 1;
	const facets = facetsData?.ok ? facetsData.data : null;

	const columns = useMemo(
		() =>
			createOrderColumns({
				canWrite,
				canFulfill,
				canCancel,
				onView: (order) => {
					navigate({ to: ROUTES.ADMIN.ORDER_DETAIL(order.id) as string });
				},
				onShip: (order) => {
					open("shipOrder", order);
				},
				onCancel: (order) => {
					open("cancelOrder", order);
				},
				onMarkDelivered: (order) => {
					updateStatusMutation.mutate({ orderId: order.id, status: "delivered" });
				},
			}),
		[canWrite, canFulfill, canCancel, navigate, open, updateStatusMutation],
	);

	const bulkOperations = useMemo<
		BulkOperation<OrderRowModel, { orderId: string }>[]
	>(
		() => [
			{
				label: "Mark Shipped",
				icon: Truck,
				variant: "outline",
				getItemData: (row) => ({ orderId: row.original.id }),
				execute: async (vars) => {
					await shipMutation.mutateAsync({ orderId: vars.orderId, trackingNumber: "", carrier: "Other" });
				},
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0)
						toast.success(`Shipped ${successCount} orders`);
					if (failureCount > 0)
						toast.error(`Failed to ship ${failureCount} orders`);
				},
			},
			{
				label: "Cancel",
				icon: XCircle,
				variant: "destructive",
				requireConfirmation: true,
				getItemData: (row) => ({ orderId: row.original.id }),
				execute: async (vars) => {
					await cancelMutation.mutateAsync({ orderId: vars.orderId });
				},
				onComplete: ({ successCount, failureCount }) => {
					if (successCount > 0)
						toast.success(`Cancelled ${successCount} orders`);
					if (failureCount > 0)
						toast.error(`Failed to cancel ${failureCount} orders`);
				},
			},
		],
		[shipMutation, cancelMutation],
	);

	return (
	<>
		<PageContainer
			title="Orders"
			description="Manage customer orders and fulfillment"
		>
			<Card>
				<CardContent>
					<OrdersTable
						data={orders}
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

		<ShipOrderDialog />
		<CancelOrderDialog />
	</>
	);
}
