import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useLayout } from "@/lib/store/layout";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { CommandPalette } from "@/components/admin/CommandPalette";

interface AppLayoutProps {
	children: React.ReactNode;
}

function useMounted() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	return mounted;
}

export function AppLayout({ children }: AppLayoutProps) {
	const mounted = useMounted();
	const layout = useLayout();

	return (
		<SidebarProvider
			open={mounted ? layout.sidebarOpen : true}
			onOpenChange={layout.setSidebarOpen}
			openMobile={mounted ? layout.mobileSidebarOpen : false}
			onOpenMobileChange={layout.setMobileSidebarOpen}
		>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<ImpersonationBanner />
				<main className="flex-1 overflow-auto">{children}</main>
			</SidebarInset>
			<CommandPalette />
		</SidebarProvider>
	);
}
