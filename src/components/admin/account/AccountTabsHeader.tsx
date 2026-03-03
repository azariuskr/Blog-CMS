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
	onTabChange: (path: string) => void;
};

export function AccountTabsHeader({ tabs, onTabChange }: Props) {
	return (
		<TabsList>
			{tabs.map((tab) => {
				const Icon = tab.icon;
				return (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						onClick={() => onTabChange(tab.path)}
					>
						<Icon className="mr-2 h-4 w-4" />
						{tab.label}
					</TabsTrigger>
				);
			})}
		</TabsList>
	);
}
