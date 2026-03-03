import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth-pages)/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/$authView", params: { authView: "signup" }, replace: true });
  },
});
