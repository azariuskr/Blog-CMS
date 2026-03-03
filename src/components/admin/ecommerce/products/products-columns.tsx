import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Eye, Globe, Pencil, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/admin/data-table";
import {
	PriceDisplay,
	ProductStatusBadge,
	StockBadge,
} from "@/components/admin/ecommerce/shared";
import {
	type ActionMenuGroup,
	BaseActionMenu,
} from "@/components/shared/base/base-action-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProductStatus } from "@/constants";
import { formatDate } from "@/lib/utils";

export interface ProductRowModel {
	id: string;
	name: string;
	slug: string;
	basePrice: number;
	salePrice: number | null;
	status: ProductStatus;
	totalStock: number;
	categoryName: string | null;
	brandName: string | null;
	imageUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface ColumnContext {
	canWrite: boolean;
	canDelete: boolean;
	canPublish: boolean;
	onEdit: (product: ProductRowModel) => void;
	onDelete: (product: ProductRowModel) => void;
	onPublish: (product: ProductRowModel) => void;
	onArchive: (product: ProductRowModel) => void;
	onView: (product: ProductRowModel) => void;
}

export function createProductColumns(
	context: ColumnContext,
): ColumnDef<ProductRowModel>[] {
	const { canWrite, canDelete, canPublish, onEdit, onDelete, onPublish, onArchive, onView } =
		context;

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
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Product" />
			),
			cell: ({ row }) => {
				const product = row.original;
				return (
					<div className="flex items-center gap-3">
						{product.imageUrl ? (
							<img
								src={product.imageUrl}
								alt={product.name}
								className="h-10 w-10 rounded-md object-cover"
							/>
						) : (
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
								<span className="text-xs text-muted-foreground">
									{product.name.charAt(0).toUpperCase()}
								</span>
							</div>
						)}
						<div className="min-w-0">
							<div className="truncate font-medium">{product.name}</div>
							<div className="truncate text-sm text-muted-foreground">
								{product.categoryName ?? "Uncategorized"}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => <ProductStatusBadge status={row.original.status} />,
			filterFn: (row, id, value) => {
				const selected = Array.isArray(value) ? value : [];
				if (selected.length === 0) return true;
				return selected.includes(row.getValue(id) as string);
			},
		},
		{
			accessorKey: "basePrice",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Price" />
			),
			cell: ({ row }) => {
				const product = row.original;
				return (
					<div className="flex flex-col">
						<PriceDisplay cents={product.basePrice} className="font-medium" />
						{product.salePrice && (
							<PriceDisplay
								cents={product.salePrice}
								className="text-sm text-green-600"
							/>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "totalStock",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Stock" />
			),
			cell: ({ row }) => <StockBadge stock={row.original.totalStock} />,
		},
		{
			accessorKey: "brandName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Brand" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.brandName ?? "-"}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
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
				const product = row.original;
				const isDraft = product.status === "draft";
				const isArchived = product.status === "archived";

				const actionGroups: ActionMenuGroup[] = [
					{
						label: "Actions",
						items: [
							{
								label: "View",
								icon: Eye,
								onClick: () => onView(product),
							},
							...(canWrite
								? [
										{
											label: "Edit",
											icon: Pencil,
											onClick: () => onEdit(product),
										},
									]
								: []),
							...(canPublish && isDraft
								? [
										{
											label: "Publish",
											icon: Globe,
											onClick: () => onPublish(product),
										},
									]
								: []),
							...(canWrite && !isArchived
								? [
										{
											label: "Archive",
											icon: Archive,
											onClick: () => onArchive(product),
										},
									]
								: []),
							...(canDelete
								? [
										{
											label: "Delete",
											icon: Trash2,
											onClick: () => onDelete(product),
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
