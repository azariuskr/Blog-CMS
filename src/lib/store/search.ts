import { Store } from "@tanstack/store";
import { createStoreHook, createActions } from "./core";

interface SearchState {
    open: boolean;
    query: string;
    recentSearches: string[];
}

const DEFAULTS: SearchState = {
    open: false,
    query: "",
    recentSearches: [],
};

const loadInitialState = (): SearchState => {
    if (typeof window === "undefined") return DEFAULTS;

    try {
        const stored = localStorage.getItem("recent_searches");
        const recentSearches = stored ? JSON.parse(stored) : [];
        return { ...DEFAULTS, recentSearches };
    } catch {
        return DEFAULTS;
    }
};

export const searchStore = new Store<SearchState>(loadInitialState());

export const searchActions = createActions(searchStore, (setState) => ({
    open: () => setState((s) => ({ ...s, open: true })),

    close: () => setState((s) => ({ ...s, open: false, query: "" })),

    toggle: () => setState((s) => ({ ...s, open: !s.open })),

    setQuery: (query: string) => setState((s) => ({ ...s, query })),

    addRecentSearch: (query: string) => {
        setState((state) => {
            const trimmed = query.trim();
            if (!trimmed) return state;

            const filtered = state.recentSearches.filter((s) => s !== trimmed);
            const updated = [trimmed, ...filtered].slice(0, 10);

            try {
                localStorage.setItem("recent_searches", JSON.stringify(updated));
            } catch (err) {
                console.error("Failed to save recent searches:", err);
            }

            return { ...state, recentSearches: updated };
        });
    },

    clearRecentSearches: () => {
        setState((s) => ({ ...s, recentSearches: [] }));
        try {
            localStorage.removeItem("recent_searches");
        } catch (err) {
            console.error("Failed to clear recent searches:", err);
        }
    },

    reset: () => setState(() => DEFAULTS),
}));

export const useSearchStore = createStoreHook(searchStore);

export function useSearch() {
    const state = useSearchStore((s) => s);

    return {
        ...state,
        ...searchActions,
        setOpen: (val: boolean) => (val ? searchActions.open() : searchActions.close()),
    };
}
