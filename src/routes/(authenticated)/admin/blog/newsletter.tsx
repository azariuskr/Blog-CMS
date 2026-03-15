import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Mail, Download, CheckCircle, Clock } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNewsletterSubscribers } from "@/lib/blog/queries";

export const Route = createFileRoute(
	"/(authenticated)/admin/blog/newsletter",
)({
	component: AdminNewsletterPage,
});

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString();
}

function AdminNewsletterPage() {
	const [tab, setTab] = useState<"all" | "confirmed" | "unconfirmed">("all");

	const confirmed =
		tab === "confirmed" ? true : tab === "unconfirmed" ? false : undefined;

	const subscribersQuery = useNewsletterSubscribers({ confirmed });
	const subscribers =
		subscribersQuery.data?.ok ? subscribersQuery.data.data.items : [];
	const total = subscribersQuery.data?.ok
		? subscribersQuery.data.data.total
		: 0;

	const confirmedCount = useMemo(
		() => subscribers.filter((s) => s.isConfirmed).length,
		[subscribers],
	);

	const handleExportCSV = () => {
		if (subscribers.length === 0) return;
		const header = "email,name,confirmed,subscribed_at\n";
		const rows = subscribers
			.map(
				(s) =>
					`${s.email},${s.name ?? ""},${s.isConfirmed ? "yes" : "no"},${formatDate(s.subscribedAt)}`,
			)
			.join("\n");
		const blob = new Blob([header + rows], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "newsletter-subscribers.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<PageContainer
			title="Newsletter"
			description="Manage subscribers and track newsletter performance."
		>
			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
						<Mail className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{total.toLocaleString()}</div>
						<p className="text-xs text-muted-foreground">All time</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Confirmed</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{tab === "all" ? confirmedCount : tab === "confirmed" ? total : "—"}
						</div>
						<p className="text-xs text-muted-foreground">Email verified</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Pending</CardTitle>
						<Clock className="h-4 w-4 text-amber-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-amber-600">
							{tab === "all"
								? subscribers.length - confirmedCount
								: tab === "unconfirmed"
									? total
									: "—"}
						</div>
						<p className="text-xs text-muted-foreground">Awaiting confirmation</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters + Export */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
				<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="confirmed">Confirmed</TabsTrigger>
						<TabsTrigger value="unconfirmed">Pending</TabsTrigger>
					</TabsList>
				</Tabs>
				<Button
					variant="outline"
					size="sm"
					onClick={handleExportCSV}
					disabled={subscribers.length === 0}
					className="gap-2"
				>
					<Download className="h-4 w-4" />
					Export CSV
				</Button>
			</div>

			{/* Table */}
			<Card>
				{subscribersQuery.isLoading ? (
					<CardContent className="flex items-center justify-center py-20 text-muted-foreground">
						Loading subscribers…
					</CardContent>
				) : subscribers.length === 0 ? (
					<CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
						<Mail className="h-10 w-10 opacity-40" />
						<p>No subscribers yet</p>
					</CardContent>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left py-3 px-4 font-medium text-muted-foreground">
										Email
									</th>
									<th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">
										Name
									</th>
									<th className="text-left py-3 px-4 font-medium text-muted-foreground">
										Status
									</th>
									<th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">
										Subscribed
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{subscribers.map((sub) => (
									<tr
										key={sub.id}
										className="hover:bg-muted/30 transition-colors"
									>
										<td className="py-3 px-4 font-medium">{sub.email}</td>
										<td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">
											{sub.name ?? "—"}
										</td>
										<td className="py-3 px-4">
											{sub.isConfirmed ? (
												<Badge className="bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400">
													Confirmed
												</Badge>
											) : (
												<Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
													Pending
												</Badge>
											)}
										</td>
										<td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
											{formatDate(sub.subscribedAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</PageContainer>
	);
}
