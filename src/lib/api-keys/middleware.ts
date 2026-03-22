import type { ApiKey } from "@/lib/db/schema";
import type { Result } from "@/lib/result";
import { Ok } from "@/lib/result";
import { resolveKeyFromRequest, validateApiKey, updateLastUsed } from "./service";
import { checkRateLimit, rateLimitHeaders } from "./rate-limit";

interface AuthenticatedApiRequest {
	apiKey: ApiKey & { siteName: string };
	rateLimit: Record<string, string>;
}

export async function authenticateApiRequest(
	request: Request,
): Promise<Result<AuthenticatedApiRequest>> {
	// 1. Extract Bearer token
	const rawResult = resolveKeyFromRequest(request);
	if (!rawResult.ok) return rawResult;

	// 2. Validate key (hash lookup, check revoked/expired)
	const keyResult = await validateApiKey(rawResult.data);
	if (!keyResult.ok) return keyResult;

	const apiKey = keyResult.data;

	// 3. Rate limit check
	const rateResult = await checkRateLimit(apiKey.id, apiKey.rateLimitRpm);
	if (!rateResult.ok) return rateResult;

	// 4. CORS origin check
	if (apiKey.allowedOrigins && apiKey.allowedOrigins.length > 0) {
		const origin = request.headers.get("Origin");
		if (origin && !apiKey.allowedOrigins.includes(origin)) {
			return {
				ok: false,
				error: { status: 403, message: `Origin ${origin} not allowed` },
			};
		}
	}

	// 5. Fire-and-forget last used update
	updateLastUsed(apiKey.id);

	return Ok({
		apiKey,
		rateLimit: rateLimitHeaders(rateResult.data),
	});
}

export function apiJsonResponse(
	data: unknown,
	status = 200,
	extraHeaders?: Record<string, string>,
): Response {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
		...extraHeaders,
	};

	return new Response(JSON.stringify(data), { status, headers });
}

export function apiErrorResponse(result: { ok: false; error: { status: number; message: string } }): Response {
	return apiJsonResponse(
		{ error: result.error.message },
		result.error.status,
		{ "Cache-Control": "no-store" },
	);
}

export function corsHeaders(
	request: Request,
	allowedOrigins: string[] | null,
): Record<string, string> {
	const origin = request.headers.get("Origin") ?? "*";
	const allowed = !allowedOrigins || allowedOrigins.length === 0
		? "*"
		: allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

	return {
		"Access-Control-Allow-Origin": allowed,
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
		"Access-Control-Max-Age": "86400",
	};
}
