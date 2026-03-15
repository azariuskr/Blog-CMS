import { createFileRoute, Outlet } from "@tanstack/react-router";

// Editor routes render full-page (no admin AppLayout sidebar)
export const Route = createFileRoute("/(authenticated)/editor")({
	component: () => <Outlet />,
});
