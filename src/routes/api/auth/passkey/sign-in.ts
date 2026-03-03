import { createFileRoute } from "@tanstack/react-router";
import { generateAuthenticationOptions } from "@/lib/auth/passkey";

export const Route = createFileRoute("/api/auth/passkey/sign-in")({
	server: {
		handlers: {
			GET: ({ request }) => generateAuthenticationOptions(request),
			POST: ({ request }) => generateAuthenticationOptions(request),
		},
	},
});
