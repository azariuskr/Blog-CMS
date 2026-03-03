import { useEffect, useMemo, useState } from 'react';
import type {
    ColumnFiltersState,
    OnChangeFn,
    PaginationState,
} from '@tanstack/react-table';

interface TableFilterConfig<TFilters extends Record<string, unknown>> {
    // Current filter state from URL
    filters: TFilters;
    // Navigation function from useFilters
    setFilters: (updates: Partial<TFilters>) => void;
    // Pagination config
    pagination?: {
        pageKey?: keyof TFilters;
        pageSizeKey?: keyof TFilters;
        defaultPage?: number;
        defaultPageSize?: number;
    };
    // Global filter config
    globalFilter?: {
        key?: keyof TFilters;
        enabled?: boolean;
    };
    // Column filter mappings
    columnFilters?: Array<{
        columnId: string;
        filterKey: keyof TFilters;
        type?: 'string' | 'array' | 'boolean';
    }>;
}

interface UseTableFiltersReturn {
    // TanStack Table props
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    columnFilters: ColumnFiltersState;
    onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
    globalFilter?: string;
    onGlobalFilterChange?: OnChangeFn<string>;
    // Utility
    ensurePageInRange: (pageCount: number) => void;
}

export function useTableFilters<TFilters extends Record<string, unknown>>(
    config: TableFilterConfig<TFilters>
): UseTableFiltersReturn {
    const {
        filters,
        setFilters,
        pagination: paginationConfig = {},
        globalFilter: globalFilterConfig = {},
        columnFilters: columnFiltersConfig = [],
    } = config;

    const pageKey = (paginationConfig.pageKey ?? 'page') as keyof TFilters;
    const pageSizeKey = (paginationConfig.pageSizeKey ?? 'limit') as keyof TFilters;
    const defaultPage = paginationConfig.defaultPage ?? 1;
    const defaultPageSize = paginationConfig.defaultPageSize ?? 10;

    // ============================================================================
    // IMPORTANT: extract primitives so effects re-run even if `filters` reference is stable
    // ============================================================================

    const pageFromUrl = filters[pageKey];
    const pageSizeFromUrl = filters[pageSizeKey];

    const globalFilterEnabled = globalFilterConfig.enabled ?? true;
    const globalFilterKey = (globalFilterConfig.key ?? 'search') as keyof TFilters;
    const globalFilterFromUrl = filters[globalFilterKey];

    // ============================================================================
    // PAGINATION: local state buffer + URL sync
    // ============================================================================

    const [localPagination, setLocalPagination] = useState<PaginationState>(() => {
        const pageNum = typeof pageFromUrl === 'number' ? pageFromUrl : defaultPage;
        const pageSizeNum =
            typeof pageSizeFromUrl === 'number' ? pageSizeFromUrl : defaultPageSize;

        return {
            pageIndex: Math.max(0, pageNum - 1),
            pageSize: pageSizeNum,
        };
    });

    // Keep local pagination in sync if URL changes externally (back/forward/reset/etc.)
    useEffect(() => {
        const pageNum = typeof pageFromUrl === 'number' ? pageFromUrl : defaultPage;
        const pageSizeNum =
            typeof pageSizeFromUrl === 'number' ? pageSizeFromUrl : defaultPageSize;

        const nextFromUrl: PaginationState = {
            pageIndex: Math.max(0, pageNum - 1),
            pageSize: pageSizeNum,
        };

        setLocalPagination((prev) => {
            if (
                prev.pageIndex === nextFromUrl.pageIndex &&
                prev.pageSize === nextFromUrl.pageSize
            ) {
                return prev;
            }
            return nextFromUrl;
        });
    }, [pageFromUrl, pageSizeFromUrl, defaultPage, defaultPageSize]);

    const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
        const next =
            typeof updater === 'function' ? updater(localPagination) : updater;

        // Instant UI update
        setLocalPagination(next);

        // Then sync to URL
        const nextPage = next.pageIndex + 1;
        const nextPageSize = next.pageSize;

        setFilters({
            [pageKey]: nextPage === defaultPage ? undefined : nextPage,
            [pageSizeKey]: nextPageSize === defaultPageSize ? undefined : nextPageSize,
        } as Partial<TFilters>);
    };

    // ============================================================================
    // GLOBAL FILTER
    // ============================================================================

    const [globalFilter, setGlobalFilter] = useState<string>(() => {
        if (!globalFilterEnabled) return '';
        return typeof globalFilterFromUrl === 'string' ? globalFilterFromUrl : '';
    });

    // Keep global filter in sync if URL changes externally
    useEffect(() => {
        if (!globalFilterEnabled) return;
        const next = typeof globalFilterFromUrl === 'string' ? globalFilterFromUrl : '';
        setGlobalFilter((prev) => (prev === next ? prev : next));
    }, [globalFilterFromUrl, globalFilterEnabled]);

    const onGlobalFilterChange: OnChangeFn<string> | undefined = globalFilterEnabled
        ? (updater) => {
            const next = typeof updater === 'function' ? updater(globalFilter) : updater;
            const trimmed = next.trim();

            setGlobalFilter(trimmed);

            setFilters({
                [pageKey]: undefined, // Reset to page 1
                [globalFilterKey]: trimmed || undefined,
            } as Partial<TFilters>);
        }
        : undefined;

    // ============================================================================
    // COLUMN FILTERS
    // ============================================================================

    const initialColumnFilters: ColumnFiltersState = useMemo(() => {
        const collected: ColumnFiltersState = [];

        for (const cfg of columnFiltersConfig) {
            const raw = filters[cfg.filterKey];

            if (cfg.type === 'array') {
                if (Array.isArray(raw) && raw.length > 0) {
                    collected.push({ id: cfg.columnId, value: raw });
                }
            } else if (cfg.type === 'boolean') {
                if (typeof raw === 'boolean') {
                    collected.push({ id: cfg.columnId, value: raw });
                }
            } else {
                // Default to string
                if (typeof raw === 'string' && raw.trim() !== '') {
                    collected.push({ id: cfg.columnId, value: raw });
                }
            }
        }

        return collected;
    }, [columnFiltersConfig, filters]);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        initialColumnFilters
    );

    // Build primitive-ish dependency from the URL values that matter for column filters.
    // This avoids relying on `filters` reference equality.
    const columnFilterValuesKey = useMemo(() => {
        const values = columnFiltersConfig.map((cfg) => filters[cfg.filterKey]);
        return JSON.stringify(values);
    }, [columnFiltersConfig, filters]);

    // Keep column filters in sync if URL changes externally
    useEffect(() => {
        setColumnFilters((prev) => {
            const prevJson = JSON.stringify(prev);
            const nextJson = JSON.stringify(initialColumnFilters);
            return prevJson === nextJson ? prev : initialColumnFilters;
        });
    }, [columnFilterValuesKey, initialColumnFilters]);

    const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
        const next = typeof updater === 'function' ? updater(columnFilters) : updater;
        setColumnFilters(next);

        const updates: Partial<TFilters> = {
            [pageKey]: undefined, // Reset to page 1
        } as Partial<TFilters>;

        for (const cfg of columnFiltersConfig) {
            const found = next.find((f) => f.id === cfg.columnId);

            if (cfg.type === 'array') {
                const value = Array.isArray(found?.value) ? found.value : [];
                updates[cfg.filterKey] = (value.length > 0 ? value : undefined) as TFilters[keyof TFilters];
            } else if (cfg.type === 'boolean') {
                updates[cfg.filterKey] = (found?.value ?? undefined) as TFilters[keyof TFilters];
            } else {
                const value = typeof found?.value === 'string' ? found.value.trim() : '';
                updates[cfg.filterKey] = (value || undefined) as TFilters[keyof TFilters];
            }
        }

        setFilters(updates);
    };

    // ============================================================================
    // UTIL
    // ============================================================================

    const ensurePageInRange = (pageCount: number) => {
        const currentPage = filters[pageKey];
        const pageNum = typeof currentPage === 'number' ? currentPage : defaultPage;

        if (pageCount > 0 && pageNum > pageCount) {
            // Reset URL
            setFilters({ [pageKey]: undefined } as Partial<TFilters>);
            // Also reset local pagination immediately
            setLocalPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }
    };

    return {
        pagination: localPagination,
        onPaginationChange,
        columnFilters,
        onColumnFiltersChange,
        globalFilter: globalFilterEnabled ? globalFilter : undefined,
        onGlobalFilterChange,
        ensurePageInRange,
    };
}
