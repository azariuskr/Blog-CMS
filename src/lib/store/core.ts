import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export function createPersistedStore<T extends object>(
	key: string,
	defaults: T,
	options?: {
		serialize?: (state: T) => string;
		deserialize?: (data: string) => Partial<T>;
		exclude?: (keyof T)[];
	},
) {
	const loadState = (): T => {
		if (typeof window === "undefined") return defaults;

		try {
			const stored = localStorage.getItem(key);
			if (!stored) return defaults;

			const parsed = options?.deserialize
				? options.deserialize(stored)
				: JSON.parse(stored);

			return { ...defaults, ...parsed };
		} catch {
			return defaults;
		}
	};

	const store = new Store<T>(loadState());

	const persistState = (state: T) => {
		if (typeof window === "undefined") return;

		try {
			const toPersist = options?.exclude
				? Object.fromEntries(
					Object.entries(state as Record<string, unknown>).filter(
						([k]) => !options.exclude?.includes(k as keyof T),
					),
				)
				: state;

			const serialized = options?.serialize
				? options.serialize(toPersist as T)
				: JSON.stringify(toPersist);

			localStorage.setItem(key, serialized);
		} catch (err) {
			console.error(`Failed to persist ${key}:`, err);
		}
	};

	store.subscribe(() => persistState(store.state));

	return store;
}

export function createStoreHook<T>(store: Store<T>) {
	return function useStoreSelector<R>(selector: (state: T) => R): R {
		return useStore(store, selector);
	};
}

export function createActions<
	T,
	// biome-ignore lint/suspicious/noExplicitAny: Action argument lists are intentionally generic.
	A extends Record<string, (...args: any[]) => void>,
>(
	store: Store<T>,
	actions: (setState: (updater: (state: T) => T) => void) => A,
): A {
	const setState = (updater: (state: T) => T) => {
		store.setState((state) => updater(state));
	};

	return actions(setState);
}
