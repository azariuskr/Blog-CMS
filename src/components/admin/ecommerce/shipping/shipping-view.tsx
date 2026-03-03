import { Package, Settings, Truck } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SHIPPING_CARRIERS } from "@/constants";
import { useHasPermission } from "@/hooks/auth-hooks";

export function ShippingView() {
	const canConfigure = useHasPermission({ shipping: ["configure"] });

	return (
		<PageContainer
			title="Shipping"
			description="Configure shipping settings and carriers"
		>
			<div className="grid gap-6 md:grid-cols-2">
				{/* Shipping Zones */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-5 w-5" />
							Shipping Zones
						</CardTitle>
						<CardDescription>
							Configure shipping rates for different regions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between rounded-lg border p-4">
								<div>
									<div className="font-medium">Domestic (USA)</div>
									<div className="text-sm text-muted-foreground">
										Standard: $5.99 | Express: $12.99
									</div>
								</div>
								<Button variant="outline" size="sm" disabled={!canConfigure}>
									<Settings className="mr-2 h-4 w-4" />
									Edit
								</Button>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-4">
								<div>
									<div className="font-medium">International</div>
									<div className="text-sm text-muted-foreground">
										Standard: $19.99 | Express: $39.99
									</div>
								</div>
								<Button variant="outline" size="sm" disabled={!canConfigure}>
									<Settings className="mr-2 h-4 w-4" />
									Edit
								</Button>
							</div>

							<Button variant="outline" className="w-full" disabled={!canConfigure}>
								Add Shipping Zone
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Carrier Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Truck className="h-5 w-5" />
							Carrier Settings
						</CardTitle>
						<CardDescription>
							Configure default carriers and tracking
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="defaultCarrier">Default Carrier</Label>
								<Select disabled={!canConfigure} value="USPS">
									<SelectTrigger id="defaultCarrier">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SHIPPING_CARRIERS.map((carrier) => (
											<SelectItem key={carrier} value={carrier}>
												{carrier}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="freeShippingThreshold">
									Free Shipping Threshold ($)
								</Label>
								<Input
									id="freeShippingThreshold"
									type="number"
									step="0.01"
									min="0"
									defaultValue="75.00"
									disabled={!canConfigure}
								/>
								<p className="text-xs text-muted-foreground">
									Orders above this amount get free shipping
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="processingDays">Processing Time (days)</Label>
								<Input
									id="processingDays"
									type="number"
									min="0"
									defaultValue="2"
									disabled={!canConfigure}
								/>
								<p className="text-xs text-muted-foreground">
									Time before orders are shipped
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Tracking Settings */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Tracking Configuration</CardTitle>
						<CardDescription>
							Settings for order tracking and notifications
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-4">
								<h4 className="font-medium">Tracking URLs</h4>
								{SHIPPING_CARRIERS.filter((c) => c !== "Other").map(
									(carrier) => (
										<div key={carrier} className="space-y-2">
											<Label htmlFor={`tracking-${carrier}`}>{carrier}</Label>
											<Input
												id={`tracking-${carrier}`}
												placeholder="https://tracking.example.com/{tracking_number}"
												disabled={!canConfigure}
												defaultValue={
													carrier === "USPS"
														? "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}"
														: carrier === "UPS"
															? "https://www.ups.com/track?tracknum={tracking_number}"
															: carrier === "FedEx"
																? "https://www.fedex.com/fedextrack/?trknbr={tracking_number}"
																: carrier === "DHL"
																	? "https://www.dhl.com/us-en/home/tracking/tracking-global-forwarding.html?submit=1&tracking-id={tracking_number}"
																	: ""
												}
											/>
										</div>
									),
								)}
							</div>

							<div className="space-y-4">
								<h4 className="font-medium">Notification Settings</h4>
								<div className="space-y-3">
									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<div className="font-medium">Order Shipped</div>
											<div className="text-sm text-muted-foreground">
												Notify customer when order ships
											</div>
										</div>
										<input
											type="checkbox"
											defaultChecked
											disabled={!canConfigure}
											className="h-4 w-4"
										/>
									</div>

									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<div className="font-medium">Delivery Confirmation</div>
											<div className="text-sm text-muted-foreground">
												Notify customer when order is delivered
											</div>
										</div>
										<input
											type="checkbox"
											defaultChecked
											disabled={!canConfigure}
											className="h-4 w-4"
										/>
									</div>

									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<div className="font-medium">Tracking Updates</div>
											<div className="text-sm text-muted-foreground">
												Send tracking updates via email
											</div>
										</div>
										<input
											type="checkbox"
											disabled={!canConfigure}
											className="h-4 w-4"
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 flex justify-end">
							<Button disabled={!canConfigure}>Save Settings</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageContainer>
	);
}
