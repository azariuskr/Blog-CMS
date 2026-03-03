import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CreditCard,
	Loader2,
	Lock,
	MapPin,
	Shield,
	ShoppingBag,
	Truck,
	X,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useCart, useAddresses } from "@/lib/ecommerce/queries";
import { useUser } from "@/hooks/auth-hooks";
import { useRemoveCoupon } from "@/hooks/ecommerce-actions";
import { $createCheckout } from "@/lib/ecommerce/functions";
import { formatPrice } from "@/constants";

function getCartItemImage(item: any): string | null {
	// 1. Direct variant-linked image (set by cart formatting)
	if (item.variant?.image?.url) return item.variant.image.url;
	// 2. Product image matching variant's color
	const colorId = item.variant?.color?.id;
	const productImages = item.product?.images;
	if (colorId && productImages?.length) {
		const colorImg = productImages.find((img: any) => img.colorId === colorId);
		if (colorImg) return colorImg.url;
	}
	// 3. Product's primary or first image
	if (productImages?.length) {
		const primary = productImages.find((img: any) => img.isPrimary);
		return (primary ?? productImages[0]).url;
	}
	return null;
}

export const Route = createFileRoute("/(storefront)/store/checkout")({
	component: CheckoutPage,
});

type AddressForm = {
	firstName: string;
	lastName: string;
	company: string;
	street1: string;
	street2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	phone: string;
};

const EMPTY_ADDRESS: AddressForm = {
	firstName: "",
	lastName: "",
	company: "",
	street1: "",
	street2: "",
	city: "",
	state: "",
	postalCode: "",
	country: "US",
	phone: "",
};

const STEPS = [
	{ label: "Information", icon: MapPin },
	{ label: "Shipping", icon: Truck },
	{ label: "Review & Pay", icon: CreditCard },
] as const;

const FREE_SHIPPING_THRESHOLD = 7500;

const SHIPPING_OPTIONS = [
	{ id: "standard", label: "Standard Shipping", time: "3-5 business days", price: 599 },
	{ id: "express", label: "Express Shipping", time: "2 business days", price: 1299 },
	{ id: "overnight", label: "Overnight Delivery", time: "Next business day", price: 2499 },
] as const;

const INPUT_CLASS =
	"w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]";

function CheckoutPage() {
	const { data: cartData, isLoading: cartLoading } = useCart();
	const { data: addressData } = useAddresses();
	const user = useUser();
	const removeCoupon = useRemoveCoupon();

	const [step, setStep] = useState(0);
	const [email, setEmail] = useState(user?.email ?? "");
	const [shipping, setShipping] = useState<AddressForm>({ ...EMPTY_ADDRESS });
	const [sameAsBilling, setSameAsBilling] = useState(true);
	const [billing] = useState<AddressForm>({ ...EMPTY_ADDRESS });
	const [saveAddress, setSaveAddress] = useState(false);
	const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
	const [shippingMethod, setShippingMethod] = useState("standard");
	const [customerNotes, setCustomerNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cart = cartData?.ok ? cartData.data : null;
	const items = cart?.items ?? [];
	const savedAddresses = addressData?.ok ? addressData.data?.addresses ?? [] : [];

	const shippingCost =
		(cart?.subtotal ?? 0) >= FREE_SHIPPING_THRESHOLD && shippingMethod === "standard"
			? 0
			: SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)?.price ?? 599;

	const estimatedTotal = (cart?.total ?? 0) + shippingCost;

	const selectSavedAddress = useCallback(
		(addrId: string) => {
			const addr = savedAddresses.find((a: any) => a.id === addrId);
			if (addr) {
				setSelectedSavedAddress(addrId);
				setShipping({
					firstName: addr.firstName ?? "",
					lastName: addr.lastName ?? "",
					company: addr.company ?? "",
					street1: addr.street1 ?? "",
					street2: addr.street2 ?? "",
					city: addr.city ?? "",
					state: addr.state ?? "",
					postalCode: addr.postalCode ?? "",
					country: addr.country ?? "US",
					phone: addr.phone ?? "",
				});
			}
		},
		[savedAddresses],
	);

	const canProceedStep0 = () => {
		if (!email.includes("@")) return false;
		if (!shipping.firstName || !shipping.lastName || !shipping.street1 || !shipping.city || !shipping.postalCode) return false;
		return true;
	};

	const handlePlaceOrder = async () => {
		if (submitting) return;
		setSubmitting(true);
		setError(null);

		try {
			const result = await $createCheckout({
				data: {
					shippingAddress: {
						firstName: shipping.firstName,
						lastName: shipping.lastName,
						company: shipping.company || undefined,
						street1: shipping.street1,
						street2: shipping.street2 || undefined,
						city: shipping.city,
						state: shipping.state || undefined,
						postalCode: shipping.postalCode,
						country: shipping.country,
						phone: shipping.phone || undefined,
					},
					billingAddress: sameAsBilling
						? undefined
						: {
								firstName: billing.firstName,
								lastName: billing.lastName,
								company: billing.company || undefined,
								street1: billing.street1,
								street2: billing.street2 || undefined,
								city: billing.city,
								state: billing.state || undefined,
								postalCode: billing.postalCode,
								country: billing.country,
								phone: billing.phone || undefined,
							},
					sameAsShipping: sameAsBilling,
					email: email || undefined,
					customerNotes: customerNotes || undefined,
					saveAddress,
				},
			});

			if (result?.ok && result.data?.checkoutUrl) {
				window.location.href = result.data.checkoutUrl;
			} else {
				setError((result as any)?.error?.message || "Failed to create checkout session. Please try again.");
			}
		} catch (err: any) {
			setError(err?.message || "Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	// Loading state
	if (cartLoading) {
		return (
			<div className="sf-container py-10">
				<div className="h-10 w-64 animate-pulse rounded bg-[var(--sf-border-light)]" />
				<div className="mt-8 grid gap-10 lg:grid-cols-12">
					<div className="space-y-6 lg:col-span-7">
						<div className="h-64 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
					</div>
					<div className="lg:col-span-5">
						<div className="h-80 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
					</div>
				</div>
			</div>
		);
	}

	// Empty cart
	if (!items.length) {
		return (
			<div className="sf-container flex flex-col items-center py-20 text-center">
				<ShoppingBag className="mb-4 h-16 w-16 text-[var(--sf-border)]" />
				<h2
					className="text-2xl font-bold"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					Your cart is empty
				</h2>
				<p className="mt-2 text-[var(--sf-text-muted)]">
					Add some items before checking out.
				</p>
				<Link
					to={"/store/products" as string}
					className="sf-btn-primary mt-6 inline-flex items-center gap-2"
				>
					Browse Products
				</Link>
			</div>
		);
	}

	return (
		<div className="sf-container py-10">
			{/* Header */}
			<div className="mb-8 flex items-center gap-4">
				<Link
					to="/store/cart"
					className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--sf-border)] text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)]"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<h1
					className="text-3xl font-bold"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					Checkout
				</h1>
			</div>

			{/* Step Indicator */}
			<div className="mb-8 flex items-center justify-center gap-0">
				{STEPS.map((s, i) => (
					<div key={s.label} className="flex items-center">
						<button
							onClick={() => {
								if (i < step) setStep(i);
							}}
							disabled={i > step}
							className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
								i === step
									? "bg-[var(--sf-rose)] text-white"
									: i < step
										? "bg-[var(--sf-rose-light)] text-[var(--sf-rose)] hover:bg-[var(--sf-rose)]/20"
										: "bg-[var(--sf-border-light)] text-[var(--sf-text-muted)]"
							}`}
						>
							{i < step ? (
								<Check className="h-4 w-4" />
							) : (
								<s.icon className="h-4 w-4" />
							)}
							<span className="hidden sm:inline">{s.label}</span>
							<span className="sm:hidden">{i + 1}</span>
						</button>
						{i < STEPS.length - 1 && (
							<div
								className={`mx-1 h-0.5 w-8 sm:w-12 ${
									i < step ? "bg-[var(--sf-rose)]" : "bg-[var(--sf-border-light)]"
								}`}
							/>
						)}
					</div>
				))}
			</div>

			<div className="grid items-start gap-10 lg:grid-cols-12">
				{/* Main Content */}
				<div className="lg:col-span-7">
					{/* Step 0: Information */}
					{step === 0 && (
						<div className="space-y-6">
							{/* Email */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Contact Information
								</h2>
								<div>
									<label className="mb-1.5 block text-sm font-bold">Email</label>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@example.com"
										className={INPUT_CLASS}
									/>
								</div>
							</div>

							{/* Saved Addresses */}
							{savedAddresses.length > 0 && (
								<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
									<h2
										className="mb-4 text-lg font-bold"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										Saved Addresses
									</h2>
									<div className="grid gap-3 sm:grid-cols-2">
										{savedAddresses.map((addr: any) => (
											<button
												key={addr.id}
												onClick={() => selectSavedAddress(addr.id)}
												className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${
													selectedSavedAddress === addr.id
														? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5"
														: "border-[var(--sf-border-light)] hover:border-[var(--sf-rose-light)]"
												}`}
											>
												{addr.label && (
													<p className="mb-1 text-xs font-semibold text-[var(--sf-rose)]">
														{addr.label}
													</p>
												)}
												<p className="font-medium">
													{addr.firstName} {addr.lastName}
												</p>
												<p className="text-[var(--sf-text-muted)]">
													{addr.street1}, {addr.city}
												</p>
											</button>
										))}
										<button
											onClick={() => {
												setSelectedSavedAddress(null);
												setShipping({ ...EMPTY_ADDRESS });
											}}
											className={`flex items-center justify-center rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
												selectedSavedAddress === null
													? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5 text-[var(--sf-rose)]"
													: "border-dashed border-[var(--sf-border)] text-[var(--sf-text-muted)] hover:border-[var(--sf-rose-light)]"
											}`}
										>
											+ New Address
										</button>
									</div>
								</div>
							)}

							{/* Shipping Address */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Shipping Address
								</h2>
								<div className="grid gap-4">
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="mb-1.5 block text-sm font-bold">First Name *</label>
											<input
												type="text"
												value={shipping.firstName}
												onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
												className={INPUT_CLASS}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-bold">Last Name *</label>
											<input
												type="text"
												value={shipping.lastName}
												onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
												className={INPUT_CLASS}
											/>
										</div>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-bold">Street Address *</label>
										<input
											type="text"
											value={shipping.street1}
											onChange={(e) => setShipping((s) => ({ ...s, street1: e.target.value }))}
											className={INPUT_CLASS}
										/>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-bold">
											Apartment, suite, etc. (optional)
										</label>
										<input
											type="text"
											value={shipping.street2}
											onChange={(e) => setShipping((s) => ({ ...s, street2: e.target.value }))}
											className={INPUT_CLASS}
										/>
									</div>
									<div className="grid gap-4 md:grid-cols-3">
										<div>
											<label className="mb-1.5 block text-sm font-bold">City *</label>
											<input
												type="text"
												value={shipping.city}
												onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
												className={INPUT_CLASS}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-bold">State</label>
											<input
												type="text"
												value={shipping.state}
												onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
												className={INPUT_CLASS}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-bold">ZIP Code *</label>
											<input
												type="text"
												value={shipping.postalCode}
												onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
												className={INPUT_CLASS}
											/>
										</div>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-bold">Phone (optional)</label>
										<input
											type="tel"
											value={shipping.phone}
											onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
											className={INPUT_CLASS}
										/>
									</div>
								</div>

								<div className="mt-4 space-y-3">
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={sameAsBilling}
											onChange={(e) => setSameAsBilling(e.target.checked)}
											className="h-4 w-4 rounded border-[var(--sf-border)] accent-[var(--sf-rose)]"
										/>
										<span className="text-sm font-medium text-[var(--sf-text-muted)]">
											Billing address same as shipping
										</span>
									</label>
									{user && (
										<label className="flex items-center gap-3">
											<input
												type="checkbox"
												checked={saveAddress}
												onChange={(e) => setSaveAddress(e.target.checked)}
												className="h-4 w-4 rounded border-[var(--sf-border)] accent-[var(--sf-rose)]"
											/>
											<span className="text-sm font-medium text-[var(--sf-text-muted)]">
												Save this address for future orders
											</span>
										</label>
									)}
								</div>
							</div>

							<button
								onClick={() => setStep(1)}
								disabled={!canProceedStep0()}
								className="sf-btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
							>
								Continue to Shipping
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					)}

					{/* Step 1: Shipping Method */}
					{step === 1 && (
						<div className="space-y-6">
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Shipping Method
								</h2>

								<div className="mb-4 rounded-xl bg-[var(--sf-border-light)] p-3 text-sm text-[var(--sf-text-muted)]">
									Shipping to: {shipping.firstName} {shipping.lastName}, {shipping.street1}, {shipping.city}{" "}
									{shipping.state} {shipping.postalCode}
								</div>

								<div className="space-y-3">
									{SHIPPING_OPTIONS.map((opt) => {
										const isFree =
											opt.id === "standard" && (cart?.subtotal ?? 0) >= FREE_SHIPPING_THRESHOLD;
										const isSelected = shippingMethod === opt.id;
										return (
											<label
												key={opt.id}
												className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-colors ${
													isSelected
														? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5"
														: "border-[var(--sf-border-light)] hover:border-[var(--sf-rose-light)]"
												}`}
											>
												<div className="flex items-center gap-3">
													<input
														type="radio"
														name="shipping"
														checked={isSelected}
														onChange={() => setShippingMethod(opt.id)}
														className="accent-[var(--sf-rose)]"
													/>
													<div>
														<p className="text-sm font-bold">{opt.label}</p>
														<p className="text-xs text-[var(--sf-text-muted)]">{opt.time}</p>
													</div>
												</div>
												<span className="text-sm font-bold">
													{isFree ? (
														<span className="text-green-600">Free</span>
													) : (
														formatPrice(opt.price)
													)}
												</span>
											</label>
										);
									})}
								</div>

								{(cart?.subtotal ?? 0) < FREE_SHIPPING_THRESHOLD && (
									<p className="mt-4 text-xs text-[var(--sf-text-muted)]">
										Add {formatPrice(FREE_SHIPPING_THRESHOLD - (cart?.subtotal ?? 0))} more for
										free standard shipping!
									</p>
								)}
							</div>

							{/* Notes */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Order Notes (optional)
								</h2>
								<textarea
									value={customerNotes}
									onChange={(e) => setCustomerNotes(e.target.value)}
									placeholder="Any special instructions for your order..."
									maxLength={500}
									rows={3}
									className={INPUT_CLASS + " resize-none"}
								/>
							</div>

							<div className="flex gap-3">
								<button
									onClick={() => setStep(0)}
									className="flex-1 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
								>
									<ArrowLeft className="mr-2 inline h-4 w-4" />
									Back
								</button>
								<button
									onClick={() => setStep(2)}
									className="sf-btn-primary flex flex-[2] items-center justify-center gap-2"
								>
									Review Order
									<ArrowRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}

					{/* Step 2: Review & Pay */}
					{step === 2 && (
						<div className="space-y-6">
							{/* Review Sections */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<div className="mb-4 flex items-center justify-between">
									<h2
										className="text-lg font-bold"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										Shipping To
									</h2>
									<button
										onClick={() => setStep(0)}
										className="text-xs font-semibold text-[var(--sf-rose)] hover:underline"
									>
										Edit
									</button>
								</div>
								<div className="text-sm text-[var(--sf-text-muted)]">
									<p className="font-medium text-[var(--sf-text)]">
										{shipping.firstName} {shipping.lastName}
									</p>
									<p>{shipping.street1}</p>
									{shipping.street2 && <p>{shipping.street2}</p>}
									<p>
										{shipping.city}, {shipping.state} {shipping.postalCode}
									</p>
									<p className="mt-1">{email}</p>
								</div>
							</div>

							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<div className="mb-4 flex items-center justify-between">
									<h2
										className="text-lg font-bold"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										Shipping Method
									</h2>
									<button
										onClick={() => setStep(1)}
										className="text-xs font-semibold text-[var(--sf-rose)] hover:underline"
									>
										Edit
									</button>
								</div>
								<p className="text-sm">
									<span className="font-medium text-[var(--sf-text)]">
										{SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)?.label}
									</span>
									<span className="text-[var(--sf-text-muted)]">
										{" "}
										&mdash;{" "}
										{SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)?.time}
									</span>
								</p>
							</div>

							{/* Payment info */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Payment
								</h2>
								<div className="flex items-center gap-3 rounded-xl bg-[var(--sf-bg)] p-4">
									<CreditCard className="h-6 w-6 text-[var(--sf-text-light)]" />
									<div>
										<p className="text-sm font-medium text-[var(--sf-text)]">
											Secure Checkout
										</p>
										<p className="text-xs text-[var(--sf-text-muted)]">
											You'll be redirected to our secure payment provider after placing your
											order.
										</p>
									</div>
									<Lock className="ml-auto h-4 w-4 text-[var(--sf-text-light)]" />
								</div>
							</div>

							{/* Items review */}
							<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
								<h2
									className="mb-4 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									Items ({cart?.itemCount ?? 0})
								</h2>
								<div className="space-y-3">
									{items.map((item: any) => (
										<div key={item.id} className="flex gap-3">
											<div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--sf-bg-warm)]">
												{getCartItemImage(item) ? (
													<img
														src={getCartItemImage(item)!}
														alt={item.product?.name}
														className="h-full w-full object-cover"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center">
														<ShoppingBag className="h-5 w-5 text-[var(--sf-border)]" />
													</div>
												)}
												<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sf-text)] text-[9px] font-bold text-white">
													{item.quantity}
												</span>
											</div>
											<div className="flex-1">
												<p className="text-sm font-semibold">{item.product?.name}</p>
												{item.variant?.color && (
													<p className="text-xs text-[var(--sf-text-light)]">
														{item.variant.color.name}
														{item.variant?.size ? ` / ${item.variant.size.name}` : ""}
													</p>
												)}
											</div>
											<span className="text-sm font-bold">{formatPrice(item.lineTotal)}</span>
										</div>
									))}
								</div>
							</div>

							{error && (
								<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
									{error}
								</div>
							)}

							<div className="flex gap-3">
								<button
									onClick={() => setStep(1)}
									className="flex-1 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
								>
									<ArrowLeft className="mr-2 inline h-4 w-4" />
									Back
								</button>
								<button
									onClick={handlePlaceOrder}
									disabled={submitting}
									className="sf-btn-primary flex flex-[2] items-center justify-center gap-2 disabled:opacity-50"
								>
									{submitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Processing...
										</>
									) : (
										<>
											<Lock className="h-4 w-4" />
											Place Order &mdash; {formatPrice(estimatedTotal)}
										</>
									)}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Order Summary Sidebar */}
				<aside className="lg:col-span-5">
					<div className="sticky top-24 rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
						<h3
							className="mb-6 text-lg font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							Order Summary
						</h3>

						{/* Compact items */}
						<div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
							{items.map((item: any) => (
								<div key={item.id} className="flex gap-3">
									<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--sf-bg-warm)]">
										{getCartItemImage(item) ? (
											<img
												src={getCartItemImage(item)!}
												alt={item.product?.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<ShoppingBag className="h-4 w-4 text-[var(--sf-border)]" />
											</div>
										)}
										<span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sf-text)] text-[8px] font-bold text-white">
											{item.quantity}
										</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-semibold">{item.product?.name}</p>
										{item.variant?.color && (
											<p className="text-[10px] text-[var(--sf-text-light)]">
												{item.variant.color.name}
												{item.variant?.size ? ` / ${item.variant.size.name}` : ""}
											</p>
										)}
									</div>
									<span className="text-xs font-bold">{formatPrice(item.lineTotal)}</span>
								</div>
							))}
						</div>

						{/* Totals */}
						<div className="space-y-2 border-t border-[var(--sf-border-light)] pt-4">
							<div className="flex justify-between text-sm">
								<span className="text-[var(--sf-text-muted)]">Subtotal</span>
								<span className="font-medium">{formatPrice(cart?.subtotal ?? 0)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-[var(--sf-text-muted)]">Shipping</span>
								<span className="font-medium">
									{shippingCost === 0 ? (
										<span className="text-green-600">Free</span>
									) : (
										formatPrice(shippingCost)
									)}
								</span>
							</div>
							{(cart?.discount ?? 0) > 0 && (
								<div className="flex justify-between text-sm font-bold text-green-600">
									<span>Discount</span>
									<span>-{formatPrice(cart?.discount ?? 0)}</span>
								</div>
							)}
							{cart?.coupon && (
								<div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-1.5">
									<span className="text-xs font-bold text-green-700">
										Coupon: {cart.coupon.code}
									</span>
									<button
										onClick={() => removeCoupon.mutate()}
										disabled={removeCoupon.isPending}
										className="ml-2 rounded-full p-0.5 text-green-600 transition-colors hover:bg-green-200 hover:text-green-800"
										title="Remove coupon"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								</div>
							)}
						</div>

						<div className="mt-4 border-t border-[var(--sf-border-light)] pt-4">
							<div className="flex justify-between text-lg font-bold">
								<span>Total</span>
								<span className="text-[var(--sf-rose)]">{formatPrice(estimatedTotal)}</span>
							</div>
						</div>

						{/* Trust badges */}
						<div className="mt-6 grid grid-cols-3 gap-3">
							<div className="flex flex-col items-center gap-1 text-center">
								<Shield className="h-4 w-4 text-[var(--sf-text-light)]" />
								<span className="text-[10px] font-medium text-[var(--sf-text-light)]">
									Secure
								</span>
							</div>
							<div className="flex flex-col items-center gap-1 text-center">
								<Truck className="h-4 w-4 text-[var(--sf-text-light)]" />
								<span className="text-[10px] font-medium text-[var(--sf-text-light)]">
									Fast Delivery
								</span>
							</div>
							<div className="flex flex-col items-center gap-1 text-center">
								<Lock className="h-4 w-4 text-[var(--sf-text-light)]" />
								<span className="text-[10px] font-medium text-[var(--sf-text-light)]">
									Encrypted
								</span>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
