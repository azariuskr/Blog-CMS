import { useState } from "react";
import { QUERY_KEYS } from "@/constants";
import { fromServerFn, useAction } from "@/hooks/use-action";
import {
	AVATAR_QUERY_KEYS,
	deleteAvatar as deleteAvatarFn,
	uploadAvatar as uploadAvatarFn,
} from "@/lib/storage/avatar";
import {
	$deleteFile,
	$getDownloadUrl,
	$getUserFilesPaginated,
} from "@/lib/storage/server";
import type { FileCategory, UploadProgress } from "@/lib/storage/types";
import { uploadFile, uploadMultipleFiles } from "@/lib/storage/upload";

// ============================================================================
// Types
// ============================================================================

interface UploadState {
	progress: number;
	isUploading: boolean;
}

// ============================================================================
// Avatar Hook
// ============================================================================

/**
 * Hook for avatar upload and delete operations
 * Use this in both better-auth-ui provider and custom components
 */
export function useAvatar() {
	const [uploadState, setUploadState] = useState<UploadState>({
		progress: 0,
		isUploading: false,
	});

	const uploadMutation = useAction(
		async (file: File) => {
			setUploadState({ progress: 0, isUploading: true });

			try {
				const result = await uploadAvatarFn(file, (progress) => {
					setUploadState({ progress: progress.percentage, isUploading: true });
				});

				setUploadState({ progress: 100, isUploading: false });

				return {
					ok: true as const,
					data: result,
					message: "Avatar uploaded successfully",
				};
			} catch (error) {
				setUploadState({ progress: 0, isUploading: false });
				throw error;
			}
		},
		{
			invalidate: AVATAR_QUERY_KEYS.invalidate,
			showToast: true,
		},
	);

	const deleteMutation = useAction(
		async () => {
			const result = await deleteAvatarFn();
			return {
				ok: true as const,
				data: result,
				message: "Avatar deleted successfully",
			};
		},
		{
			invalidate: AVATAR_QUERY_KEYS.invalidate,
			showToast: true,
		},
	);

	return {
		// Upload
		upload: uploadMutation.mutate,
		uploadAsync: uploadMutation.mutateAsync,
		progress: uploadState.progress,
		isUploading: uploadState.isUploading,
		uploadSuccess: uploadMutation.isSuccess,
		uploadError: uploadMutation.isError,
		uploadData: uploadMutation.data,

		// Delete
		delete: deleteMutation.mutate,
		deleteAsync: deleteMutation.mutateAsync,
		isDeleting: deleteMutation.isPending,
		deleteSuccess: deleteMutation.isSuccess,
		deleteError: deleteMutation.isError,

		// Reset
		reset: () => {
			uploadMutation.reset();
			deleteMutation.reset();
			setUploadState({ progress: 0, isUploading: false });
		},
	};
}

// ============================================================================
// File Upload Hook
// ============================================================================

export function useFileUpload(category: FileCategory = "attachment") {
	const [uploadState, setUploadState] = useState<UploadState>({
		progress: 0,
		isUploading: false,
	});

	const mutation = useAction(
		async (file: File) => {
			setUploadState({ progress: 0, isUploading: true });

			try {
				const result = await uploadFile(file, category, (progress) => {
					setUploadState({ progress: progress.percentage, isUploading: true });
				});

				setUploadState({ progress: 100, isUploading: false });

				return {
					ok: true as const,
					data: result,
					message: `${file.name} uploaded successfully`,
				};
			} catch (error) {
				setUploadState({ progress: 0, isUploading: false });
				throw error;
			}
		},
		{
			invalidate: [
				QUERY_KEYS.FILES.LIST,
				QUERY_KEYS.FILES.PAGINATED_BASE,
				QUERY_KEYS.AUTH.USER,
				QUERY_KEYS.AUTH.SESSION,
			],
			showToast: true,
		},
	);

	return {
		upload: mutation.mutate,
		uploadAsync: mutation.mutateAsync,
		...uploadState,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		data: mutation.data,
		reset: () => {
			mutation.reset();
			setUploadState({ progress: 0, isUploading: false });
		},
	};
}

// ============================================================================
// Multiple File Upload Hook
// ============================================================================

export function useMultipleFileUpload(category: FileCategory = "attachment") {
	const [uploadStates, setUploadStates] = useState<
		Record<number, UploadProgress>
	>({});

	const mutation = useAction(
		async (files: File[]) => {
			setUploadStates({});

			try {
				const results = await uploadMultipleFiles(
					files,
					category,
					(index, progress) => {
						setUploadStates((prev) => ({
							...prev,
							[index]: progress,
						}));
					},
				);

				setUploadStates({});

				return {
					ok: true as const,
					data: results,
					message: `${results.length} file(s) uploaded successfully`,
				};
			} catch (error) {
				setUploadStates({});
				throw error;
			}
		},
		{
			invalidate: [QUERY_KEYS.FILES.LIST, QUERY_KEYS.FILES.PAGINATED_BASE],
			showToast: true,
		},
	);

	const totalProgress =
		Object.keys(uploadStates).length > 0
			? Object.values(uploadStates).reduce((sum, p) => sum + p.percentage, 0) /
				Object.keys(uploadStates).length
			: 0;

	return {
		upload: mutation.mutate,
		uploadAsync: mutation.mutateAsync,
		uploadStates,
		totalProgress,
		isUploading: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		data: mutation.data,
		reset: mutation.reset,
	};
}

// ============================================================================
// File Management Hooks
// ============================================================================

export function useDeleteFile() {
	return useAction(
		fromServerFn($deleteFile, {
			successMessage: "File deleted successfully",
			errorMessage: "Failed to delete file",
		}),
		{
			invalidate: [QUERY_KEYS.FILES.LIST, QUERY_KEYS.FILES.PAGINATED_BASE],
			showToast: true,
		},
	);
}

export function useUserFiles() {
	return useAction(
		async () => {
			const result = await $getUserFilesPaginated({
				data: { page: 1, limit: 20 },
			});
			return result;
		},
		{
			invalidate: [QUERY_KEYS.AUTH.SESSION, QUERY_KEYS.AUTH.USER],
			showToast: false,
		},
	);
}

export function useGetDownloadUrl() {
	return useAction(
		async (vars: { fileId: string }) => $getDownloadUrl({ data: vars }),
		{
			invalidate: [QUERY_KEYS.AUTH.SESSION, QUERY_KEYS.AUTH.USER],
			showToast: true,
		},
	);
}
