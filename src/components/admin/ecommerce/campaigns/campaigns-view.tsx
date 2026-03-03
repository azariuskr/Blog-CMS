import { useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	CheckCircle2,
	Clock,
	Mail,
	MoreHorizontal,
	Pause,
	Pencil,
	Play,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { PageContainer } from "@/components/admin/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants";
import { useCreateCampaign, useDeleteCampaign } from "@/hooks/ecommerce-actions";
import type { CampaignFilters } from "@/lib/filters/schemas";
import { useAdminCampaigns } from "@/lib/ecommerce/queries";

interface CampaignsViewProps {
	search?: CampaignFilters;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	draft: { label: "Draft", variant: "secondary" },
	scheduled: { label: "Scheduled", variant: "outline" },
	running: { label: "Running", variant: "default" },
	completed: { label: "Completed", variant: "secondary" },
	paused: { label: "Paused", variant: "destructive" },
};

export function CampaignsView({ search }: CampaignsViewProps) {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState(search?.search ?? "");
	const page = search?.page ?? 1;

	const { data, isLoading } = useAdminCampaigns({
		page,
		search: search?.search,
		status: search?.status,
	});
	const campaigns = data?.ok ? (data.data?.items ?? []) as any[] : [];
	const totalPages = data?.ok ? data.data?.totalPages ?? 1 : 1;

	const createMutation = useCreateCampaign();
	const deleteMutation = useDeleteCampaign();

	const handleCreate = () => {
		createMutation.mutate(
			{ name: "Untitled Campaign" },
			{
				onSuccess: (result) => {
					if (result.ok && result.data?.id) {
						navigate({
							to: ROUTES.ADMIN.CAMPAIGN_DETAIL(result.data.id) as string,
						});
					}
				},
			},
		);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		navigate({
			to: ROUTES.ADMIN.CAMPAIGNS,
			search: { ...search, search: searchQuery || undefined, page: 1 },
		} as any);
	};

	return (
		<PageContainer
			title="Email Campaigns"
			description="Create and manage email campaigns"
			actions={
				<Button onClick={handleCreate} disabled={createMutation.isPending}>
					<Plus className="mr-2 h-4 w-4" />
					New Campaign
				</Button>
			}
		>
			<div className="space-y-4">
				{/* Search & Filters */}
				<Card>
					<CardContent className="pt-6">
						<form onSubmit={handleSearch} className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search campaigns..."
									className="pl-9"
								/>
							</div>
							<Button type="submit" variant="secondary">
								Search
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Campaign List */}
				<Card>
					<CardContent className="p-0">
						<LoadingSwap isLoading={isLoading}>
							{campaigns.length === 0 ? (
								<div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
									<Mail className="h-10 w-10" />
									<p className="text-sm">No campaigns yet</p>
									<Button onClick={handleCreate} size="sm" variant="outline">
										<Plus className="mr-1 h-4 w-4" />
										Create your first campaign
									</Button>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Campaign</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Template</TableHead>
											<TableHead>Recipients</TableHead>
											<TableHead>Sent</TableHead>
											<TableHead>Schedule</TableHead>
											<TableHead className="w-10" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{campaigns.map((campaign) => {
											const status = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft;
											return (
												<TableRow
													key={campaign.id}
													className="cursor-pointer"
													onClick={() =>
														navigate({
															to: ROUTES.ADMIN.CAMPAIGN_DETAIL(campaign.id) as string,
														})
													}
												>
													<TableCell>
														<div>
															<p className="font-medium">{campaign.name}</p>
															{campaign.description && (
																<p className="text-xs text-muted-foreground line-clamp-1">
																	{campaign.description}
																</p>
															)}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant={status.variant}>{status.label}</Badge>
													</TableCell>
													<TableCell>
														{campaign.templateName ? (
															<span className="text-sm">{campaign.templateName}</span>
														) : (
															<span className="text-sm text-muted-foreground">None</span>
														)}
													</TableCell>
													<TableCell>{campaign.totalRecipients}</TableCell>
													<TableCell>
														{campaign.sentCount > 0
															? `${campaign.sentCount}/${campaign.totalRecipients}`
															: "—"}
													</TableCell>
													<TableCell>
														{campaign.scheduledAt ? (
															<div className="flex items-center gap-1 text-xs text-muted-foreground">
																<Calendar className="h-3 w-3" />
																{new Date(campaign.scheduledAt).toLocaleDateString()}
															</div>
														) : (
															<span className="text-xs text-muted-foreground">—</span>
														)}
													</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger render={
																<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															} />
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={(e) => {
																		e.stopPropagation();
																		navigate({
																			to: ROUTES.ADMIN.CAMPAIGN_DETAIL(campaign.id) as string,
																		});
																	}}
																>
																	<Pencil className="mr-2 h-4 w-4" />
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={(e) => {
																		e.stopPropagation();
																		if (confirm("Delete this campaign?")) {
																			deleteMutation.mutate({ id: campaign.id });
																		}
																	}}
																>
																	<Trash2 className="mr-2 h-4 w-4" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							)}
						</LoadingSwap>
					</CardContent>
				</Card>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() =>
								navigate({
									to: ROUTES.ADMIN.CAMPAIGNS,
									search: { ...search, page: page - 1 },
								} as any)
							}
						>
							Previous
						</Button>
						<span className="flex items-center text-sm text-muted-foreground">
							Page {page} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= totalPages}
							onClick={() =>
								navigate({
									to: ROUTES.ADMIN.CAMPAIGNS,
									search: { ...search, page: page + 1 },
								} as any)
							}
						>
							Next
						</Button>
					</div>
				)}
			</div>
		</PageContainer>
	);
}
