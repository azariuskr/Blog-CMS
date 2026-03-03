import {
	CheckCircle,
	Clock,
	Package,
	RefreshCw,
	Truck,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/constants";

const ORDER_STATUS_CONFIG: Record<
	OrderStatus,
	{
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	pending: {
		label: "Pending",
		icon: Clock,
		variant: "secondary",
	},
	confirmed: {
		label: "Confirmed",
		icon: CheckCircle,
		variant: "default",
	},
	processing: {
		label: "Processing",
		icon: RefreshCw,
		variant: "default",
	},
	shipped: {
		label: "Shipped",
		icon: Truck,
		variant: "default",
	},
	delivered: {
		label: "Delivered",
		icon: Package,
		variant: "outline",
	},
	cancelled: {
		label: "Cancelled",
		icon: XCircle,
		variant: "destructive",
	},
	refunded: {
		label: "Refunded",
		icon: RefreshCw,
		variant: "secondary",
	},
};

interface OrderStatusBadgeProps {
	status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
	const config = ORDER_STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<Badge variant={config.variant} className="gap-1">
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}
