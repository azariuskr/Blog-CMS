import { AlertTriangle, Package, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { INVENTORY_CONFIG } from "@/constants";

interface StockBadgeProps {
	stock: number;
	lowStockThreshold?: number;
}

export function StockBadge({
	stock,
	lowStockThreshold = INVENTORY_CONFIG.DEFAULT_LOW_STOCK_THRESHOLD,
}: StockBadgeProps) {
	if (stock === 0) {
		return (
			<Badge variant="destructive" className="gap-1">
				<XCircle className="h-3 w-3" />
				Out of Stock
			</Badge>
		);
	}

	if (stock <= lowStockThreshold) {
		return (
			<Badge variant="secondary" className="gap-1 text-orange-600">
				<AlertTriangle className="h-3 w-3" />
				Low Stock ({stock})
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="gap-1">
			<Package className="h-3 w-3" />
			{stock} in stock
		</Badge>
	);
}
