import { Users } from "@/components/admin/users/users";
import type { UserFilters } from "@/lib/filters/schemas";

type Props = {
  search: UserFilters;
};

export function UsersView({ search }: Props) {
  return <Users search={search} />;
}
