import { useDebouncedCallback } from "@tanstack/react-pacer";
import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./faceted-filter";

type DataTableToolbarProps<TData> = {
	table: Table<TData>;
	searchPlaceholder?: string;
	searchKey?: string;
	filters?: {
		columnId: string;
		title: string;
		options: {
			label: string;
			value: string;
			icon?: React.ComponentType<{ className?: string }>;
		}[];
		counts?: Record<string, number> | null;
	}[];
};

export function DataTableToolbar<TData>({
	table,
	searchPlaceholder = "Filter...",
	searchKey,
	filters = [],
}: DataTableToolbarProps<TData>) {
	const isFiltered =
		table.getState().columnFilters.length > 0 || table.getState().globalFilter;

	// Local state for immediate UI updates
	const [searchValue, setSearchValue] = useState<string>(() => {
		if (searchKey) {
			return (table.getColumn(searchKey)?.getFilterValue() as string) ?? "";
		}
		return table.getState().globalFilter ?? "";
	});

	// Use TanStack Pacer for debouncing
	const debouncedSetFilter = useDebouncedCallback(
		(value: string) => {
			if (searchKey) {
				table.getColumn(searchKey)?.setFilterValue(value);
			} else {
				table.setGlobalFilter(value);
			}
		},
		{ wait: 300 },
	);

	// Sync with external filter changes
	useEffect(() => {
		const externalValue = searchKey
			? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")
			: (table.getState().globalFilter ?? "");

		if (externalValue !== searchValue) {
			setSearchValue(externalValue);
		}
	}, [searchKey, searchValue, table]);

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setSearchValue(value);
		debouncedSetFilter(value);
	};

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
				<Input
					placeholder={searchPlaceholder}
					value={searchValue}
					onChange={handleSearchChange}
					className="h-8 w-37.5 lg:w-62.5"
				/>
				<div className="flex gap-x-2">
					{filters.map((filter) => {
						const column = table.getColumn(filter.columnId);
						if (!column) return null;
						return (
							<DataTableFacetedFilter
								key={filter.columnId}
								column={column}
								title={filter.title}
								options={filter.options}
								counts={filter.counts}
							/>
						);
					})}
				</div>
				{isFiltered && (
					<Button
						variant="ghost"
						onClick={() => {
							setSearchValue("");
							table.resetColumnFilters();
							table.setGlobalFilter("");
						}}
						className="h-8 px-2 lg:px-3"
					>
						Reset
						<X className="ml-2 h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
