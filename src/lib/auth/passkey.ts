/**
 * Passkey Service
 *
 * Handles passkey-related operations by forwarding requests to Better Auth's
 * passkey plugin endpoints. This service layer keeps route files clean and
 * centralizes passkey logic.
 */

import { auth } from "./auth";
import { forwardSetCookies } from "./server";

// ============================================================================
// Types
// ============================================================================

export interface AddPasskeyOptions {
	name?: string;
	authenticatorAttachment?: "platform" | "cross-platform";
}

export interface VerifyRegistrationBody {
	response?: {
		response?: {
			transports?: string[];
		};
	};
	name?: string;
}

// ============================================================================
// Passkey Registration
// ============================================================================

/**
 * Generate passkey registration options
 * Rewrites the request to Better Auth's generate-register-options endpoint
 */
export async function generateRegistrationOptions(
	request: Request,
	options?: AddPasskeyOptions,
): Promise<Response> {
	const url = new URL(request.url);
	url.pathname = "/api/auth/passkey/generate-register-options";

	if (options?.name) {
		url.searchParams.set("name", options.name);
	}
	if (options?.authenticatorAttachment) {
		url.searchParams.set(
			"authenticatorAttachment",
			options.authenticatorAttachment,
		);
	}

	const response = await auth.handler(
		new Request(url, { method: "GET", headers: request.headers }),
	);
	forwardSetCookies(response.headers);
	return response;
}

/**
 * Parse add-passkey request body and generate registration options
 */
export async function handleAddPasskey(request: Request): Promise<Response> {
	let options: AddPasskeyOptions | undefined;

	if (request.method !== "GET" && request.method !== "HEAD") {
		const text = await request.text().catch(() => "");
		if (text) {
			try {
				const body = JSON.parse(text) as AddPasskeyOptions;
				options = {
					name: body?.name,
					authenticatorAttachment: body?.authenticatorAttachment,
				};
			} catch {
				// ignore non-JSON bodies
			}
		}
	}

	return generateRegistrationOptions(request, options);
}

/**
 * Verify passkey registration
 * Handles the case where transports array might be missing
 */
export async function verifyRegistration(request: Request): Promise<Response> {
	let body: VerifyRegistrationBody | null = null;

	try {
		body = (await request.json()) as VerifyRegistrationBody;
	} catch {
		// Fall back to the upstream handler; it will return a structured error
		const response = await auth.handler(request);
		forwardSetCookies(response.headers);
		return response;
	}

	// Some WebAuthn implementations omit `transports` on the registration response.
	// @better-auth/passkey assumes it exists, so we default to empty array
	if (body?.response?.response && !Array.isArray(body.response.response.transports)) {
		body.response.response.transports = [];
	}

	const url = new URL(request.url);
	const headers = new Headers(request.headers);
	headers.set("content-type", "application/json");

	const response = await auth.handler(
		new Request(url, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		}),
	);
	forwardSetCookies(response.headers);
	return response;
}

// ============================================================================
// Passkey Authentication
// ============================================================================

/**
 * Generate passkey authentication options for sign-in
 */
export async function generateAuthenticationOptions(
	request: Request,
): Promise<Response> {
	const url = new URL(request.url);
	url.pathname = "/api/auth/passkey/generate-authenticate-options";

	const response = await auth.handler(
		new Request(url, { method: "GET", headers: request.headers }),
	);
	forwardSetCookies(response.headers);
	return response;
}
