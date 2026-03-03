import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Check, Loader2, Package, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { $verifyPayment } from "@/lib/ecommerce/functions";
import { ROUTES } from "@/constants";

const searchSchema = z.object({
	order: z.string().uuid(),
});

export const Route = createFileRoute("/checkout/success")({
	validateSearch: (search) => searchSchema.parse(search),
	component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
	const { order: orderId } = Route.useSearch();
	const [status, setStatus] = useState<"verifying" | "success" | "pending" | "error">("verifying");
	const [orderNumber, setOrderNumber] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function verify() {
			try {
				const result = await $verifyPayment({ data: { orderId } });
				if (!mounted) return;

				if (result?.ok && result.data) {
					setOrderNumber(result.data.orderNumber);
					if (result.data.success || result.data.alreadyProcessed) {
						setStatus("success");
					} else {
						setStatus("pending");
					}
				} else {
					setStatus("error");
				}
			} catch {
				if (mounted) setStatus("error");
			}
		}

		verify();
		return () => {
			mounted = false;
		};
	}, [orderId]);

	return (
		<div
			className="storefront flex min-h-screen flex-col items-center justify-center p-6"
			style={{
				background:
					"linear-gradient(135deg, var(--sf-bg) 0%, var(--sf-bg-warm) 50%, rgba(244,63,94,0.05) 100%)",
			}}
		>
			{/* Decorative blobs */}
			<div
				className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full opacity-30 blur-3xl"
				style={{ background: "var(--sf-rose-light)" }}
			/>
			<div
				className="absolute bottom-10 right-10 -z-10 h-80 w-80 rounded-full opacity-20 blur-3xl"
				style={{ background: "var(--sf-orange)" }}
			/>

			<div className="w-full max-w-lg text-center">
				{status === "verifying" && (
					<div className="space-y-4">
						<Loader2 className="mx-auto h-16 w-16 animate-spin text-[var(--sf-rose)]" />
						<h1
							className="text-2xl font-bold text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Verifying your payment...
						</h1>
						<p className="text-sm text-[var(--sf-text-muted)]">
							Please wait while we confirm your order.
						</p>
					</div>
				)}

				{status === "success" && (
					<div className="space-y-6">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
							<Check className="h-10 w-10 text-green-600" />
						</div>
						<div>
							<h1
								className="text-3xl font-bold text-[var(--sf-text)]"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Order Confirmed!
							</h1>
							<p className="mt-2 text-[var(--sf-text-muted)]">
								Thank you for your purchase. Your order has been placed successfully.
							</p>
						</div>

						{orderNumber && (
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<p className="text-sm text-[var(--sf-text-muted)]">Order Number</p>
								<p className="mt-1 text-xl font-bold text-[var(--sf-text)]">
									{orderNumber}
								</p>
							</div>
						)}

						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
							<div className="flex items-start gap-4 text-left">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sf-rose-light)]">
									<Truck className="h-5 w-5 text-[var(--sf-rose)]" />
								</div>
								<div>
									<p className="font-semibold text-[var(--sf-text)]">What's next?</p>
									<p className="mt-1 text-sm text-[var(--sf-text-muted)]">
										You'll receive a confirmation email shortly. We'll notify you when your order
										ships with tracking information.
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Link
								to={ROUTES.STORE.ACCOUNT.ORDER_DETAIL(orderId) as string}
								className="sf-btn-primary flex flex-1 items-center justify-center gap-2"
							>
								<Package className="h-4 w-4" />
								View Order
							</Link>
							<Link
								to="/store"
								className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
							>
								<ShoppingBag className="h-4 w-4" />
								Continue Shopping
							</Link>
						</div>
					</div>
				)}

				{status === "pending" && (
					<div className="space-y-6">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
							<Loader2 className="h-10 w-10 text-yellow-600" />
						</div>
						<div>
							<h1
								className="text-2xl font-bold text-[var(--sf-text)]"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Payment Processing
							</h1>
							<p className="mt-2 text-[var(--sf-text-muted)]">
								Your payment is still being processed. This may take a few moments.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Link
								to={ROUTES.STORE.ACCOUNT.ORDERS as string}
								className="sf-btn-primary flex flex-1 items-center justify-center gap-2"
							>
								View My Orders
							</Link>
							<Link
								to="/store"
								className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
							>
								Continue Shopping
							</Link>
						</div>
					</div>
				)}

				{status === "error" && (
					<div className="space-y-6">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
							<Package className="h-10 w-10 text-red-600" />
						</div>
						<div>
							<h1
								className="text-2xl font-bold text-[var(--sf-text)]"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								Something went wrong
							</h1>
							<p className="mt-2 text-[var(--sf-text-muted)]">
								We couldn't verify your payment. Please check your order status or contact
								support.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Link
								to={ROUTES.STORE.ACCOUNT.ORDERS as string}
								className="sf-btn-primary flex flex-1 items-center justify-center gap-2"
							>
								Check Orders
							</Link>
							<Link
								to="/store/contact"
								className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
							>
								Contact Support
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
