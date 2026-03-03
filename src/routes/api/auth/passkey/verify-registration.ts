import { createFileRoute } from "@tanstack/react-router";
import { verifyRegistration } from "@/lib/auth/passkey";

export const Route = createFileRoute("/api/auth/passkey/verify-registration")({
	server: {
		handlers: {
			POST: ({ request }) => verifyRegistration(request),
		},
	},
});
