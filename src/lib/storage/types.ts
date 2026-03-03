import type { Readable } from "node:stream";

export type StorageProvider = "local" | "minio" | "r2"; // r2 currently falls back to minio behavior in config

export type FileCategory = "avatar" | "attachment" | "document" | "media";

export type FileStreamResult = {
	stream: Readable;
	contentType: string;
	size: number;
};

export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

export interface UploadResult {
	id: string;
	key: string;
	url: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	category: FileCategory;
}

// Core storage interface - all providers implement this
export interface IStorage {
	upload(key: string, data: Buffer, contentType?: string): Promise<void>;
	delete(key: string): Promise<void>;
	exists(key: string): Promise<boolean>;

	getFileStream(key: string): Promise<FileStreamResult | null>;

	getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
	getPresignedUploadUrl(
		key: string,
		contentType?: string,
		expiresIn?: number,
	): Promise<string>;
}

// Extended interface for providers that support direct file access
export interface IStorageWithFileAccess extends IStorage {
	getFile(key: string): Promise<{ data: Buffer; contentType: string } | null>;
}

// Allowed file types by category
export const ALLOWED_TYPES = {
	avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
	media: [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
		"video/mp4",
		"video/webm",
	],
	document: ["application/pdf", "text/plain", "text/csv"],
	attachment: [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
		"video/mp4",
		"video/webm",
		"application/pdf",
		"text/plain",
		"text/csv",
	],
} as const;

// Max file sizes by category (in bytes)
export const MAX_FILE_SIZE = {
	avatar: 5 * 1024 * 1024, // 5MB
	media: 100 * 1024 * 1024, // 100MB
	document: 10 * 1024 * 1024, // 10MB
	attachment: 50 * 1024 * 1024, // 50MB
} as const;

// Type for allowed MIME types
export type AllowedMimeType =
	| (typeof ALLOWED_TYPES.avatar)[number]
	| (typeof ALLOWED_TYPES.media)[number]
	| (typeof ALLOWED_TYPES.document)[number]
	| (typeof ALLOWED_TYPES.attachment)[number];
