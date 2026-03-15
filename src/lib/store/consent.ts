import { createPersistedStore, createStoreHook, createActions } from "./core";

interface ConsentState {
	consented: boolean;
	preferences: {
		essential: true; // Always true - auth cookies required
		analytics: boolean;
		functional: boolean;
	};
	consentedAt: string | null;
}

const defaults: ConsentState = {
	consented: false,
	preferences: {
		essential: true,
		analytics: false,
		functional: false,
	},
	consentedAt: null,
};

export const consentStore = createPersistedStore("cookie-consent", defaults);

export const useConsentStore = createStoreHook(consentStore);

export const consentActions = createActions(consentStore, (setState) => ({
	acceptAll: () =>
		setState(() => ({
			consented: true,
			preferences: { essential: true, analytics: true, functional: true },
			consentedAt: new Date().toISOString(),
		})),

	acceptEssentialOnly: () =>
		setState(() => ({
			consented: true,
			preferences: { essential: true, analytics: false, functional: false },
			consentedAt: null,
		})),
}));
