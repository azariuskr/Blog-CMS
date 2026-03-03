import { createFileRoute } from "@tanstack/react-router";
import { UsersView } from "@/components/admin/app-views";
import { UserFiltersSchema } from "@/lib/filters/schemas";

export const Route = createFileRoute("/(authenticated)/admin/users")({
  validateSearch: (search) => UserFiltersSchema.parse(search),
  component: UsersPage,
});

function UsersPage() {
  const search = Route.useSearch();
  return <UsersView search={search} />;
}
