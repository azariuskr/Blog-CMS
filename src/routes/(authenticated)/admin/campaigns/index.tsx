import { createFileRoute } from "@tanstack/react-router";
import { CampaignFiltersSchema } from "@/lib/filters/schemas";
import { CampaignsView } from "@/components/admin/ecommerce/campaigns/campaigns-view";

export const Route = createFileRoute("/(authenticated)/admin/campaigns/")({
	validateSearch: (search) => CampaignFiltersSchema.parse(search),
	component: CampaignsPage,
});

function CampaignsPage() {
	const search = Route.useSearch();
	return <CampaignsView search={search} />;
}
