export type Result<T, E = HttpError> =
    | { ok: true; data: T; message?: string }
    | { ok: false; error: E; message?: string };

export interface HttpError {
    status: number;
    message: string;
    details?: Record<string, any>;
}

export const Ok = <T>(data: T, message?: string): Result<T, never> => ({
    ok: true,
    data,
    message,
});

export const Err = <E>(error: E, message?: string): Result<never, E> => ({
    ok: false,
    error,
    message,
});

export const notFound = (message = "Resource not found"): Result<never, HttpError> =>
    Err({ status: 404, message });

export const forbidden = (message = "Access forbidden"): Result<never, HttpError> =>
    Err({ status: 403, message }, message);

export const unauthorized = (message = "Unauthorized access"): Result<never, HttpError> =>
    Err({ status: 401, message }, message);

export const badRequest = (message = "Bad request"): Result<never, HttpError> =>
    Err({ status: 400, message }, message);

export const serverError = (message = "Internal server error", details?: Record<string, any>): Result<never, HttpError> =>
    Err({ status: 500, message, details });

export async function safe<T>(
    fn: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
): Promise<Result<T, HttpError>> {
    try {
        const data = await fn();
        return Ok(data, options?.successMessage);
    } catch (err) {
        if (isHttpError(err)) {
            return Err(err, err.message);
        }
        const message = err instanceof Error ? err.message : (options?.errorMessage ?? "Operation failed");
        return serverError(message, { error: err });
    }
}

export function unwrap<T, E>(result: Result<T, E>): T {
    if (!result.ok) {
        throw result.error;
    }
    return result.data;
}

export function isHttpError(error: unknown): error is HttpError {
    return (
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        "message" in error &&
        typeof (error as HttpError).status === "number" &&
        typeof (error as HttpError).message === "string"
    );
}
