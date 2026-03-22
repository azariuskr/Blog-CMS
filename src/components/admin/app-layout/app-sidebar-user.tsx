import { Link } from "@tanstack/react-router";
import {
	BadgeCheck,
	ChevronsUpDown,
	CreditCard,
	FileText,
	Globe,
	KeyRound,
	Shield,
	Sparkles,
	UserCircle,
} from "lucide-react";
import * as React from "react";
import { SignOutMenuItem } from "@/components/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { ACCOUNT_VIEWS, getAccountRoute, ROUTES } from "@/constants";
import { useCanAccessRoute, useUser } from "@/hooks/auth-hooks";
import { useBilling, useBillingPortal, useUpgrade } from "@/hooks/use-billing";

function useMounted() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	return mounted;
}

export function AppSidebarUser() {
	const { isMobile } = useSidebar();
	const user = useUser();
	const mounted = useMounted();

	// Billing hooks
	const { isBillingEnabled, hasSubscription, currentPlan } = useBilling();
	const { upgrade, isUpgrading } = useUpgrade();
	const { openPortal, isOpening } = useBillingPortal();
	const canAccessRbac = useCanAccessRoute(ROUTES.ADMIN.RBAC.BASE);

	// Use SSR-stable placeholders until after hydration
	const safeUser = mounted ? user : null;

	// Show upgrade button only if billing enabled and user doesn't have paid subscription
	const showUpgrade =
		mounted &&
		isBillingEnabled &&
		(!hasSubscription || currentPlan?.id === "free");
	const showManageBilling =
		mounted &&
		isBillingEnabled &&
		hasSubscription &&
		currentPlan?.id !== "free";

	const initials = safeUser?.name
		? safeUser.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: (safeUser?.email?.slice(0, 2).toUpperCase() ?? "U");

	const triggerDisabled = !mounted || !safeUser;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								disabled={triggerDisabled}
							>
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={safeUser?.image ?? undefined}
										alt={safeUser?.name ?? ""}
									/>
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>

								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{safeUser?.name ?? "Loading…"}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{safeUser?.email ?? ""}
									</span>
								</div>

								<ChevronsUpDown className="ml-auto size-4" />
							</SidebarMenuButton>
						}
					/>

					{safeUser ? (
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuGroup>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage
												src={safeUser.image ?? undefined}
												alt={safeUser.name ?? ""}
											/>
											<AvatarFallback className="rounded-lg">
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">
												{safeUser.name ?? "User"}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{safeUser.email}
											</span>
										</div>
									</div>
								</DropdownMenuLabel>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />

							{(showUpgrade || showManageBilling) && (
								<>
									<DropdownMenuGroup>
										{showUpgrade && (
											<DropdownMenuItem
												onClick={() => upgrade("pro", "month")}
												disabled={isUpgrading}
											>
												<Sparkles className="mr-2 size-4" />
												{isUpgrading ? "Loading..." : "Upgrade to Pro"}
											</DropdownMenuItem>
										)}
										{showManageBilling && (
											<DropdownMenuItem
												onClick={openPortal}
												disabled={isOpening}
											>
												<CreditCard className="mr-2 size-4" />
												{isOpening ? "Opening..." : "Manage Billing"}
											</DropdownMenuItem>
										)}
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
								</>
							)}

							<DropdownMenuGroup>
								<Link to={ROUTES.ADMIN.BLOG.POSTS as string}>
									<DropdownMenuItem>
										<FileText className="mr-2 size-4" />
										My Posts
									</DropdownMenuItem>
								</Link>
								<Link to={"/" as string}>
									<DropdownMenuItem>
										<Globe className="mr-2 size-4" />
										View Blog
									</DropdownMenuItem>
								</Link>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<Link to={getAccountRoute(ACCOUNT_VIEWS.SETTINGS)}>
									<DropdownMenuItem>
										<UserCircle className="mr-2 size-4" />
										Account
									</DropdownMenuItem>
								</Link>
								<Link to={getAccountRoute(ACCOUNT_VIEWS.SECURITY)}>
									<DropdownMenuItem>
										<Shield className="mr-2 size-4" />
										Security
									</DropdownMenuItem>
								</Link>
								<Link to={getAccountRoute(ACCOUNT_VIEWS.SESSIONS)}>
									<DropdownMenuItem>
										<BadgeCheck className="mr-2 size-4" />
										Sessions
									</DropdownMenuItem>
								</Link>
								{canAccessRbac && (
									<Link to={ROUTES.ADMIN.RBAC.BASE as string}>
										<DropdownMenuItem>
											<KeyRound className="mr-2 size-4" />
											Access Control
										</DropdownMenuItem>
									</Link>
								)}
							</DropdownMenuGroup>

							<DropdownMenuSeparator />

							<SignOutMenuItem />
						</DropdownMenuContent>
					) : null}
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
