import type { PaginationState, Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn, getPageNumbers } from "@/lib/utils";

type DataTablePaginationProps<TData> = {
	table: Table<TData>;
	className?: string;
	pageSizeOptions?: number[];
	pageCount?: number;
	pagination?: PaginationState;
};

export function DataTablePagination<TData>({
	table,
	className,
	pageSizeOptions = [5, 10, 20, 50],
	pageCount: pageCountProp,
	pagination: paginationProp,
}: DataTablePaginationProps<TData>) {
	const { pageIndex, pageSize } = paginationProp ?? table.getState().pagination;

	const currentPage = pageIndex + 1;
	const totalPages = pageCountProp ?? table.getPageCount();
	const pageNumbers = getPageNumbers(currentPage, totalPages);

	const canPreviousPage = currentPage > 1;
	const canNextPage = currentPage < totalPages;

	const handlePageSizeChange = (value: string) => {
		const newSize = Number(value);

		// Preserve the user's position by keeping the first visible row index stable.
		// offset = currentPageIndex * currentPageSize
		// newPageIndex = floor(offset / newPageSize)
		const offset = pageIndex * pageSize;
		const nextPageIndex = Math.floor(offset / newSize);

		table.setPagination({
			pageIndex: Math.max(0, nextPageIndex),
			pageSize: newSize,
		});
	};

	const handlePageChange = (nextPageIndex: number) => {
		if (totalPages <= 0) return;
		const clamped = Math.max(0, Math.min(nextPageIndex, totalPages - 1));
		table.setPageIndex(clamped);
	};

	return (
		<div className={cn("flex items-center justify-between px-2", className)}>
			<div className="flex w-full items-center justify-between gap-4 sm:gap-6 lg:gap-8">
				<div className="flex items-center gap-2">
					<p className="hidden text-sm font-medium sm:block">Rows per page</p>

					<Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
						<SelectTrigger className="h-8 w-17.5">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-6 lg:gap-8">
					<div className="flex items-center justify-center text-sm font-medium">
						Page {currentPage} of {Math.max(1, totalPages)}
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(0)}
							disabled={!canPreviousPage}
						>
							<span className="sr-only">Go to first page</span>
							<ChevronsLeft className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pageIndex - 1)}
							disabled={!canPreviousPage}
						>
							<span className="sr-only">Go to previous page</span>
							<ChevronLeft className="h-4 w-4" />
						</Button>

						{(() => {
							let ellipsisCount = 0;

							return pageNumbers.map((pageNumber) => {
								if (pageNumber === "...") {
									ellipsisCount += 1;
									return (
										<span
											key={`ellipsis-${ellipsisCount}-${currentPage}-${totalPages}`}
											className="px-1 text-sm text-muted-foreground"
										>
											...
										</span>
									);
								}

								return (
									<Button
										key={pageNumber}
										variant={currentPage === pageNumber ? "default" : "outline"}
										className="hidden h-8 min-w-8 px-2 md:flex transition-colors duration-200"
										onClick={() => handlePageChange((pageNumber as number) - 1)}
									>
										<span className="sr-only">Go to page {pageNumber}</span>
										{pageNumber}
									</Button>
								);
							});
						})()}

						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pageIndex + 1)}
							disabled={!canNextPage}
						>
							<span className="sr-only">Go to next page</span>
							<ChevronRight className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => handlePageChange(totalPages - 1)}
							disabled={!canNextPage}
						>
							<span className="sr-only">Go to last page</span>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
