import { QUERY_KEYS, STORAGE_API } from "@/constants";
import { env } from "@/env/client";
import { withBasePath } from "@/lib/url/with-base-path";
import {
    $createAvatarUploadUrl,
    $completeAvatarUpload,
    $deleteAvatar,
} from "@/lib/storage/server";
import type { UploadProgress } from "@/lib/storage/types";

// ============================================================================
// Types
// ============================================================================

export interface AvatarUploadResult {
    fileId: string;
    storagePath: string;
    imageUrl: string;
}

// ============================================================================
// Avatar Upload Function
// ============================================================================

/**
 * Upload an avatar image
 *
 * Flow:
 * 1. Get storage path from server
 * 2. Upload file via POST (server processes with Sharp)
 * 3. Complete upload (creates DB record, updates user)
 */
export async function uploadAvatar(
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<AvatarUploadResult> {
    // Step 1: Get storage path
    const created = await $createAvatarUploadUrl({
        data: {
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
        },
    });

    // Step 2: Upload via POST with progress tracking
    const uploadResult = await uploadWithProgress(
        withBasePath(env.VITE_BASE_URL, STORAGE_API.UPLOAD),
        created.storagePath,
        file,
        onProgress
    );

    // Step 3: Complete upload
    const completed = await $completeAvatarUpload({
        data: {
            storagePath: uploadResult.storagePath,
            originalName: file.name,
            mimeType: uploadResult.contentType,
            sizeBytes: uploadResult.sizeBytes,
        },
    });

    return {
        fileId: completed.fileId,
        storagePath: completed.storagePath,
        imageUrl: completed.imageUrl,
    };
}

/**
 * Delete user's avatar
 */
export async function deleteAvatar(): Promise<{ success: boolean }> {
    return $deleteAvatar();
}

// ============================================================================
// Upload Helper with Progress
// ============================================================================

interface UploadResponse {
    ok: boolean;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    etag: string;
}

async function uploadWithProgress(
    url: string,
    storagePath: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.set("storagePath", storagePath);
        formData.set("contentType", file.type || "application/octet-stream");
        formData.set("file", file);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress({
                    loaded: event.loaded,
                    total: event.total,
                    percentage: Math.round((event.loaded / event.total) * 100),
                });
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText) as UploadResponse;
                    resolve(response);
                } catch {
                    reject(new Error("Invalid response from server"));
                }
            } else {
                reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
            }
        };

        xhr.onerror = () => reject(new Error("Upload failed: Network error"));
        xhr.ontimeout = () => reject(new Error("Upload failed: Timeout"));

        xhr.open("POST", url);
        xhr.send(formData);
    });
}

// ============================================================================
// Query Keys for Cache Invalidation
// ============================================================================

export const AVATAR_QUERY_KEYS = {
    invalidate: [
        QUERY_KEYS.AUTH.USER,
        QUERY_KEYS.AUTH.SESSION,
        QUERY_KEYS.FILES.LIST,
    ],
};
