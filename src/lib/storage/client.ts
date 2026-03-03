import { getStorageConfig } from "./config";
import { LocalStorage } from "./local";
import { MinioStorage } from "./minio-storage";
import type { IStorageWithFileAccess } from "./types";

// Singleton storage instance
let storage: IStorageWithFileAccess | null = null;

/**
 * Get the configured storage instance.
 * Uses singleton pattern - same instance returned for all calls.
 */
export function getStorage(): IStorageWithFileAccess {
    if (!storage) {
        const config = getStorageConfig();

        switch (config.provider) {
            case "minio":
                storage = new MinioStorage({
                    endpoint: config.minio.endpoint,
                    port: config.minio.port,
                    accessKey: config.minio.accessKey,
                    secretKey: config.minio.secretKey,
                    bucketName: config.minio.bucketName,
                    region: config.minio.region,
                    useSSL: config.minio.useSSL,
                });
                break;

            case "local":
            default:
                storage = new LocalStorage({
                    basePath: config.local.basePath,
                    publicUrlPrefix: config.local.publicUrlPrefix,
                });
                break;
        }
    }

    return storage;
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
    storage = null;
}

// Re-export types for convenience
export type { IStorageWithFileAccess } from "./types";
