import { ROUTES } from "@/constants";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth-pages)/auth/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.LOGIN, replace: true });
  },
});
