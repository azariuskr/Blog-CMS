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
	return (
		<PageContainer
			title="Account"
			description="Manage your account settings and preferences"
		>
			<Tabs value={currentTab} className="space-y-4">
				<AccountTabsHeader tabs={ACCOUNT_TABS} onTabChange={onTabChange} />

				{ACCOUNT_TABS.map((tab) => {
					const Panel =
						ACCOUNT_TAB_PANELS[tab.id as keyof typeof ACCOUNT_TAB_PANELS];
					return (
						<TabsContent key={tab.id} value={tab.id} className="space-y-4">
							{Panel ? <Panel /> : null}
						</TabsContent>
					);
				})}
			</Tabs>
		</PageContainer>
	);
}
