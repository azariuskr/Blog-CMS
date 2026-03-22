import { createFileRoute } from "@tanstack/react-router";
import { VolumeX, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutedUsers, useToggleMute } from "@/lib/blog/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/(authenticated)/account/muted-users")({
	component: MutedUsersPage,
});

function MutedUsersPage() {
	const mutedQuery = useMutedUsers();
	const toggleMute = useToggleMute();
	const mutedUsers = (mutedQuery.data as any)?.ok ? ((mutedQuery.data as any).data as any[]) : [];

	const handleUnmute = async (mutedUserId: string, name: string) => {
		await toggleMute.mutateAsync(mutedUserId);
		toast.success(`Unmuted ${name}`);
	};

	return (
		<div className="min-h-screen bg-oxford-blue-2 text-shadow-blue px-4 py-10">
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-alice-blue flex items-center gap-2">
						<VolumeX className="h-6 w-6 text-carolina-blue" />
						Muted Authors
					</h1>
					<p className="text-sm text-slate-gray mt-1">
						Posts from muted authors are hidden from your feed.
					</p>
				</div>

				{mutedQuery.isLoading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-5 w-5 animate-spin text-carolina-blue" />
					</div>
				) : mutedUsers.length === 0 ? (
					<div className="py-12 text-center">
						<VolumeX className="h-10 w-10 text-prussian-blue mx-auto mb-3" />
						<p className="text-wild-blue-yonder">You haven't muted anyone yet.</p>
						<p className="text-sm text-slate-gray mt-1">
							Use the three-dot menu on post cards to mute an author.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{mutedUsers.map((item: any) => {
							const mutedUser = item.mutedUser ?? item;
							const name = mutedUser.authorProfile?.displayName ?? mutedUser.name ?? "Unknown";
							return (
								<div
									key={item.id ?? mutedUser.id}
									className="flex items-center gap-4 p-4 rounded-xl border border-prussian-blue/50 bg-oxford-blue hover:border-prussian-blue transition-colors"
								>
									<Avatar className="w-10 h-10 flex-shrink-0">
										<AvatarImage
											src={mutedUser.authorProfile?.avatarUrl ?? mutedUser.image ?? undefined}
											alt={name}
										/>
										<AvatarFallback className="bg-prussian-blue text-alice-blue text-sm">
											{name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-alice-blue truncate">{name}</p>
										{mutedUser.email && (
											<p className="text-xs text-slate-gray truncate">{mutedUser.email}</p>
										)}
									</div>
									<button
										type="button"
										onClick={() => handleUnmute(mutedUser.id, name)}
										disabled={toggleMute.isPending}
										className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md border border-prussian-blue text-wild-blue-yonder hover:border-carolina-blue hover:text-carolina-blue transition-colors disabled:opacity-50"
									>
										Unmute
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
