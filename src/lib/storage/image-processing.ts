import type Sharp from "sharp";
import { AVATAR_CONFIG } from "@/constants";

// Lazy load sharp to avoid issues in client bundles
let sharpInstance: typeof Sharp | null = null;

async function getSharp(): Promise<typeof Sharp> {
    if (!sharpInstance) {
        sharpInstance = (await import("sharp")).default;
    }
    return sharpInstance;
}

// ============================================================================
// Types
// ============================================================================

export type ImageFormat = "webp" | "avif" | "jpeg" | "png";

export interface ProcessingOptions {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    position?: "center" | "top" | "right" | "bottom" | "left";
    quality?: number;
    format?: ImageFormat;
}

export interface ProcessedImage {
    buffer: Buffer;
    mimeType: string;
    width: number;
    height: number;
}

// ============================================================================
// Presets
// ============================================================================

export const IMAGE_PRESETS = {
    avatar: {
        width: AVATAR_CONFIG.OUTPUT_SIZE,
        height: AVATAR_CONFIG.OUTPUT_SIZE,
        fit: "cover" as const,
        position: "center" as const,
        quality: AVATAR_CONFIG.OUTPUT_QUALITY,
        format: AVATAR_CONFIG.OUTPUT_FORMAT,
    },
    thumbnail: {
        width: 200,
        height: 200,
        fit: "cover" as const,
        position: "center" as const,
        quality: 80,
        format: "webp" as const,
    },
    optimized: {
        width: 1920,
        height: 1080,
        fit: "inside" as const,
        quality: 85,
        format: "webp" as const,
    },
    preview: {
        width: 400,
        height: 400,
        fit: "inside" as const,
        quality: 75,
        format: "webp" as const,
    },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

// ============================================================================
// Processing Functions
// ============================================================================

/**
 * Process an image with given options
 */
export async function processImage(
    input: Buffer,
    options: ProcessingOptions
): Promise<ProcessedImage> {
    const sharp = await getSharp();

    let pipeline = sharp(input).rotate(); // Auto-rotate based on EXIF

    // Resize if dimensions provided
    if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
            fit: options.fit || "inside",
            position: options.position || "center",
            withoutEnlargement: true,
        });
    }

    // Convert to target format
    const format = options.format || "webp";
    const quality = options.quality || 85;

    switch (format) {
        case "webp":
            pipeline = pipeline.webp({ quality });
            break;
        case "avif":
            pipeline = pipeline.avif({ quality });
            break;
        case "jpeg":
            pipeline = pipeline.jpeg({ quality });
            break;
        case "png":
            pipeline = pipeline.png({ quality });
            break;
    }

    const buffer = await pipeline.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
        buffer,
        mimeType: `image/${format}`,
        width: metadata.width || options.width || 0,
        height: metadata.height || options.height || 0,
    };
}

/**
 * Process an image using a preset
 */
export async function processWithPreset(
    input: Buffer,
    preset: ImagePreset
): Promise<ProcessedImage> {
    const options = IMAGE_PRESETS[preset];
    return processImage(input, options);
}

/**
 * Process avatar image (convenience function)
 */
export async function processAvatar(input: Buffer): Promise<ProcessedImage> {
    return processWithPreset(input, "avatar");
}

/**
 * Generate multiple sizes of an image
 */
export async function generateVariants(
    input: Buffer,
    sizes: number[],
    options: Omit<ProcessingOptions, "width" | "height"> = {}
): Promise<Array<ProcessedImage & { size: number }>> {
    const results: Array<ProcessedImage & { size: number }> = [];

    for (const size of sizes) {
        const processed = await processImage(input, {
            ...options,
            width: size,
            height: size,
            fit: options.fit || "cover",
        });
        results.push({ ...processed, size });
    }

    return results;
}

/**
 * Validate image type
 */
export function isAllowedImageType(mimeType: string): boolean {
    return AVATAR_CONFIG.ALLOWED_TYPES.includes(
        mimeType as (typeof AVATAR_CONFIG.ALLOWED_TYPES)[number]
    );
}

/**
 * Validate image size
 */
export function isAllowedImageSize(sizeBytes: number, maxBytes?: number): boolean {
    return sizeBytes <= (maxBytes || AVATAR_CONFIG.MAX_SIZE_BYTES);
}

/**
 * Get file extension for format
 */
export function getExtensionForFormat(format: ImageFormat): string {
    return format === "jpeg" ? "jpg" : format;
}
