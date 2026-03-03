import {
	AppearanceTab,
	NotificationsTab,
	SecurityTab,
	SessionsTab,
	SettingsTab,
} from "@/components/admin/account/AccountTabs";
import { ACCOUNT_VIEWS } from "@/constants";

export const ACCOUNT_TAB_PANELS = {
	[ACCOUNT_VIEWS.SETTINGS]: SettingsTab,
	[ACCOUNT_VIEWS.SECURITY]: SecurityTab,
	[ACCOUNT_VIEWS.SESSIONS]: SessionsTab,
	[ACCOUNT_VIEWS.APPEARANCE]: AppearanceTab,
	[ACCOUNT_VIEWS.NOTIFICATIONS]: NotificationsTab,
} as const;
