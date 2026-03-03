import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Package, Truck, XCircle } from "lucide-react";
import { DataTableColumnHeader } from "@/components/admin/data-table";
import {
	OrderStatusBadge,
	PriceDisplay,
} from "@/components/admin/ecommerce/shared";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { OrderStatus } from "@/constants";
import { formatDate } from "@/lib/utils";

export interface OrderRowModel {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	total: number;
	itemCount: number;
	customerName: string | null;
	customerEmail: string;
	shippingCity: string | null;
	trackingNumber: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface ColumnContext {
	canWrite: boolean;
	canFulfill: boolean;
	canCancel: boolean;
	onView: (order: OrderRowModel) => void;
	onShip: (order: OrderRowModel) => void;
	onCancel: (order: OrderRowModel) => void;
	onMarkDelivered?: (order: OrderRowModel) => void;
}

export function createOrderColumns(
	context: ColumnContext,
): ColumnDef<OrderRowModel>[] {
	const { canFulfill, canCancel, onView, onShip, onCancel, onMarkDelivered } = context;

	return [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					aria-label="Select all"
					checked={table.getIsAllPageRowsSelected()}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(Boolean(value))
					}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					aria-label="Select row"
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 32,
		},
		{
			accessorKey: "orderNumber",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Order" />
			),
			cell: ({ row }) => (
				<div className="font-mono font-medium">{row.original.orderNumber}</div>
			),
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
			filterFn: (row, id, value) => {
				const selected = Array.isArray(value) ? value : [];
				if (selected.length === 0) return true;
				return selected.includes(row.getValue(id) as string);
			},
		},
		{
			id: "customer",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Customer" />
			),
			cell: ({ row }) => {
				const order = row.original;
				return (
					<div className="min-w-0">
						<div className="truncate font-medium">
							{order.customerName ?? "Guest"}
						</div>
						<div className="truncate text-sm text-muted-foreground">
							{order.customerEmail}
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "total",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Total" />
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<PriceDisplay cents={row.original.total} className="font-medium" />
					<span className="text-sm text-muted-foreground">
						{row.original.itemCount} items
					</span>
				</div>
			),
		},
		{
			accessorKey: "shippingCity",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Location" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.shippingCity ?? "-"}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Date" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{formatDate(row.original.createdAt)}
				</span>
			),
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const order = row.original;
				const canBeShipped =
					order.status === "confirmed" || order.status === "processing";
				const canBeCancelled =
					order.status !== "cancelled" &&
					order.status !== "refunded" &&
					order.status !== "delivered";

				const actionGroups: ActionMenuGroup[] = [
					{
						label: "Actions",
						items: [
							{
								label: "View Details",
								icon: Eye,
								onClick: () => onView(order),
							},
							...(canFulfill && canBeShipped
								? [
										{
											label: "Mark Shipped",
											icon: Truck,
											onClick: () => onShip(order),
										},
									]
								: []),
							...(canFulfill && order.status === "shipped"
								? [
										{
											label: "Mark Delivered",
											icon: Package,
											onClick: () => {
												onMarkDelivered?.(order);
											},
										},
									]
								: []),
							...(canCancel && canBeCancelled
								? [
										{
											label: "Cancel Order",
											icon: XCircle,
											onClick: () => onCancel(order),
											variant: "destructive" as const,
										},
									]
								: []),
						],
					},
				];

				return <BaseActionMenu groups={actionGroups} />;
			},
		},
	];
}
