import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/admin/blog/posts/new")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.EDITOR.NEW as string, replace: true });
  },
});
