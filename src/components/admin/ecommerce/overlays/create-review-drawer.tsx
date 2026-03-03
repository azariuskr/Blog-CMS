import { useState } from "react";
import { Star } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAdminCreateReview } from "@/hooks/ecommerce-actions";
import { useAdminProducts } from "@/lib/ecommerce/queries";
import { useOverlay } from "@/lib/store/overlay";

export function CreateReviewDrawer() {
	const { id, close } = useOverlay();
	const isOpen = id === "createReview";

	const [userId, setUserId] = useState("");
	const [productId, setProductId] = useState("");
	const [rating, setRating] = useState(5);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isApproved, setIsApproved] = useState(true);
	const [productSearch, setProductSearch] = useState("");

	const { data: productsData } = useAdminProducts({
		search: productSearch || undefined,
		page: 1,
		limit: 20,
	});
	const products = productsData?.ok
		? (productsData.data.items as Array<{ id: string; name: string }>)
		: [];

	const createMutation = useAdminCreateReview();

	const resetForm = () => {
		setUserId("");
		setProductId("");
		setRating(5);
		setTitle("");
		setContent("");
		setIsApproved(true);
		setProductSearch("");
	};

	const handleClose = () => {
		close();
		resetForm();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		createMutation.mutate(
			{
				userId,
				productId,
				rating,
				title,
				content,
				isApproved,
			},
			{ onSuccess: () => handleClose() },
		);
	};

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Star className="h-5 w-5 text-primary" />
						Create Review
					</SheetTitle>
					<SheetDescription>
						Create a review on behalf of a customer.
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="reviewUserId">User ID</Label>
						<Input
							id="reviewUserId"
							value={userId}
							onChange={(e) => setUserId(e.target.value)}
							placeholder="User ID of the customer"
							required
						/>
						<p className="text-xs text-muted-foreground">
							The user ID of the customer this review is for
						</p>
					</div>

					<div className="space-y-2">
						<Label>Product</Label>
						<Input
							value={productSearch}
							onChange={(e) => setProductSearch(e.target.value)}
							placeholder="Search products..."
							className="mb-2"
						/>
						<Select
							value={productId}
							onValueChange={setProductId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a product" />
							</SelectTrigger>
							<SelectContent>
								{products.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Rating</Label>
						<div className="flex items-center gap-1">
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									type="button"
									onClick={() => setRating(star)}
									className="focus:outline-none"
								>
									<Star
										className={`h-6 w-6 cursor-pointer ${
											star <= rating
												? "fill-yellow-400 text-yellow-400"
												: "text-muted-foreground"
										}`}
									/>
								</button>
							))}
							<span className="ml-2 text-sm text-muted-foreground">
								{rating}/5
							</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reviewTitle">Title</Label>
						<Input
							id="reviewTitle"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Review title"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reviewContent">Content</Label>
						<Textarea
							id="reviewContent"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Write the review content..."
							rows={4}
							required
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="reviewIsApproved"
							checked={isApproved}
							onCheckedChange={(checked) => setIsApproved(Boolean(checked))}
						/>
						<Label htmlFor="reviewIsApproved">
							Auto-approve this review
						</Label>
					</div>
				</form>

				<SheetFooter className="px-4">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={createMutation.isPending}>
						{createMutation.isPending ? "Creating..." : "Create Review"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
