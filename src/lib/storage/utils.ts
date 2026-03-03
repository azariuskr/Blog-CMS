import crypto from "node:crypto";
import { STORAGE_PATHS, type StoragePath } from "@/constants";
import type { FileCategory } from "./types";
import { ALLOWED_TYPES, MAX_FILE_SIZE } from "./types";

export const FILE_CATEGORY_TO_STORAGE_PATH: Record<FileCategory, StoragePath> =
	{
		avatar: STORAGE_PATHS.AVATAR,
		attachment: STORAGE_PATHS.ATTACHMENT,
		document: STORAGE_PATHS.DOCUMENT,
		media: STORAGE_PATHS.MEDIA,
	};

export function getStoragePathForCategory(category: FileCategory): StoragePath {
	const prefix = FILE_CATEGORY_TO_STORAGE_PATH[category];
	if (!prefix) {
		throw new Error(`Unknown storage category: ${category}`);
	}
	return prefix;
}

export function generateFileKey(
	userId: string,
	category: FileCategory,
	fileName: string,
): string {
	const timestamp = Date.now();
	const randomId = crypto.randomBytes(8).toString("hex");
	const ext = fileName.split(".").pop() || "";
	const prefix = getStoragePathForCategory(category);

	return `${prefix}/${userId}/${timestamp}-${randomId}.${ext}`;
}

export function validateFile(
	file: File,
	category: FileCategory,
): { valid: boolean; error?: string } {
	const allowedTypes = ALLOWED_TYPES[category] as readonly string[];
	const maxSize = MAX_FILE_SIZE[category];

	if (!allowedTypes.includes(file.type)) {
		return {
			valid: false,
			error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
		};
	}

	if (file.size > maxSize) {
		return {
			valid: false,
			error: `File too large. Maximum size: ${formatFileSize(maxSize)}`,
		};
	}

	return { valid: true };
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function getMimeCategory(mimeType: string): FileCategory {
	if (mimeType.startsWith("image/")) return "media";
	if (mimeType.startsWith("video/")) return "media";
	if (mimeType === "application/pdf") return "document";
	if (mimeType.startsWith("text/")) return "document";
	return "attachment";
}
