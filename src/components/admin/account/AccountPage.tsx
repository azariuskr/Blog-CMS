import { PageContainer } from "@/components/admin/app-layout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ACCOUNT_TABS } from "@/constants";
import { ACCOUNT_TAB_PANELS } from "./AccountTabRegistry";
import { AccountTabsHeader } from "./AccountTabsHeader";

type Props = {
	currentTab: string;
	onTabChange: (path: string) => void;
};

export function AccountPage({ currentTab, onTabChange }: Props) {
	const activeTab =
		ACCOUNT_TABS.find((t) => t.id === currentTab) ?? ACCOUNT_TABS[0];
	const ActivePanel =
		ACCOUNT_TAB_PANELS[activeTab.id as keyof typeof ACCOUNT_TAB_PANELS];

	return (
		<PageContainer
			title="Account"
			description="Manage your account settings and preferences"
		>
			<Tabs
				value={activeTab.id}
				onValueChange={(tabId) => {
					const tab = ACCOUNT_TABS.find((t) => t.id === tabId);
					if (tab) onTabChange(tab.path);
				}}
				className="space-y-4"
			>
				<AccountTabsHeader tabs={ACCOUNT_TABS} />

				<TabsContent value={activeTab.id} className="space-y-4">
					{ActivePanel ? <ActivePanel /> : null}
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}
