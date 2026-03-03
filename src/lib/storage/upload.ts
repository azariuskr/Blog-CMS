import { STORAGE_API } from "@/constants";
import { env } from "@/env/client";
import { withBasePath } from "@/lib/url/with-base-path";
import { $completeFileUpload, $createFileUploadUrl } from "./server";
import type { FileCategory, UploadProgress, UploadResult } from "./types";
import { validateFile } from "./utils";

// ============================================================================
// Types
// ============================================================================

interface UploadResponse {
    ok: boolean;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    etag: string;
}

// ============================================================================
// Generic File Upload
// ============================================================================

/**
 * Upload a file with progress tracking
 *
 * Flow:
 * 1. Get storage path from server (validates user, generates path)
 * 2. Upload file via POST to /api/storage/upload
 * 3. Complete upload to create DB record
 *
 * Note: Currently uses avatar upload functions - will be refactored
 * when generic file upload server functions are added
 */
export async function uploadFile(
    file: File,
    category: FileCategory = "attachment",
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
    // Validate file
    const validation = validateFile(file, category);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    if (category === "avatar") {
        throw new Error("Use uploadAvatar for avatar uploads");
    }

    // Step 1: Get storage path from server (validates, generates canonical prefix)
    const pathResult = await $createFileUploadUrl({
        data: {
            category: category as "attachment" | "document" | "media",
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
        },
    });

    // createServerFn may throw or return an error-shaped object depending on middleware
    if (
        !pathResult ||
        typeof (pathResult as { storagePath?: unknown }).storagePath !== "string" ||
        !(pathResult as { storagePath: string }).storagePath.length
    ) {
        if (typeof (pathResult as { message?: unknown })?.message === "string") {
            throw new Error((pathResult as unknown as { message: string }).message);
        }
        throw new Error("Failed to create upload path");
    }

    const storagePath = (pathResult as { storagePath: string }).storagePath;

    // Step 2: Upload file with progress
    const uploadResult = await uploadWithProgress(
        withBasePath(env.VITE_BASE_URL, STORAGE_API.UPLOAD),
        storagePath,
        file,
        onProgress,
    );

    // Step 3: Complete upload to create DB record
    const completed = await $completeFileUpload({
        data: {
            category: category as "attachment" | "document" | "media",
            storagePath: uploadResult.storagePath,
            originalName: file.name,
            mimeType: uploadResult.contentType,
            sizeBytes: uploadResult.sizeBytes,
        },
    });

    return {
        id: completed.fileId,
        key: completed.storagePath,
        url: completed.storageUrl,
        fileName: file.name,
        fileSize: uploadResult.sizeBytes,
        mimeType: uploadResult.contentType,
        category,
    };
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
    files: File[],
    category: FileCategory = "attachment",
    onProgress?: (fileIndex: number, progress: UploadProgress) => void,
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
        try {
            const result = await uploadFile(files[i], category, (progress) => {
                onProgress?.(i, progress);
            });
            results.push(result);
        } catch (error) {
            errors.push({
                index: i,
                error: error instanceof Error ? error.message : "Upload failed",
            });
        }
    }

    if (errors.length > 0 && errors.length === files.length) {
        throw new Error(
            `All uploads failed: ${errors.map((e) => e.error).join(", ")}`,
        );
    }

    if (errors.length > 0) {
        console.warn("Some uploads failed:", errors);
    }

    return results;
}

// ============================================================================
// Upload Helper with Progress
// ============================================================================

async function uploadWithProgress(
    url: string,
    storagePath: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
        if (!storagePath || typeof storagePath !== "string") {
            reject(new Error("Upload failed: missing storagePath"));
            return;
        }

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
