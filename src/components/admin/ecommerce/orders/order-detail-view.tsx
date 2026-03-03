import { useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Mail,
	MapPin,
	Package,
	RefreshCw,
	Truck,
	XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import {
	OrderStatusBadge,
	PriceDisplay,
} from "@/components/admin/ecommerce/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROUTES, type OrderStatus } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";
import { useAdminOrder } from "@/lib/ecommerce/queries";
import { formatDate } from "@/lib/utils";
import { useOverlay } from "@/lib/store/overlay";
import {
	ShipOrderDialog,
	CancelOrderDialog,
} from "@/components/admin/ecommerce/overlays";

interface OrderDetailViewProps {
	orderId: string;
}

interface OrderItem {
	id: string;
	productName: string;
	variantName: string | null;
	sku: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	imageUrl: string | null;
}

interface Order {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	subtotal: number;
	tax: number;
	shippingCost: number;
	discount: number;
	total: number;
	customerName: string | null;
	customerEmail: string;
	customerPhone: string | null;
	shippingAddress: {
		street1: string;
		street2?: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	trackingNumber: string | null;
	trackingCarrier: string | null;
	notes: string | null;
	items: OrderItem[];
	createdAt: Date;
	updatedAt: Date;
}

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
	const navigate = useNavigate();

	const { open } = useOverlay();
	const canFulfill = useHasPermission({ orders: ["fulfill"] });
	const canCancel = useHasPermission({ orders: ["cancel"] });
	const canRefund = useHasPermission({ orders: ["refund"] });

	const { data: orderData, isLoading, error: queryError, status: queryStatus, fetchStatus } = useAdminOrder(orderId);
	console.log("[ORDER-DETAIL] orderId:", orderId, "queryStatus:", queryStatus, "fetchStatus:", fetchStatus, "isLoading:", isLoading, "data:", JSON.stringify(orderData)?.substring(0, 200), "error:", queryError);
	const rawOrder = orderData?.ok ? orderData.data : null;

	const order: Order | null = rawOrder
		? {
				id: rawOrder.id,
				orderNumber: rawOrder.orderNumber,
				status: rawOrder.status as OrderStatus,
				subtotal: rawOrder.subtotal,
				tax: rawOrder.tax,
				shippingCost: rawOrder.shippingCost,
				discount: rawOrder.discount,
				total: rawOrder.total,
				customerName: rawOrder.user?.name ?? null,
				customerEmail: rawOrder.user?.email ?? rawOrder.guestEmail ?? "",
				customerPhone: (rawOrder.shippingAddress as any)?.phone ?? null,
				shippingAddress: rawOrder.shippingAddress as Order["shippingAddress"],
				trackingNumber: rawOrder.trackingNumber,
				trackingCarrier: rawOrder.carrier,
				notes: rawOrder.internalNotes,
				items: rawOrder.items.map((item: any) => ({
					id: item.id,
					productName: item.productName,
					variantName: item.variantOptions,
					sku: item.variantSku,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					totalPrice: item.totalPrice,
					imageUrl: null,
				})),
				createdAt: new Date(rawOrder.createdAt),
				updatedAt: new Date(rawOrder.updatedAt),
			}
		: null;

	if (isLoading) {
		return (
			<PageContainer title="Loading..." description="Fetching order details">
				<div className="flex h-64 items-center justify-center">
					<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</PageContainer>
		);
	}

	if (!order) {
		return (
			<PageContainer title="Order Not Found" description="">
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Package className="h-12 w-12 text-muted-foreground" />
						<p className="mt-4 text-lg font-medium">Order not found</p>
						<p className="text-muted-foreground">
							The order you're looking for doesn't exist.
						</p>
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => navigate({ to: ROUTES.ADMIN.ORDERS })}
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Orders
						</Button>
					</CardContent>
				</Card>
			</PageContainer>
		);
	}

	const canBeShipped =
		order.status === "confirmed" || order.status === "processing";
	const canBeCancelled =
		order.status !== "cancelled" &&
		order.status !== "refunded" &&
		order.status !== "delivered";
	const canBeRefunded =
		order.status === "delivered" || order.status === "shipped";

	return (
	<>
		<PageContainer
			title={`Order ${order.orderNumber}`}
			description={`Created ${formatDate(order.createdAt)}`}
			actions={
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => navigate({ to: ROUTES.ADMIN.ORDERS })}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
					{canFulfill && canBeShipped && (
						<Button variant="default" onClick={() => open("shipOrder", order)}>
							<Truck className="mr-2 h-4 w-4" />
							Ship Order
						</Button>
					)}
					{canCancel && canBeCancelled && (
						<Button variant="outline" onClick={() => open("cancelOrder", order)}>
							<XCircle className="mr-2 h-4 w-4" />
							Cancel
						</Button>
					)}
					{canRefund && canBeRefunded && (
						<Button variant="outline">
							<RefreshCw className="mr-2 h-4 w-4" />
							Refund
						</Button>
					)}
				</div>
			}
		>
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Order Status */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Order Status</CardTitle>
							<OrderStatusBadge status={order.status} />
						</CardHeader>
						{order.trackingNumber && (
							<CardContent>
								<div className="flex items-center gap-2 text-sm">
									<Truck className="h-4 w-4 text-muted-foreground" />
									<span className="text-muted-foreground">Tracking:</span>
									<span className="font-mono">{order.trackingNumber}</span>
									{order.trackingCarrier && (
										<span className="text-muted-foreground">
											({order.trackingCarrier})
										</span>
									)}
								</div>
							</CardContent>
						)}
					</Card>

					{/* Order Items */}
					<Card>
						<CardHeader>
							<CardTitle>Items ({order.items.length})</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{order.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center gap-4 rounded-lg border p-4"
									>
										{item.imageUrl ? (
											<img
												src={item.imageUrl}
												alt={item.productName}
												className="h-16 w-16 rounded-md object-cover"
											/>
										) : (
											<div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
												<Package className="h-6 w-6 text-muted-foreground" />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="font-medium">{item.productName}</div>
											{item.variantName && (
												<div className="text-sm text-muted-foreground">
													{item.variantName}
												</div>
											)}
											<div className="text-sm text-muted-foreground">
												SKU: {item.sku}
											</div>
										</div>
										<div className="text-right">
											<div className="font-medium">
												<PriceDisplay cents={item.totalPrice} />
											</div>
											<div className="text-sm text-muted-foreground">
												<PriceDisplay cents={item.unitPrice} /> × {item.quantity}
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Order Summary */}
					<Card>
						<CardHeader>
							<CardTitle>Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Subtotal</span>
								<PriceDisplay cents={order.subtotal} />
							</div>
							{order.discount > 0 && (
								<div className="flex justify-between text-sm text-green-600">
									<span>Discount</span>
									<span>
										-<PriceDisplay cents={order.discount} />
									</span>
								</div>
							)}
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Shipping</span>
								<PriceDisplay cents={order.shippingCost} />
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Tax</span>
								<PriceDisplay cents={order.tax} />
							</div>
							<Separator />
							<div className="flex justify-between font-medium">
								<span>Total</span>
								<PriceDisplay cents={order.total} />
							</div>
						</CardContent>
					</Card>

					{/* Customer */}
					<Card>
						<CardHeader>
							<CardTitle>Customer</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="text-sm">
								<div className="font-medium">
									{order.customerName ?? "Guest"}
								</div>
								<div className="flex items-center gap-2 text-muted-foreground">
									<Mail className="h-3 w-3" />
									{order.customerEmail}
								</div>
								{order.customerPhone && (
									<div className="text-muted-foreground">
										{order.customerPhone}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Shipping Address */}
					<Card>
						<CardHeader>
							<CardTitle>Shipping Address</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-start gap-2 text-sm">
								<MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
								<div>
									<div>{order.shippingAddress.street1}</div>
									{order.shippingAddress.street2 && (
										<div>{order.shippingAddress.street2}</div>
									)}
									<div>
										{order.shippingAddress.city}, {order.shippingAddress.state}{" "}
										{order.shippingAddress.postalCode}
									</div>
									<div>{order.shippingAddress.country}</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Notes */}
					{order.notes && (
						<Card>
							<CardHeader>
								<CardTitle>Notes</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">{order.notes}</p>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</PageContainer>

		<ShipOrderDialog />
		<CancelOrderDialog />
	</>
	);
}
