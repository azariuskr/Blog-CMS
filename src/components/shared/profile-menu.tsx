import { Link } from "@tanstack/react-router";
import {
	User,
	FileText,
	Settings,
	LayoutDashboard,
	LogOut,
	BookMarked,
	Bookmark,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROUTES } from "@/constants";

interface ProfileMenuUser {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
}

interface ProfileMenuProps {
	user: ProfileMenuUser;
	canAccessAdmin?: boolean;
	trigger?: React.ReactNode;
}

export function ProfileMenu({ user, canAccessAdmin, trigger }: ProfileMenuProps) {
	const defaultTrigger = (
		<button
			type="button"
			className="h-10 w-10 rounded-full overflow-hidden border-2 border-carolina-blue"
		>
			<Avatar className="h-10 w-10">
				<AvatarImage src={user.image ?? undefined} alt={`${user.name ?? "User"}'s avatar`} />
				<AvatarFallback className="bg-prussian-blue text-alice-blue">
					{user.name?.charAt(0)?.toUpperCase() ?? "U"}
				</AvatarFallback>
			</Avatar>
		</button>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger {...{ asChild: true } as any}>
				{trigger ?? defaultTrigger}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56 bg-oxford-blue border-prussian-blue">
				<div className="px-3 py-2 border-b border-prussian-blue">
					<p className="text-sm font-medium text-columbia-blue">{user.name}</p>
					<p className="text-xs text-slate-gray">{user.email}</p>
				</div>

				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.ACCOUNT.PROFILE as string} className="flex items-center text-alice-blue cursor-pointer">
						<User className="mr-2 h-4 w-4" />
						Profile
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.ADMIN.BLOG.POSTS as string} className="flex items-center text-alice-blue cursor-pointer">
						<FileText className="mr-2 h-4 w-4" />
						My Posts
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.ACCOUNT.READING_LISTS as string} className="flex items-center text-alice-blue cursor-pointer">
						<BookMarked className="mr-2 h-4 w-4" />
						Reading Lists
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.ACCOUNT.TOPICS as string} className="flex items-center text-alice-blue cursor-pointer">
						<Bookmark className="mr-2 h-4 w-4" />
						Topics
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.ACCOUNT.BASE as string} className="flex items-center text-alice-blue cursor-pointer">
						<Settings className="mr-2 h-4 w-4" />
						Settings
					</Link>
				</DropdownMenuItem>

				{canAccessAdmin && (
					<>
						<DropdownMenuSeparator className="bg-prussian-blue" />
						<DropdownMenuItem {...{ asChild: true } as any}>
							<Link to={ROUTES.ADMIN.BASE as string} className="flex items-center text-alice-blue cursor-pointer">
								<LayoutDashboard className="mr-2 h-4 w-4" />
								Admin Dashboard
							</Link>
						</DropdownMenuItem>
					</>
				)}

				<DropdownMenuSeparator className="bg-prussian-blue" />
				<DropdownMenuItem {...{ asChild: true } as any}>
					<Link to={ROUTES.LOGOUT} className="flex items-center text-alice-blue cursor-pointer">
						<LogOut className="mr-2 h-4 w-4" />
						Sign Out
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
