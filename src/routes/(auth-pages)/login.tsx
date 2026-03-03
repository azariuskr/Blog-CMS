import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth-pages)/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/$authView", params: { authView: "login" }, replace: true });
  },
});
