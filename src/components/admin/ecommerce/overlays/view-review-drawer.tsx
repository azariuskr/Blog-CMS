import { CheckCircle, Star, XCircle } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThrottledAvatar } from "@/components/shared/ThrottledAvatar";
import { useHasPermission } from "@/hooks/auth-hooks";
import {
	useApproveReview,
	useRejectReview,
} from "@/hooks/ecommerce-actions";
import { useOverlay } from "@/lib/store/overlay";
import { formatDate } from "@/lib/utils";

interface ReviewData {
	id: string;
	rating: number;
	title: string | null;
	content: string;
	isApproved: boolean;
	isVerifiedPurchase: boolean;
	helpfulCount: number;
	productName: string;
	productImage: string | null;
	userName: string | null;
	userEmail: string;
	userImage: string | null;
	createdAt: Date;
}

function StarRating({ rating }: { rating: number }) {
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					className={`h-5 w-5 ${
						star <= rating
							? "fill-yellow-400 text-yellow-400"
							: "text-muted-foreground"
					}`}
				/>
			))}
		</div>
	);
}

export function ViewReviewDrawer() {
	const { id, data, close } = useOverlay();
	const review = data as ReviewData | null;

	const canApprove = useHasPermission({ reviews: ["approve"] });
	const approveMutation = useApproveReview();
	const rejectMutation = useRejectReview();

	if (!review) return null;

	const initials =
		review.userName?.charAt(0).toUpperCase() ??
		review.userEmail.charAt(0).toUpperCase();

	return (
		<Sheet
			open={id === "viewReview"}
			onOpenChange={(open) => !open && close()}
		>
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Review Details</SheetTitle>
					<SheetDescription>
						Review for {review.productName}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-6 px-4 py-4">
					{/* Rating */}
					<div className="flex items-center gap-3">
						<StarRating rating={review.rating} />
						<Badge variant={review.isApproved ? "default" : "secondary"}>
							{review.isApproved ? "Approved" : "Pending"}
						</Badge>
					</div>

					{/* Product */}
					<div className="flex items-center gap-3">
						{review.productImage ? (
							<img
								src={review.productImage}
								alt={review.productName}
								className="h-12 w-12 rounded-md object-cover"
							/>
						) : (
							<div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
								<Star className="h-5 w-5 text-muted-foreground" />
							</div>
						)}
						<span className="font-medium">{review.productName}</span>
					</div>

					<Separator />

					{/* Reviewer */}
					<div className="flex items-center gap-3">
						<ThrottledAvatar
							className="h-10 w-10"
							src={review.userImage ?? undefined}
							alt={review.userName ?? review.userEmail}
							fallback={initials}
						/>
						<div>
							<div className="font-medium">
								{review.userName ?? "Anonymous"}
							</div>
							<div className="text-sm text-muted-foreground">
								{review.userEmail}
							</div>
						</div>
					</div>

					{review.isVerifiedPurchase && (
						<Badge variant="secondary">Verified Purchase</Badge>
					)}

					<Separator />

					{/* Review Content */}
					{review.title && (
						<h3 className="text-lg font-semibold">{review.title}</h3>
					)}
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{review.content}
					</p>

					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span>{formatDate(review.createdAt)}</span>
						{review.helpfulCount > 0 && (
							<span>{review.helpfulCount} found helpful</span>
						)}
					</div>
				</div>

				{canApprove && (
					<SheetFooter className="px-4">
						{!review.isApproved ? (
							<Button
								onClick={() => {
									approveMutation.mutate(
										{ reviewId: review.id },
										{ onSuccess: () => close() },
									);
								}}
								disabled={approveMutation.isPending}
							>
								<CheckCircle className="mr-2 h-4 w-4" />
								{approveMutation.isPending ? "Approving..." : "Approve"}
							</Button>
						) : (
							<Button
								variant="outline"
								onClick={() => {
									rejectMutation.mutate(
										{ reviewId: review.id },
										{ onSuccess: () => close() },
									);
								}}
								disabled={rejectMutation.isPending}
							>
								<XCircle className="mr-2 h-4 w-4" />
								{rejectMutation.isPending ? "Rejecting..." : "Reject"}
							</Button>
						)}
					</SheetFooter>
				)}
			</SheetContent>
		</Sheet>
	);
}
