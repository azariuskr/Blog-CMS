import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAddresses } from "@/lib/ecommerce/queries";
import { $saveAddress, $deleteAddress } from "@/lib/ecommerce/functions";
import { QUERY_KEYS } from "@/constants";

export const Route = createFileRoute(
	"/(storefront)/store/account/addresses",
)({
	component: AddressesPage,
});

function AddressesPage() {
	const { data: addressData, isLoading } = useAddresses();
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

	const addresses = addressData?.ok ? addressData.data?.addresses ?? [] : [];

	const handleDelete = async (addressId: string) => {
		if (deleting) return;
		setDeleting(addressId);
		try {
			await $deleteAddress({ data: { addressId } });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES.LIST });
		} finally {
			setDeleting(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (saving) return;
		setSaving(true);

		const form = new FormData(e.currentTarget);
		try {
			await $saveAddress({
				data: {
					label: (form.get("label") as string) || undefined,
					firstName: form.get("firstName") as string,
					lastName: form.get("lastName") as string,
					street1: form.get("street1") as string,
					street2: (form.get("street2") as string) || undefined,
					city: form.get("city") as string,
					state: (form.get("state") as string) || undefined,
					postalCode: form.get("postalCode") as string,
					country: (form.get("country") as string) || "US",
					phone: (form.get("phone") as string) || undefined,
					isDefault: form.get("isDefault") === "on",
				},
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES.LIST });
			setShowForm(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between">
				<div>
					<h2
						className="text-lg font-bold text-[var(--sf-text)]"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						My Addresses
					</h2>
					<p className="text-sm text-[var(--sf-text-muted)]">
						{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}
					</p>
				</div>
				<button
					onClick={() => setShowForm(!showForm)}
					className="sf-btn-primary inline-flex items-center gap-2 text-sm"
				>
					<Plus className="h-4 w-4" />
					Add Address
				</button>
			</div>

			{/* New Address Form */}
			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-5"
				>
					<h3 className="mb-4 text-sm font-semibold text-[var(--sf-text)]">
						New Address
					</h3>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="sm:col-span-2">
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Label (optional)
							</label>
							<input
								name="label"
								placeholder="e.g., Home, Office"
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								First Name *
							</label>
							<input
								name="firstName"
								required
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Last Name *
							</label>
							<input
								name="lastName"
								required
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Street Address *
							</label>
							<input
								name="street1"
								required
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Apartment, suite, etc. (optional)
							</label>
							<input
								name="street2"
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								City *
							</label>
							<input
								name="city"
								required
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								State / Province
							</label>
							<input
								name="state"
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Postal Code *
							</label>
							<input
								name="postalCode"
								required
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Country
							</label>
							<input
								name="country"
								defaultValue="US"
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="mb-1 block text-xs font-medium text-[var(--sf-text-muted)]">
								Phone (optional)
							</label>
							<input
								name="phone"
								type="tel"
								className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="flex items-center gap-2 text-sm text-[var(--sf-text)]">
								<input
									name="isDefault"
									type="checkbox"
									className="h-4 w-4 rounded border-[var(--sf-border)] accent-[var(--sf-rose)]"
								/>
								Set as default address
							</label>
						</div>
					</div>
					<div className="mt-4 flex gap-3">
						<button
							type="submit"
							disabled={saving}
							className="sf-btn-primary text-sm disabled:opacity-50"
						>
							{saving ? "Saving..." : "Save Address"}
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="rounded-xl border border-[var(--sf-border)] px-4 py-2 text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{/* Address list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={i}
							className="h-28 animate-pulse rounded-2xl bg-[var(--sf-border-light)]"
						/>
					))}
				</div>
			) : addresses.length === 0 && !showForm ? (
				<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-12 text-center">
					<MapPin className="mx-auto h-12 w-12 text-[var(--sf-border)]" />
					<p className="mt-3 text-sm font-medium text-[var(--sf-text-muted)]">
						No saved addresses yet
					</p>
					<p className="mt-1 text-xs text-[var(--sf-text-light)]">
						Add an address to speed up checkout.
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					{addresses.map((addr: any) => (
						<div
							key={addr.id}
							className="relative rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-5"
						>
							{addr.isDefault && (
								<span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--sf-rose-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sf-rose)]">
									<Star className="h-3 w-3" />
									Default
								</span>
							)}
							{addr.label && (
								<p className="text-xs font-semibold text-[var(--sf-rose)]">
									{addr.label}
								</p>
							)}
							<div className="mt-1 text-sm text-[var(--sf-text)]">
								<p className="font-medium">
									{addr.firstName} {addr.lastName}
								</p>
								<p className="text-[var(--sf-text-muted)]">{addr.street1}</p>
								{addr.street2 && (
									<p className="text-[var(--sf-text-muted)]">{addr.street2}</p>
								)}
								<p className="text-[var(--sf-text-muted)]">
									{addr.city}
									{addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
								</p>
								{addr.phone && (
									<p className="text-[var(--sf-text-muted)]">{addr.phone}</p>
								)}
							</div>
							<button
								onClick={() => handleDelete(addr.id)}
								disabled={deleting === addr.id}
								className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--sf-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
