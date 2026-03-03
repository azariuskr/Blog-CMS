import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/account")({
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <>
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Outlet />
      </div>
    </>
  );
}
