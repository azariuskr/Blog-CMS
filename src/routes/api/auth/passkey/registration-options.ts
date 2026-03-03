import { createFileRoute } from "@tanstack/react-router";
import { generateRegistrationOptions } from "@/lib/auth/passkey";

export const Route = createFileRoute("/api/auth/passkey/registration-options")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Parse options from request body
				let options: { name?: string; authenticatorAttachment?: "platform" | "cross-platform" } | undefined;

				const text = await request.text().catch(() => "");
				if (text) {
					try {
						const body = JSON.parse(text);
						options = {
							name: body?.name,
							authenticatorAttachment: body?.authenticatorAttachment,
						};
					} catch {
						// ignore non-JSON
					}
				}

				return generateRegistrationOptions(request, options);
			},
		},
	},
});
