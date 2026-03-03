import * as Minio from "minio";
import type { Readable } from "node:stream";
import type { FileStreamResult, IStorageWithFileAccess } from "./types";

export class MinioStorage implements IStorageWithFileAccess {
	private readonly client: Minio.Client;
	private readonly bucketName: string;
	private bucketEnsured = false;

	constructor(config: {
		endpoint: string;
		port: number;
		accessKey: string;
		secretKey: string;
		bucketName: string;
		region: string;
		useSSL: boolean;
	}) {
		this.bucketName = config.bucketName;
		this.client = new Minio.Client({
			endPoint: config.endpoint,
			port: config.port,
			useSSL: config.useSSL,
			accessKey: config.accessKey,
			secretKey: config.secretKey,
			region: config.region,
		});
	}

	private async ensureBucket(): Promise<void> {
		if (this.bucketEnsured) return;

		try {
			const exists = await this.client.bucketExists(this.bucketName);
			if (!exists) {
				await this.client.makeBucket(this.bucketName);
			}
			this.bucketEnsured = true;
		} catch (error) {
			console.error("Error ensuring bucket exists:", error);
		}
	}

	async upload(
		key: string,
		data: Buffer,
		contentType = "application/octet-stream",
	): Promise<void> {
		await this.ensureBucket();
		await this.client.putObject(this.bucketName, key, data, data.length, {
			"Content-Type": contentType,
		});
	}

	async delete(key: string): Promise<void> {
		await this.client.removeObject(this.bucketName, key);
	}

	async exists(key: string): Promise<boolean> {
		try {
			await this.client.statObject(this.bucketName, key);
			return true;
		} catch {
			return false;
		}
	}

	async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
		return this.client.presignedGetObject(this.bucketName, key, expiresIn);
	}

	async getPresignedUploadUrl(
		key: string,
		_contentType = "application/octet-stream",
		expiresIn = 3600,
	): Promise<string> {
		await this.ensureBucket();
		return this.client.presignedPutObject(this.bucketName, key, expiresIn);
	}

	async getFile(key: string): Promise<{ data: Buffer; contentType: string } | null> {
		try {
			const stat = await this.client.statObject(this.bucketName, key);
			const stream = (await this.client.getObject(this.bucketName, key)) as Readable;

			const chunks: Buffer[] = [];
			for await (const chunk of stream) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}

			return {
				data: Buffer.concat(chunks),
				contentType: stat.metaData?.["content-type"] || "application/octet-stream",
			};
		} catch {
			return null;
		}
	}

	async getFileStream(key: string): Promise<FileStreamResult | null> {
		try {
			const stat = await this.client.statObject(this.bucketName, key);
			const stream = (await this.client.getObject(this.bucketName, key)) as Readable;

			return {
				stream,
				contentType: stat.metaData?.["content-type"] || "application/octet-stream",
				size: stat.size,
			};
		} catch {
			return null;
		}
	}
}
