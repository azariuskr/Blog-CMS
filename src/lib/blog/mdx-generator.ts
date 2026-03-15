/**
 * MDX Generator — converts canonical block JSON to MDX string with frontmatter.
 * Stored in posts.content on every publish.
 */

export interface MdxBlock {
	id: string;
	type: string;
	content: string;
	meta?: Record<string, unknown>;
}

export interface PostFrontmatter {
	title: string;
	slug: string;
	excerpt?: string;
	publishedAt?: string | Date | null;
	author?: string;
	category?: string;
	tags?: string[];
	featuredImageUrl?: string;
	isPremium?: boolean;
	schemaVersion?: number;
}

// ---------------------------------------------------------------------------
// Frontmatter serializer
// ---------------------------------------------------------------------------

function escapeYaml(value: string): string {
	if (/[:#\[\]{},|>&*!'"\\]/.test(value) || value.includes("\n")) {
		return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	}
	return value;
}

function buildFrontmatter(meta: PostFrontmatter): string {
	const lines: string[] = ["---"];

	lines.push(`title: ${escapeYaml(meta.title)}`);
	lines.push(`slug: ${escapeYaml(meta.slug)}`);

	if (meta.excerpt) lines.push(`excerpt: ${escapeYaml(meta.excerpt)}`);
	if (meta.featuredImageUrl) lines.push(`coverImage: ${escapeYaml(meta.featuredImageUrl)}`);
	if (meta.author) lines.push(`author: ${escapeYaml(meta.author)}`);
	if (meta.category) lines.push(`category: ${escapeYaml(meta.category)}`);
	if (meta.tags?.length) {
		lines.push(`tags:`);
		for (const tag of meta.tags) lines.push(`  - ${escapeYaml(tag)}`);
	}
	if (meta.publishedAt) {
		const dateStr = meta.publishedAt instanceof Date
			? meta.publishedAt.toISOString()
			: String(meta.publishedAt);
		lines.push(`publishedAt: ${dateStr}`);
	}
	if (meta.isPremium) lines.push(`isPremium: true`);
	if (meta.schemaVersion != null) lines.push(`schemaVersion: ${meta.schemaVersion}`);

	lines.push("---");
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Block → MDX
// ---------------------------------------------------------------------------

function blockToMdx(block: MdxBlock): string {
	const props = block.meta ?? {};
	switch (block.type) {
		case "h1": return `# ${block.content}`;
		case "h2": return `## ${block.content}`;
		case "h3": return `### ${block.content}`;
		case "h4": return `#### ${block.content}`;
		// legacy
		case "heading": return `## ${block.content}`;
		case "paragraph": return block.content;
		case "blockquote":
		case "quote":
			return block.content
				.split("\n")
				.map((l) => `> ${l}`)
				.join("\n");
		case "code": {
			const lang = String(props.language ?? "");
			return `\`\`\`${lang}\n${block.content}\n\`\`\``;
		}
		case "image": {
			const src = String(props.src ?? block.content ?? "");
			const alt = String(props.alt ?? "");
			const caption = String(props.caption ?? "");
			const main = `![${alt}](${src})`;
			return caption ? `${main}\n*${caption}*` : main;
		}
		case "video": {
			const src = String(props.src ?? block.content ?? "");
			return `<Video src="${src}" />`;
		}
		case "link": {
			const url = String(props.url ?? block.content ?? "");
			const title = String(props.title ?? url);
			return `[${title}](${url})`;
		}
		case "separator":
		case "divider":
			return "---";
		case "ul":
		case "ol":
		case "list":
		case "task-list":
			return block.content;
		case "table":
			return block.content;
		case "alert": {
			const variant = String(props.variant ?? "info").toUpperCase();
			const body = block.content.split("\n").map((l) => `> ${l}`).join("\n");
			return `> [!${variant}]\n${body}`;
		}
		case "diagram": {
			const diagramType = String(props.type ?? "mermaid");
			return `\`\`\`${diagramType}\n${block.content}\n\`\`\``;
		}
		case "math": return `$$\n${block.content}\n$$`;
		default: return block.content;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a post's blocks array + metadata into a full MDX string.
 */
export function generateMdx(
	blocks: MdxBlock[],
	frontmatter: PostFrontmatter,
): string {
	const fm = buildFrontmatter(frontmatter);
	const body = blocks.map(blockToMdx).join("\n\n");
	return `${fm}\n\n${body}\n`;
}

/**
 * Convert blocks array to plain Markdown (no frontmatter).
 * Useful for previews, exports, and git diffs.
 */
export function blocksToMdxBody(blocks: MdxBlock[]): string {
	return blocks.map(blockToMdx).join("\n\n");
}
