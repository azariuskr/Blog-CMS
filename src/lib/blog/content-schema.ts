import { z } from "zod";

export const POST_SCHEMA_VERSION = 1 as const;

export const BlockTypeSchema = z.enum([
	// Text
	"paragraph",
	"h1",
	"h2",
	"h3",
	"h4",
	"blockquote",
	"alert",
	"ul",
	"ol",
	"task-list",
	// Media
	"image",
	"video",
	"link",
	// Layout
	"separator",
	"table",
	// Advanced
	"code",
	"math",
	"diagram",
	// Legacy aliases kept for backwards-compat
	"heading",
	"quote",
	"list",
	"divider",
]);

export const PostBlockSchema = z.object({
	id: z.string().min(1),
	type: BlockTypeSchema,
	content: z.string(),
	meta: z.record(z.string(), z.unknown()).optional(),
});

export const PostContentSchema = z.object({
	schemaVersion: z.number().int().positive().default(POST_SCHEMA_VERSION),
	blocks: z.array(PostBlockSchema).default([]),
});

export const PostMetaSchema = z.object({
	title: z.string().min(1).max(500),
	slug: z.string().min(1).max(500),
	excerpt: z.string().max(1000).optional(),
	featuredImageUrl: z.string().url().optional().or(z.literal("")),
	metaTitle: z.string().max(70).optional(),
	metaDescription: z.string().max(160).optional(),
	status: z
		.enum(["draft", "review", "scheduled", "published", "archived"])
		.default("draft"),
});

export type PostBlock = z.infer<typeof PostBlockSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type PostMeta = z.infer<typeof PostMetaSchema>;

/**
 * Parse and validate raw blocks JSON from DB.
 * Unknown block types are preserved with their content (passthrough).
 * Returns validated blocks array or empty array on failure.
 */
export function parsePostBlocks(
	raw: unknown,
): Array<{ id: string; type: string; content: string; meta?: Record<string, unknown> }> {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(b): b is { id: string; type: string; content: string; meta?: Record<string, unknown> } =>
			b != null &&
			typeof b === "object" &&
			typeof (b as Record<string, unknown>).id === "string" &&
			typeof (b as Record<string, unknown>).type === "string" &&
			typeof (b as Record<string, unknown>).content === "string",
	);
}
