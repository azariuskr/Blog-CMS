import { createActions, createPersistedStore, createStoreHook } from "./core";

export type Collapsible = "offcanvas" | "icon" | "none";
export type Variant = "inset" | "sidebar" | "floating";

interface LayoutState {
	collapsible: Collapsible;
	variant: Variant;
	sidebarOpen: boolean;
	mobileSidebarOpen: boolean;
}

const DEFAULTS: LayoutState = {
	collapsible: "icon",
	variant: "inset",
	sidebarOpen: true,
	mobileSidebarOpen: false,
};

export const layoutStore = createPersistedStore("app_layout", DEFAULTS, {
	exclude: ["mobileSidebarOpen"],
});

export const layoutActions = createActions(layoutStore, (setState) => ({
	setCollapsible: (collapsible: Collapsible) => {
		setState((state) => ({ ...state, collapsible }));
	},

	setVariant: (variant: Variant) => {
		setState((state) => ({ ...state, variant }));
	},

	toggleSidebar: () => {
		setState((state) => ({ ...state, sidebarOpen: !state.sidebarOpen }));
	},

	setSidebarOpen: (open: boolean) => {
		setState((state) => ({ ...state, sidebarOpen: open }));
	},

	toggleMobileSidebar: () => {
		setState((state) => ({
			...state,
			mobileSidebarOpen: !state.mobileSidebarOpen,
		}));
	},

	setMobileSidebarOpen: (open: boolean) => {
		setState((state) => ({ ...state, mobileSidebarOpen: open }));
	},

	reset: () => {
		setState(() => DEFAULTS);
	},
}));

export const useLayoutStore = createStoreHook(layoutStore);

export function useLayout() {
	const state = useLayoutStore((s) => s);

	return {
		...state,
		...layoutActions,
	};
}
