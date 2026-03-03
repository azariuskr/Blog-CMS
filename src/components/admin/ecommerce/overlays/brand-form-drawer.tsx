import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBrand, useUpdateBrand } from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";

interface BrandData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	logoUrl: string | null;
	websiteUrl: string | null;
	isActive: boolean;
	sortOrder: number;
}

export function BrandFormDrawer() {
	const { id, data, close } = useOverlay();
	const isCreate = id === "createBrand";
	const isEdit = id === "editBrand";
	const isOpen = isCreate || isEdit;
	const brand = isEdit ? (data as BrandData | null) : null;

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [logoUrl, setLogoUrl] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [sortOrder, setSortOrder] = useState("0");

	const createMutation = useCreateBrand();
	const updateMutation = useUpdateBrand();
	const isPending = createMutation.isPending || updateMutation.isPending;

	useEffect(() => {
		if (isEdit && brand) {
			setName(brand.name);
			setSlug(brand.slug);
			setDescription(brand.description ?? "");
			setLogoUrl(brand.logoUrl ?? "");
			setWebsiteUrl(brand.websiteUrl ?? "");
			setIsActive(brand.isActive);
			setSortOrder(String(brand.sortOrder));
		}
	}, [isEdit, brand]);

	const resetForm = () => {
		setName("");
		setSlug("");
		setDescription("");
		setLogoUrl("");
		setWebsiteUrl("");
		setIsActive(true);
		setSortOrder("0");
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isCreate) {
			createMutation.mutate(
				{
					name,
					slug: slug || undefined,
					description: description || undefined,
					logoUrl: logoUrl || undefined,
					websiteUrl: websiteUrl || undefined,
					isActive,
					sortOrder: parseInt(sortOrder, 10) || 0,
				},
				{ onSuccess: () => handleClose() },
			);
		} else if (isEdit && brand) {
			updateMutation.mutate(
				{
					brandId: brand.id,
					name,
					slug: slug || undefined,
					description: description || undefined,
					logoUrl: logoUrl || undefined,
					websiteUrl: websiteUrl || undefined,
					isActive,
					sortOrder: parseInt(sortOrder, 10) || 0,
				},
				{ onSuccess: () => handleClose() },
			);
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Award className="h-5 w-5 text-primary" />
						{isCreate ? "Create Brand" : "Edit Brand"}
					</SheetTitle>
					<SheetDescription>
						{isCreate
							? "Add a new brand to your catalog."
							: "Update brand details."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="brandName">Name</Label>
						<Input
							id="brandName"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Brand name"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="brandSlug">Slug (auto-generated if empty)</Label>
						<Input
							id="brandSlug"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="brand-name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="brandDescription">Description</Label>
						<Textarea
							id="brandDescription"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brand description..."
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="brandLogoUrl">Logo URL</Label>
						<Input
							id="brandLogoUrl"
							value={logoUrl}
							onChange={(e) => setLogoUrl(e.target.value)}
							placeholder="https://..."
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="brandWebsiteUrl">Website URL</Label>
						<Input
							id="brandWebsiteUrl"
							value={websiteUrl}
							onChange={(e) => setWebsiteUrl(e.target.value)}
							placeholder="https://..."
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="brandSortOrder">Sort Order</Label>
						<Input
							id="brandSortOrder"
							type="number"
							min="0"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value)}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="brandIsActive"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(Boolean(checked))}
						/>
						<Label htmlFor="brandIsActive">Active</Label>
					</div>
				</form>

				<SheetFooter className="px-4">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? "Saving..."
							: isCreate
								? "Create Brand"
								: "Update Brand"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
