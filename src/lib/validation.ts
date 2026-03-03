import { z } from "zod";
import type { Result } from "./result";
import { Err, Ok } from "./result";

/**
 * UUID-format string that accepts any hex UUID (not just RFC 4122 v1-v5).
 * Needed because seed data uses non-standard version/variant bits.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const zId = z.string().regex(UUID_REGEX, "Invalid identifier");

export interface ValidationError {
    status: 400;
    message: string;
    errors: Record<string, string[]>;
}

export const validationError = (errors: z.ZodError): Result<never, ValidationError> =>
    Err({
        status: 400,
        message: "Validation failed",
        errors: Object.fromEntries(
            errors.issues.map((issue) => [issue.path.join("."), [issue.message]])
        ) as Record<string, string[]>,
    });

export function validate<T>(schema: z.ZodType<T>, data: unknown): Result<T, ValidationError> {
    const result = schema.safeParse(data);
    if (!result.success) {
        return validationError(result.error);
    }
    return Ok(result.data);
}

export function zodValidator<T>(schema: z.ZodType<T>) {
    return {
        validate: ({ value }: { value: T }) => {
            const result = schema.safeParse(value);
            if (!result.success) {
                return result.error.issues[0]?.message || "Invalid value";
            }
            return undefined;
        },
        validateAsync: async ({ value }: { value: T }) => {
            const result = await schema.safeParseAsync(value);
            if (!result.success) {
                return result.error.issues[0]?.message || "Invalid value";
            }
            return undefined;
        },
    };
}

export function isValidationError(error: unknown): error is ValidationError {
    return (
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        "errors" in error &&
        (error as ValidationError).status === 400 &&
        typeof (error as ValidationError).errors === "object"
    );
}
