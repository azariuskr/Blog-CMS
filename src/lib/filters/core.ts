// lib/filters/core.ts
import { useCallback, useMemo } from "react";

type NavigateWithSearch<TSearch> = (opts: {
	to?: string;
	search: (prev: TSearch) => TSearch;
	replace?: boolean;
}) => void;

export function useFilters<TSearch extends object>(
	currentSearch: TSearch,
	navigate: NavigateWithSearch<TSearch>,
	options?: {
		defaults?: Partial<TSearch>;
		preserveOnChange?: (keyof TSearch)[];
	},
) {
	const { defaults = {}, preserveOnChange = [] } = options ?? {};

	const setFilter = useCallback(
		<K extends keyof TSearch>(key: K, value: TSearch[K] | undefined) => {
			navigate({
				to: ".",
				search: (prev) => {
					const next = { ...prev } as Record<string, unknown>;
					const defaultValue = (defaults as Record<string, unknown>)[
						key as string
					];

					if (value === undefined || (value as unknown) === defaultValue) {
						delete next[key as string];
					} else {
						next[key as string] = value as unknown;
					}

					if (
						key !== ("page" as keyof TSearch) &&
						"page" in next &&
						!preserveOnChange.includes("page" as keyof TSearch)
					) {
						next.page = 1;
					}

					return next as TSearch;
				},
				replace: true,
			});
		},
		[navigate, defaults, preserveOnChange],
	);

	const setFilters = useCallback(
		(updates: Partial<TSearch>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const next = { ...prev, ...updates } as Record<string, unknown>;
					const defaultsRecord = defaults as Record<string, unknown>;

					for (const [key, value] of Object.entries(next)) {
						if (value === undefined || value === defaultsRecord[key]) {
							delete next[key];
						}
					}

					if (
						!Object.hasOwn(updates, "page") &&
						"page" in next &&
						!preserveOnChange.includes("page" as keyof TSearch)
					) {
						next.page = 1;
					}

					return next as TSearch;
				},
				replace: true,
			});
		},
		[navigate, defaults, preserveOnChange],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: () => ({}) as TSearch,
			replace: true,
		});
	}, [navigate]);

	const hasActiveFilters = useMemo(() => {
		const excludeKeys = new Set(["page", "limit", "sortBy", "sortOrder"]);
		const defaultsRecord = defaults as Record<string, unknown>;

		return Object.keys(currentSearch).some((key) => {
			if (excludeKeys.has(key)) return false;
			const value = (currentSearch as Record<string, unknown>)[key];
			return value !== undefined && value !== defaultsRecord[key];
		});
	}, [currentSearch, defaults]);

	const activeFilterCount = useMemo(() => {
		const excludeKeys = new Set(["page", "limit", "sortBy", "sortOrder"]);
		const defaultsRecord = defaults as Record<string, unknown>;

		return Object.keys(currentSearch).filter((key) => {
			if (excludeKeys.has(key)) return false;
			const value = (currentSearch as Record<string, unknown>)[key];
			return value !== undefined && value !== defaultsRecord[key];
		}).length;
	}, [currentSearch, defaults]);

	return {
		filters: currentSearch,
		setFilter,
		setFilters,
		resetFilters,
		hasActiveFilters,
		activeFilterCount,
	};
}

export function buildFilterQuery<T extends object>(
	filters: T,
	options?: {
		exclude?: (keyof T)[];
		transform?: Partial<Record<keyof T, (value: unknown) => unknown>>;
	},
): Record<string, unknown> {
	const {
		exclude = [],
		transform = {} as Partial<Record<keyof T, (value: unknown) => unknown>>,
	} = options ?? {};

	return Object.fromEntries(
		Object.entries(filters as Record<string, unknown>)
			.filter(([key, value]) => {
				if (exclude.includes(key as keyof T)) return false;
				if (value === undefined || value === null || value === "") return false;
				return true;
			})
			.map(([key, value]) => {
				const transformer = transform[key as keyof T];
				return [key, transformer ? transformer(value) : value];
			}),
	);
}
