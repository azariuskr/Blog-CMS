import { Monitor, Smartphone, Loader2, Trash2, ShieldOff } from "lucide-react";
import { useUserSessions } from "@/lib/auth/queries";
import { useRevokeSession, useRevokeAllUserSessions } from "@/hooks/user-actions";
import { useOverlay, useOverlayStore } from "@/lib/store/overlay";
import { Button } from "@/components/ui/button";
import type { UserRowModel } from "@/types/user";

function deviceIcon(userAgent?: string | null) {
	if (!userAgent) return <Monitor className="h-4 w-4" />;
	const lower = userAgent.toLowerCase();
	if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
		return <Smartphone className="h-4 w-4" />;
	}
	return <Monitor className="h-4 w-4" />;
}

function formatSessionDate(date: string | Date | null | undefined) {
	if (!date) return "—";
	return new Date(date).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function UserSessionsSheet() {
	const { close } = useOverlay();
	const user = useOverlayStore((s) => s.data) as UserRowModel | null;
	const open = useOverlayStore((s) => s.id === "userSessions");

	const sessionsQuery = useUserSessions(user?.id ?? "");
	const revokeSession = useRevokeSession();
	const revokeAll = useRevokeAllUserSessions();

	const sessions = sessionsQuery.data?.ok ? ((sessionsQuery.data as any).data as any[]) ?? [] : [];

	if (!open || !user) return null;

	return (
		<div className="fixed inset-0 z-50 flex">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50"
				onClick={() => close()}
			/>
			{/* Panel */}
			<aside className="relative ml-auto w-full max-w-md bg-card border-l border-border flex flex-col h-full shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-border">
					<div>
						<h2 className="text-base font-semibold">Active Sessions</h2>
						<p className="text-xs text-muted-foreground mt-0.5">{user.name ?? user.email}</p>
					</div>
					<div className="flex items-center gap-2">
						{sessions.length > 1 && (
							<Button
								variant="outline"
								size="sm"
								disabled={revokeAll.isPending}
								onClick={() => revokeAll.mutate({ userId: user.id }, { onSuccess: () => sessionsQuery.refetch() })}
								className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
							>
								<ShieldOff className="h-3.5 w-3.5 mr-1" />
								Revoke All
							</Button>
						)}
						<button
							type="button"
							onClick={() => close()}
							className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none px-1"
						>
							×
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
					{sessionsQuery.isLoading && (
						<div className="flex items-center justify-center py-12 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							Loading sessions…
						</div>
					)}
					{!sessionsQuery.isLoading && sessions.length === 0 && (
						<p className="text-sm text-muted-foreground text-center py-8">No active sessions found.</p>
					)}
					{sessions.map((session: any) => (
						<div
							key={session.id}
							className="flex items-start justify-between gap-3 rounded-lg border border-border p-4 bg-muted/30"
						>
							<div className="flex items-start gap-3">
								<div className="mt-0.5 text-muted-foreground">
									{deviceIcon(session.userAgent)}
								</div>
								<div className="text-sm space-y-0.5">
									<p className="font-medium text-foreground truncate max-w-[220px]">
										{session.userAgent?.split(" ")[0] ?? "Unknown browser"}
									</p>
									<p className="text-xs text-muted-foreground">
										IP: {session.ipAddress ?? "—"}
									</p>
									<p className="text-xs text-muted-foreground">
										Expires: {formatSessionDate(session.expiresAt)}
									</p>
								</div>
							</div>
							<button
								type="button"
								disabled={revokeSession.isPending}
								onClick={() => revokeSession.mutate({ token: session.token }, { onSuccess: () => sessionsQuery.refetch() })}
								className="mt-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
								title="Revoke session"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			</aside>
		</div>
	);
}
