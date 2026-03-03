import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface AppState {
	theme: "light" | "dark";
}

export const appStore = new Store<AppState>({
	theme: "dark",
});

// Actions
export const appActions = {
	setTheme: (theme: AppState["theme"]) => {
		appStore.setState((state) => ({ ...state, theme }));
		if (theme === "dark") {
			localStorage.removeItem("theme");
		} else {
			localStorage.setItem("theme", theme);
		}
		applyTheme(theme);
	},
};

function applyTheme(theme: AppState["theme"]) {
	const root = document.documentElement;
	const resolved =
		theme === "dark"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: theme;
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
}

export function useAppStore<T>(selector: (state: AppState) => T) {
	return useStore(appStore, selector);
}
