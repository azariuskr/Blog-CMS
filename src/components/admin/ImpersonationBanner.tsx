import { AlertTriangle } from "lucide-react";
import { useSession } from "@/hooks/auth-hooks";
import { useStopImpersonation } from "@/hooks/user-actions";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/constants";

export function ImpersonationBanner() {
	const { data: session } = useSession();
	const isImpersonating = Boolean(
		(session as any)?.session?.impersonatedBy,
	);
	const stopMutation = useStopImpersonation();
	const navigate = useNavigate();

	if (!isImpersonating) return null;

	const impersonatedName = (session?.user as any)?.name ?? (session?.user as any)?.email ?? "a user";

	async function handleStop() {
		const result = await stopMutation.mutateAsync();
		if (result?.ok) {
			navigate({ to: ROUTES.ADMIN.USERS as string });
		}
	}

	return (
		<div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-4 z-50">
			<div className="flex items-center gap-2 text-amber-400 text-sm">
				<AlertTriangle className="h-4 w-4 flex-shrink-0" />
				<span>
					You are impersonating <strong>{impersonatedName}</strong> — actions will be performed as this user.
				</span>
			</div>
			<button
				type="button"
				onClick={handleStop}
				disabled={stopMutation.isPending}
				className="text-xs px-3 py-1 rounded-md border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
			>
				{stopMutation.isPending ? "Stopping…" : "Stop Impersonating"}
			</button>
		</div>
	);
}
