import type { LucideIcon } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = {
	id: string;
	label: string;
	icon: LucideIcon;
	path: string;
};

type Props = {
	tabs: readonly Tab[];
};

export function AccountTabsHeader({ tabs }: Props) {
	return (
		<TabsList>
			{tabs.map((tab) => {
				const Icon = tab.icon;
				return (
					<TabsTrigger key={tab.id} value={tab.id}>
						<Icon className="mr-2 h-4 w-4" />
						{tab.label}
					</TabsTrigger>
				);
			})}
		</TabsList>
	);
}
