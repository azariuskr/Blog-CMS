import { Archive, CheckCircle, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@/constants";

const PRODUCT_STATUS_CONFIG: Record<
	ProductStatus,
	{
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	draft: {
		label: "Draft",
		icon: FileEdit,
		variant: "secondary",
	},
	active: {
		label: "Active",
		icon: CheckCircle,
		variant: "default",
	},
	archived: {
		label: "Archived",
		icon: Archive,
		variant: "outline",
	},
};

interface ProductStatusBadgeProps {
	status: ProductStatus;
}

export function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
	const config = PRODUCT_STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<Badge variant={config.variant} className="gap-1">
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}
