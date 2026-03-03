import { Camera, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { useAvatar } from "@/hooks/use-file-upload";
import { unwrap } from "@/lib/result";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
	currentAvatar?: string | null;
	userName?: string;
	size?: "sm" | "md" | "lg" | "xl";
	onUploadSuccess?: (url: string) => void;
	className?: string;
}

const sizeClasses = {
	sm: "h-12 w-12",
	md: "h-16 w-16",
	lg: "h-24 w-24",
	xl: "h-32 w-32",
};

const iconSizes = {
	sm: "h-3 w-3",
	md: "h-4 w-4",
	lg: "h-5 w-5",
	xl: "h-6 w-6",
};

export function AvatarUpload({
	currentAvatar,
	userName,
	size = "lg",
	onUploadSuccess,
	className,
}: AvatarUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const {
		upload,
		isUploading,
		progress,
		uploadData: data,
		reset,
		uploadSuccess: isSuccess,
	} = useAvatar();

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			return;
		}

		// Validate file size (5MB max for avatars)
		if (file.size > 5 * 1024 * 1024) {
			return;
		}

		// Create preview
		const preview = URL.createObjectURL(file);
		setPreviewUrl(preview);

		// Upload
		upload(file);

		// Reset input
		e.target.value = "";
	};

	const handleCancelPreview = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
		reset();
	};

	// // Clean up preview URL when upload succeeds
	// if (isSuccess && previewUrl) {
	//     URL.revokeObjectURL(previewUrl);
	//     setPreviewUrl(null);
	//     if (data?.data?.url) {
	//         onUploadSuccess?.(data.data.url);
	//     }
	// }
	useEffect(() => {
		if (!isSuccess || !previewUrl || !data) return;

		// cleanup preview
		URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);

		try {
			const uploaded = unwrap(data); // AvatarUploadResult
			onUploadSuccess?.(uploaded.imageUrl);
		} catch {
			// ignore - in case isSuccess doesn't guarantee ok:true in your useAction
		}
	}, [isSuccess, data, previewUrl, onUploadSuccess]);
	const uploadedUrl = data?.ok ? data.data.imageUrl : null;
	const displayUrl = previewUrl || uploadedUrl || currentAvatar;

	// const displayUrl = previewUrl || data?.data?.url || currentAvatar;
	const initials =
		userName
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) || "?";

	return (
		<div className={cn("space-y-4", className)}>
			<div className="flex items-center gap-4">
				<input
					ref={inputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					onChange={handleFileSelect}
					className="hidden"
					disabled={isUploading}
				/>

				<div className="relative group">
					<Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
						<AvatarImage
							src={displayUrl || undefined}
							alt={userName || "Avatar"}
						/>
						<AvatarFallback className="text-lg font-medium bg-muted">
							{initials}
						</AvatarFallback>
					</Avatar>

					{/* Hover overlay */}
					{!isUploading && (
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className={cn(
								"absolute inset-0 flex items-center justify-center",
								"bg-black/60 rounded-full opacity-0 group-hover:opacity-100",
								"transition-opacity cursor-pointer",
							)}
						>
							<Camera className={cn(iconSizes[size], "text-white")} />
						</button>
					)}

					{/* Loading overlay */}
					{isUploading && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
							<Loader2
								className={cn(iconSizes[size], "text-white animate-spin")}
							/>
						</div>
					)}

					{/* Cancel button for preview */}
					{previewUrl && !isUploading && (
						<button
							type="button"
							onClick={handleCancelPreview}
							className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</div>

				<div className="space-y-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={isUploading}
					>
						{isUploading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Uploading...
							</>
						) : (
							<>
								<Upload className="mr-2 h-4 w-4" />
								Change Avatar
							</>
						)}
					</Button>

					<p className="text-xs text-muted-foreground">
						JPG, PNG, WebP or GIF. Max 5MB.
					</p>
				</div>
			</div>

			{/* Progress bar */}
			{isUploading && (
				<div className="max-w-xs">
					<ProgressBar value={progress} />
					<p className="text-xs text-muted-foreground mt-1">
						{progress < 50 ? "Uploading..." : "Processing..."}
					</p>
				</div>
			)}

			{/* Success message */}
			{isSuccess && !isUploading && (
				<p className="text-sm text-green-600 dark:text-green-400">
					✓ Avatar uploaded! Optimized versions are being generated.
				</p>
			)}
		</div>
	);
}

// Compact version for inline use
export function AvatarUploadCompact({
	currentAvatar,
	userName,
	onUploadSuccess,
}: Pick<AvatarUploadProps, "currentAvatar" | "userName" | "onUploadSuccess">) {
	return (
		<AvatarUpload
			currentAvatar={currentAvatar}
			userName={userName}
			size="md"
			onUploadSuccess={onUploadSuccess}
		/>
	);
}
