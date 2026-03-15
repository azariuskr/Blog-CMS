import { useNavigate, useParams } from "@tanstack/react-router";
import { AccountPage } from "@/components/admin/account/AccountPage";
import { ACCOUNT_VIEWS } from "@/constants";

export function AccountView() {
	const params = useParams({ from: "/(authenticated)/account/$accountView" });
	const navigate = useNavigate();

	const currentTab = (params.accountView ?? ACCOUNT_VIEWS.SETTINGS) as string;

	return (
		<AccountPage
			currentTab={currentTab}
			onTabChange={(path) => navigate({ to: path })}
		/>
	);
}
