import { env } from "@/env/server";
import type { StorageProvider } from "./types";

export interface MinioConfig {
	endpoint: string;
	port: number;
	accessKey: string;
	secretKey: string;
	bucketName: string;
	region: string;
	useSSL: boolean;
}

export interface LocalConfig {
	basePath: string;
	publicUrlPrefix: string;
}

export interface StorageConfig {
	provider: StorageProvider;
	minio: MinioConfig;
	local: LocalConfig;
}

let cachedConfig: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
	if (cachedConfig) return cachedConfig;

	cachedConfig = {
		provider: getStorageProvider(),
		minio: {
			endpoint: env.MINIO_ENDPOINT,
			port: env.MINIO_PORT,
			accessKey: env.MINIO_ACCESS_KEY,
			secretKey: env.MINIO_SECRET_KEY,
			bucketName: env.MINIO_BUCKET_NAME,
			region: env.MINIO_REGION,
			useSSL: env.MINIO_USE_SSL ?? false,
		},
		local: {
			basePath: env.LOCAL_STORAGE_PATH ?? "./storage",
			publicUrlPrefix: env.LOCAL_STORAGE_URL_PREFIX ?? "/api/storage/files",
		},
	};

	return cachedConfig;
}

export function getStorageProvider(): StorageProvider {
	const provider = env.STORAGE_PROVIDER;

	// If explicitly set to local, use local filesystem
	if (provider === "local") {
		return "local";
	}

	// Default to MinIO (works for local dev and production)
	return "minio";
}

export function getMinioConfig(): MinioConfig {
	return getStorageConfig().minio;
}

export function getLocalConfig(): LocalConfig {
	return getStorageConfig().local;
}
