import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Readable } from "node:stream";
import type { FileStreamResult, IStorageWithFileAccess } from "./types";

export class LocalStorage implements IStorageWithFileAccess {
	private readonly basePath: string;
	private readonly publicUrlPrefix: string;

	constructor(config: { basePath: string; publicUrlPrefix: string }) {
		this.basePath = path.resolve(config.basePath);
		this.publicUrlPrefix = config.publicUrlPrefix;

		// Ensure base directory exists
		this.ensureDirectory(this.basePath);
	}

	private ensureDirectory(dirPath: string): void {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
	}

	private getFullPath(key: string): string {
		// Sanitize key to prevent path traversal attacks
		// 1. Normalize to handle encoded characters and resolve ./..
		// 2. Remove any remaining parent directory references
		// 3. Strip leading slashes
		const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
		const sanitizedKey = normalized.replace(/\.\./g, "").replace(/^[/\\]+/, "");

		const fullPath = path.join(this.basePath, sanitizedKey);

		// Verify the resolved path is still within basePath
		const resolved = path.resolve(fullPath);
		if (!resolved.startsWith(this.basePath)) {
			throw new Error("Invalid storage path: path traversal detected");
		}

		return fullPath;
	}

	async upload(
		key: string,
		data: Buffer,
		contentType = "application/octet-stream",
	): Promise<void> {
		const fullPath = this.getFullPath(key);
		const dir = path.dirname(fullPath);

		this.ensureDirectory(dir);
		await fs.promises.writeFile(fullPath, data);

		// Store metadata in a sidecar file
		const metaPath = `${fullPath}.meta.json`;
		await fs.promises.writeFile(
			metaPath,
			JSON.stringify({
				contentType,
				size: data.length,
				uploadedAt: new Date().toISOString(),
			}),
		);
	}

	async delete(key: string): Promise<void> {
		const fullPath = this.getFullPath(key);
		const metaPath = `${fullPath}.meta.json`;

		try {
			await fs.promises.unlink(fullPath);
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}

		try {
			await fs.promises.unlink(metaPath);
		} catch {
			// Ignore missing metadata
		}
	}

	async exists(key: string): Promise<boolean> {
		const fullPath = this.getFullPath(key);
		try {
			await fs.promises.access(fullPath, fs.constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
		const expires = Date.now() + expiresIn * 1000;
		const token = this.generateSignedToken(key, expires);
		return `${this.publicUrlPrefix}/${key}?token=${token}&expires=${expires}`;
	}

	async getPresignedUploadUrl(
		key: string,
		contentType = "application/octet-stream",
		expiresIn = 3600,
	): Promise<string> {
		const expires = Date.now() + expiresIn * 1000;
		const token = this.generateSignedToken(key, expires, "upload");
		return `${this.publicUrlPrefix}/upload/${key}?token=${token}&expires=${expires}&contentType=${encodeURIComponent(
			contentType,
		)}`;
	}

	async getFile(key: string): Promise<{ data: Buffer; contentType: string } | null> {
		const fullPath = this.getFullPath(key);
		const metaPath = `${fullPath}.meta.json`;

		try {
			const data = await fs.promises.readFile(fullPath);
			let contentType = "application/octet-stream";

			try {
				const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
				contentType = meta.contentType || contentType;
			} catch {
				contentType = this.guessContentType(key);
			}

			return { data, contentType };
		} catch {
			return null;
		}
	}

	async getFileStream(key: string): Promise<FileStreamResult | null> {
		const fullPath = this.getFullPath(key);
		const metaPath = `${fullPath}.meta.json`;

		try {
			const stat = await fs.promises.stat(fullPath);
			let contentType = "application/octet-stream";

			try {
				const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
				contentType = meta.contentType || contentType;
			} catch {
				contentType = this.guessContentType(key);
			}

			const stream = fs.createReadStream(fullPath) as unknown as Readable;

			return { stream, contentType, size: stat.size };
		} catch {
			return null;
		}
	}

	private generateSignedToken(
		key: string,
		expires: number,
		action = "download",
	): string {
		const secret = process.env.BETTER_AUTH_SECRET || "local-storage-secret";
		const payload = `${action}:${key}:${expires}`;
		return crypto.createHmac("sha256", secret).update(payload).digest("hex");
	}

	verifySignedToken(
		key: string,
		token: string,
		expires: number,
		action = "download",
	): boolean {
		if (Date.now() > expires) return false;
		const expectedToken = this.generateSignedToken(key, expires, action);
		return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
	}

	private guessContentType(key: string): string {
		const ext = path.extname(key).toLowerCase();
		const mimeTypes: Record<string, string> = {
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".png": "image/png",
			".gif": "image/gif",
			".webp": "image/webp",
			".avif": "image/avif",
			".svg": "image/svg+xml",
			".pdf": "application/pdf",
			".json": "application/json",
			".txt": "text/plain",
			".csv": "text/csv",
			".mp4": "video/mp4",
			".webm": "video/webm",
		};
		return mimeTypes[ext] || "application/octet-stream";
	}
}
