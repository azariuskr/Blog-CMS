import { useAsyncBatcher } from "@tanstack/react-pacer";
import type { Row, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type ComponentType,
	type KeyboardEvent,
	type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BaseConfirmDialog } from "@/components/shared/base/base-confirm-dialog";

export type BulkOperation<TData, TVariables> = {
	label: string;
	icon?: ComponentType<{ className?: string }>;
	variant?: "default" | "outline" | "destructive";
	getItemData: (row: Row<TData>) => TVariables;
	execute: (vars: TVariables) => Promise<any>;
	onComplete?: (summary: { successCount: number; failureCount: number }) => void;
	/** If true, shows a confirmation dialog before executing */
	requireConfirmation?: boolean;
	/** Custom confirmation message. Defaults to "Are you sure you want to {label} {count} {entityName}(s)?" */
	confirmationMessage?: string;
};

type BulkBatchOptions = {
	enabled: boolean;
	batchSize?: number;
	delayMs?: number;
};

type DataTableBulkActionsProps<TData, TVariables = any> = {
	table: Table<TData>;
	entityName: string;
	selectedCount?: number;
	// Render multiple operations instead of custom children
	operations?: BulkOperation<TData, TVariables>[];
	// Legacy: render children as before (for backward compatibility)
	children?: ReactNode;
	// Global callback when all operations complete
	onAllComplete?: () => void;
	// Disable interactions while processing
	disabled?: boolean;
	// Optional batching for operations (reduces server load)
	batchOptions?: BulkBatchOptions;
};

/**
 * Enhanced bulk actions toolbar with operation array support
 * Can operate in two modes:
 * 1. Legacy mode: passes `children` prop for custom rendering
 * 2. Operations mode: accepts `operations` array for standard buttons
 */
export function DataTableBulkActions<TData, TVariables = any>({
	table,
	entityName,
	selectedCount,
	operations = [],
	children,
	onAllComplete,
	disabled = false,
	batchOptions,
}: DataTableBulkActionsProps<TData, TVariables>): ReactNode | null {
	const effectiveSelectedCount =
		selectedCount ?? table.getFilteredSelectedRowModel().rows.length;
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [announcement, setAnnouncement] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const currentExecuteRef = useRef<((vars: TVariables) => Promise<any>) | null>(
		null,
	);

	// Confirmation dialog state
	const [confirmDialog, setConfirmDialog] = useState<{
		open: boolean;
		operationIndex: number;
		message: string;
		variant: "default" | "destructive";
	}>({ open: false, operationIndex: -1, message: "", variant: "default" });

	const asyncBatcher = useAsyncBatcher(
		async (items: TVariables[]) => {
			const execute = currentExecuteRef.current;
			if (!execute) return [];
			return Promise.allSettled(items.map((vars) => execute(vars)));
		},
		{
			maxSize: batchOptions?.batchSize ?? 5,
			started: false,
		},
	);

	// Announce selection changes to screen readers
	useEffect(() => {
		if (effectiveSelectedCount > 0) {
			const message = `${effectiveSelectedCount} ${entityName}${effectiveSelectedCount > 1 ? "s" : ""} selected. Bulk actions toolbar is available.`;

			// Use queueMicrotask to defer state update and avoid cascading renders
			queueMicrotask(() => {
				setAnnouncement(message);
			});

			// Clear announcement after a delay
			const timer = setTimeout(() => setAnnouncement(""), 3000);
			return () => clearTimeout(timer);
		}
	}, [effectiveSelectedCount, entityName]);

	const handleClearSelection = () => {
		if (isProcessing) return; // Prevent clearing during operations
		table.resetRowSelection();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (isProcessing) return; // Disable keyboard during operations

		const buttons = toolbarRef.current?.querySelectorAll("button");
		if (!buttons) return;

		const currentIndex = Array.from(buttons).findIndex(
			(button) => button === document.activeElement,
		);

		switch (event.key) {
			case "ArrowRight": {
				event.preventDefault();
				const nextIndex = (currentIndex + 1) % buttons.length;
				buttons[nextIndex]?.focus();
				break;
			}
			case "ArrowLeft": {
				event.preventDefault();
				const prevIndex =
					currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
				buttons[prevIndex]?.focus();
				break;
			}
			case "Home":
				event.preventDefault();
				buttons[0]?.focus();
				break;
			case "End":
				event.preventDefault();
				buttons[buttons.length - 1]?.focus();
				break;
			case "Escape": {
				// Check if the Escape key came from a dropdown trigger or content
				// We can't check dropdown state because Radix UI closes it before our handler runs
				const target = event.target as HTMLElement;
				const activeElement = document.activeElement as HTMLElement;

				// Check if the event target or currently focused element is a dropdown trigger
				const isFromDropdownTrigger =
					target?.getAttribute("data-slot") === "dropdown-menu-trigger" ||
					activeElement?.getAttribute("data-slot") ===
					"dropdown-menu-trigger" ||
					target?.closest('[data-slot="dropdown-menu-trigger"]') ||
					activeElement?.closest('[data-slot="dropdown-menu-trigger"]');

				// Check if the focused element is inside dropdown content (which is portaled)
				const isFromDropdownContent =
					activeElement?.closest('[data-slot="dropdown-menu-content"]') ||
					target?.closest('[data-slot="dropdown-menu-content"]');

				if (isFromDropdownTrigger || isFromDropdownContent) {
					// Escape was meant for the dropdown - don't clear selection
					return;
				}

				// Escape was meant for the toolbar - clear selection
				event.preventDefault();
				handleClearSelection();
				break;
			}
		}
	};

	// Handle bulk operation click - shows confirmation if needed, otherwise executes
	const handleBulkOperationClick = (operationIndex: number) => {
		if (isProcessing || disabled) return;

		const operation = operations[operationIndex];
		if (!operation) return;

		if (operation.requireConfirmation) {
			const plural = effectiveSelectedCount > 1 ? "s" : "";
			const defaultMessage = `Are you sure you want to ${operation.label.toLowerCase()} ${effectiveSelectedCount} ${entityName}${plural}?`;
			setConfirmDialog({
				open: true,
				operationIndex,
				message: operation.confirmationMessage ?? defaultMessage,
				variant: operation.variant === "destructive" ? "destructive" : "default",
			});
		} else {
			void executeBulkOperation(operationIndex);
		}
	};

	// Execute bulk operation (after confirmation if needed)
	const executeBulkOperation = async (operationIndex: number) => {
		const operation = operations[operationIndex];
		if (!operation) return;

		setIsProcessing(true);

		const selectedRows = table.getFilteredSelectedRowModel().rows;
		const selectedItems = selectedRows.map((row) => operation.getItemData(row));

		try {
			let successCount = 0;
			let failureCount = 0;

			if (batchOptions?.enabled) {
				currentExecuteRef.current = operation.execute;
				for (const item of selectedItems) {
					asyncBatcher.addItem(item);
				}

				while (asyncBatcher.store.state.size > 0) {
					const results = await asyncBatcher.flush();
					for (const result of results) {
						if (result.status === "fulfilled") successCount++;
						else failureCount++;
					}

					if ((batchOptions.delayMs ?? 0) > 0 && asyncBatcher.store.state.size) {
						await new Promise((resolve) =>
							setTimeout(resolve, batchOptions.delayMs),
						);
					}
				}
			} else {
				const results = await Promise.allSettled(
					selectedItems.map((vars) => operation.execute(vars)),
				);
				for (const result of results) {
					if (result.status === "fulfilled") successCount++;
					else failureCount++;
				}
			}

			// Reset selection on success
			table.resetRowSelection();
			operation.onComplete?.({ successCount, failureCount });
			onAllComplete?.();
		} catch (error) {
			console.error(`Bulk operation "${operation.label}" failed:`, error);
		} finally {
			currentExecuteRef.current = null;
			setIsProcessing(false);
		}
	};

	// Handle confirmation dialog confirm
	const handleConfirmOperation = () => {
		const { operationIndex } = confirmDialog;
		setConfirmDialog({ open: false, operationIndex: -1, message: "", variant: "default" });
		void executeBulkOperation(operationIndex);
	};

	if (effectiveSelectedCount === 0) {
		return null;
	}

	// Determine which mode to render
	const useLegacyMode = children !== undefined;
	const useOperationsMode = operations.length > 0 && !useLegacyMode;

	return (
		<>
			{/* Live region for screen reader announcements */}
			<div
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
				role="status"
			>
				{announcement}
			</div>

			<div
				ref={toolbarRef}
				role="toolbar"
				aria-label={`Bulk actions for ${effectiveSelectedCount} selected ${entityName}${effectiveSelectedCount > 1 ? "s" : ""}`}
				aria-describedby="bulk-actions-description"
				tabIndex={-1}
				onKeyDown={handleKeyDown}
				className={cn(
					"fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl",
					"transition-all delay-100 duration-300 ease-out hover:scale-105",
					"focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
					isProcessing && "opacity-50 cursor-not-allowed",
				)}
			>
				<div
					className={cn(
						"p-2 shadow-xl",
						"rounded-xl border",
						"bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60",
						"flex items-center gap-x-2",
					)}
				>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									onClick={handleClearSelection}
									className="size-6 rounded-full"
									aria-label="Clear selection"
									title="Clear selection (Escape)"
									disabled={isProcessing}
								>
									<X />
									<span className="sr-only">Clear selection</span>
								</Button>
							}
						></TooltipTrigger>
						<TooltipContent>
							<p>Clear selection (Escape)</p>
						</TooltipContent>
					</Tooltip>

					<Separator
						className="h-5"
						orientation="vertical"
						aria-hidden="true"
					/>

					<div
						className="flex items-center gap-x-1 text-sm"
						id="bulk-actions-description"
					>
						<Badge
							variant="default"
							className="min-w-8 rounded-lg"
							aria-label={`${effectiveSelectedCount} selected`}
						>
							{effectiveSelectedCount}
						</Badge>{" "}
						<span className="hidden sm:inline">
							{entityName}
							{effectiveSelectedCount > 1 ? "s" : ""}
						</span>{" "}
						selected
						{isProcessing && (
							<span className="ml-2 text-xs text-muted-foreground">
								(processing...)
							</span>
						)}
					</div>

					<Separator
						className="h-5"
						orientation="vertical"
						aria-hidden="true"
					/>

					{/* Render based on mode */}
					{useLegacyMode
						? children
						: useOperationsMode
							? operations.map((operation, index) => (
								<Tooltip key={index}>
									<TooltipTrigger
										render={
											<Button
												variant={operation.variant || "outline"}
												size="icon"
												disabled={
													isProcessing || disabled || effectiveSelectedCount === 0
												}
												onClick={() => handleBulkOperationClick(index)}
												className="size-6"
												aria-label={`${operation.label} selected`}
												title={`${operation.label} selected`}
											>
												{operation.icon && (
													<operation.icon className="h-4 w-4" />
												)}
												<span className="sr-only">{operation.label}</span>
											</Button>
										}
									></TooltipTrigger>
									<TooltipContent>
										<p>{operation.label}</p>
									</TooltipContent>
								</Tooltip>
							))
							: null}
				</div>
			</div>

			{/* Confirmation Dialog */}
			<BaseConfirmDialog
				open={confirmDialog.open}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmDialog({ open: false, operationIndex: -1, message: "", variant: "default" });
					}
				}}
				title="Confirm Action"
				description={confirmDialog.message}
				onConfirm={handleConfirmOperation}
				confirmLabel="Confirm"
				variant={confirmDialog.variant}
				isLoading={isProcessing}
			/>
		</>
	);
}
