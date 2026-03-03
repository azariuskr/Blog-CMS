import { createFileRoute } from "@tanstack/react-router";
import { handleAddPasskey } from "@/lib/auth/passkey";

export const Route = createFileRoute("/api/auth/passkey/add-passkey")({
	server: {
		handlers: {
			GET: ({ request }) => handleAddPasskey(request),
			POST: ({ request }) => handleAddPasskey(request),
		},
	},
});
