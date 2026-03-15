import {
	AppearanceTab,
	AuthorProfileTab,
	NotificationsTab,
	OrganizationsTab,
	SecurityTab,
	SessionsTab,
	SettingsTab,
} from "@/components/admin/account/AccountTabs";
import { ACCOUNT_VIEWS } from "@/constants";

export const ACCOUNT_TAB_PANELS = {
	[ACCOUNT_VIEWS.SETTINGS]: SettingsTab,
	[ACCOUNT_VIEWS.PROFILE]: AuthorProfileTab,
	[ACCOUNT_VIEWS.SECURITY]: SecurityTab,
	[ACCOUNT_VIEWS.SESSIONS]: SessionsTab,
	[ACCOUNT_VIEWS.APPEARANCE]: AppearanceTab,
	[ACCOUNT_VIEWS.NOTIFICATIONS]: NotificationsTab,
	[ACCOUNT_VIEWS.ORGANIZATIONS]: OrganizationsTab,
} as const;
