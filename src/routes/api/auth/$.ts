import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/auth";
import { forwardSetCookies } from "@/lib/auth/server";

async function handleAuthRequest(request: Request): Promise<Response> {
  const response = await auth.handler(request);
  forwardSetCookies(response.headers);

  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
    },
  },
});
