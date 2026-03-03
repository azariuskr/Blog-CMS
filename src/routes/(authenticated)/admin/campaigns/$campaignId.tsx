import { createFileRoute } from "@tanstack/react-router";
import { CampaignEditorView } from "@/components/admin/ecommerce/campaigns/campaign-editor-view";

export const Route = createFileRoute(
	"/(authenticated)/admin/campaigns/$campaignId",
)({
	component: CampaignEditorPage,
});

function CampaignEditorPage() {
	const { campaignId } = Route.useParams();
	return <CampaignEditorView campaignId={campaignId} />;
}
