import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth-pages)/logout")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/$authView", params: { authView: "logout" }, replace: true });
  },
});
