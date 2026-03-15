import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/auth-client";
import { uploadAvatar, deleteAvatar, AVATAR_QUERY_KEYS } from "@/lib/storage/avatar";

export function AvatarUploadCard() {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [progress, setProgress] = useState(0);

	const user = session?.user;
	const initials = (user?.name ?? user?.email ?? "U")
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image must be under 5 MB");
			return;
		}

		setUploading(true);
		setProgress(0);
		try {
			await uploadAvatar(file, ({ percentage }) => setProgress(percentage));
			await Promise.all(
				AVATAR_QUERY_KEYS.invalidate.map((key) =>
					queryClient.invalidateQueries({ queryKey: key }),
				),
			);
			toast.success("Avatar updated!");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			setProgress(0);
			// Reset input so same file can be re-selected
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleDelete() {
		if (!confirm("Remove your avatar?")) return;
		setDeleting(true);
		try {
			await deleteAvatar();
			await Promise.all(
				AVATAR_QUERY_KEYS.invalidate.map((key) =>
					queryClient.invalidateQueries({ queryKey: key }),
				),
			);
			toast.success("Avatar removed");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to remove avatar");
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="rounded-xl border border-border bg-card p-6">
			<h3 className="text-sm font-medium text-foreground mb-1">Profile Picture</h3>
			<p className="text-xs text-muted-foreground mb-4">
				JPG, PNG, or GIF · Max 5 MB · Resized to 256×256
			</p>
			<div className="flex items-center gap-4">
				<div className="relative">
					<Avatar className="w-16 h-16 border-2 border-border">
						<AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "Avatar"} />
						<AvatarFallback className="text-lg bg-muted text-muted-foreground">{initials}</AvatarFallback>
					</Avatar>
					{uploading && (
						<div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
							<span className="text-white text-xs font-bold">{progress}%</span>
						</div>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleFileChange}
						disabled={uploading || deleting}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={uploading || deleting}
						className="gap-1.5"
					>
						{uploading ? (
							<><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
						) : (
							<><Camera className="w-3.5 h-3.5" />Change photo</>
						)}
					</Button>
					{user?.image && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleDelete}
							disabled={uploading || deleting}
							className="gap-1.5 text-destructive hover:text-destructive"
						>
							{deleting ? (
								<><Loader2 className="w-3.5 h-3.5 animate-spin" />Removing…</>
							) : (
								<><Trash2 className="w-3.5 h-3.5" />Remove</>
							)}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
