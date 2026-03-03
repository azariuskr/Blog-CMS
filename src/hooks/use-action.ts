import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { HttpError, Result } from "@/lib/result";
import type { ValidationError } from "@/lib/validation";
import { isValidationError } from "@/lib/validation";

export interface UseActionOptions<TData, TVariables> {
	mutationKey?: readonly unknown[];
	invalidate?: readonly (readonly unknown[])[];
	optimisticUpdate?: (vars: TVariables) => void;
	rollback?: () => void;
	onSuccess?: (data: TData) => void | Promise<void>;
	onError?: (error: unknown) => void | Promise<void>;
	onValidationError?: (
		errors: ValidationError["errors"],
	) => void | Promise<void>;
	showToast?: boolean;
	retry?: boolean;
}

type ActionFn<TVariables, TData> = (
	vars: TVariables,
) => Promise<Result<TData, ValidationError | HttpError>>;

/**
 * Unified hook for handling server actions with proper error handling, validation, and cache invalidation.
 * Supports both direct action functions and server functions.
 */
export function useAction<TData = void, TVariables = void>(
	action: ActionFn<TVariables, TData>,
	options?: UseActionOptions<TData, TVariables>,
) {
	const qc = useQueryClient();

	return useMutation<
		Result<TData, ValidationError | HttpError>,
		Error,
		TVariables
	>({
		mutationKey: options?.mutationKey as unknown[],
		mutationFn: (vars: TVariables) => action(vars),
		retry: options?.retry ?? false,
		onMutate: async (vars) => {
			if (options?.optimisticUpdate) {
				await qc.cancelQueries();
				options.optimisticUpdate(vars);
			}
		},
		onError: async (err) => {
			options?.rollback?.();
			if (options?.showToast !== false) {
				toast.error("An unexpected error occurred");
			}
			await options?.onError?.(err);
		},
		onSuccess: async (result) => {
			if (!result.ok) {
				options?.rollback?.();
				if (isValidationError(result.error)) {
					await options?.onValidationError?.(result.error.errors);
					if (options?.showToast !== false) {
						const firstError = Object.values(result.error.errors)[0]?.[0];
						if (firstError) toast.error(firstError);
					}
				} else {
					if (options?.showToast !== false) {
						toast.error(result.message ?? result.error.message);
					}
				}
				await options?.onError?.(result.error);
				return;
			}

			if (result.message && options?.showToast !== false) {
				toast.success(result.message);
			}

			await options?.onSuccess?.(result.data);

			if (options?.invalidate?.length) {
				await Promise.all(
					options.invalidate.map((key) =>
						qc.invalidateQueries({
							queryKey: key as unknown[],
							exact: false,
						}),
					),
				);
			}
		},
	});
}

/**
 * Specialized hook for form actions that automatically handles validation errors
 * by setting them on the form via setErrors callback.
 */
export function useFormAction<TData = void, TVariables = void>(
	action: ActionFn<TVariables, TData>,
	options?: Omit<UseActionOptions<TData, TVariables>, "onValidationError"> & {
		setErrors?: (errors: Record<string, string[]>) => void;
	},
) {
	return useAction<TData, TVariables>(action, {
		...options,
		onValidationError: options?.setErrors,
	});
}

/**
 * Adapter to wrap server functions that expect { data: TInput } into the standard action format.
 * This allows using server functions directly with useAction.
 */
export function fromServerFn<TInput, TReturn>(
	serverFn: (opts: { data: TInput }) => Promise<Result<TReturn, HttpError>>,
	options?: {
		successMessage?: string;
		errorMessage?: string;
	},
): ActionFn<TInput, TReturn> {
	return async (vars: TInput) => {
		try {
			const result = await serverFn({ data: vars });
			if (result.ok && options?.successMessage && !result.message) {
				return { ...result, message: options.successMessage };
			}
			if (!result.ok && options?.errorMessage && !result.message) {
				return { ...result, message: options.errorMessage };
			}
			return result;
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: (options?.errorMessage ?? "Action failed");
			return {
				ok: false,
				error: { status: 500, message },
				message,
			};
		}
	};
}

/**
 * Simplified adapter for basic async functions that don't return Result types.
 * Wraps them in proper Result handling.
 */
export async function toAction<T>(
	fn: () => Promise<T>,
	options?: {
		successMessage?: string;
		errorMessage?: string;
	},
): Promise<Result<T, HttpError>> {
	try {
		const data = await fn();
		return {
			ok: true,
			data,
			message: options?.successMessage,
		};
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: (options?.errorMessage ?? "Action failed");
		return {
			ok: false,
			error: { status: 500, message },
			message,
		};
	}
}
