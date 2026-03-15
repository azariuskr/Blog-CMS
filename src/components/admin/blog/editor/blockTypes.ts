// Block type definitions — adapted from references/Wren-cms

export type BlockType =
	| "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
	| "paragraph"
	| "blockquote"
	| "alert"
	| "code"
	| "image"
	| "video"
	| "link"
	| "ul" | "ol" | "task-list"
	| "table"
	| "separator"
	| "math"
	| "diagram";

export interface Block {
	id: string;
	type: BlockType;
	content: string;
	props?: Record<string, unknown>;
}

export interface BlockDefinition {
	type: BlockType;
	label: string;
	icon: string;
	category: "text" | "media" | "layout" | "advanced";
	defaultContent: string;
	defaultProps?: Record<string, unknown>;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
	// Text blocks
	{ type: "h1", label: "Heading 1", icon: "Heading1", category: "text", defaultContent: "Heading 1" },
	{ type: "h2", label: "Heading 2", icon: "Heading2", category: "text", defaultContent: "Heading 2" },
	{ type: "h3", label: "Heading 3", icon: "Heading3", category: "text", defaultContent: "Heading 3" },
	{ type: "h4", label: "Heading 4", icon: "Heading4", category: "text", defaultContent: "Heading 4" },
	{ type: "paragraph", label: "Paragraph", icon: "AlignLeft", category: "text", defaultContent: "Start writing your content here." },
	{ type: "blockquote", label: "Quote", icon: "Quote", category: "text", defaultContent: "Enter a quote..." },
	{ type: "alert", label: "Alert", icon: "AlertCircle", category: "text", defaultContent: "Alert message", defaultProps: { variant: "info" } },

	// Lists
	{ type: "ul", label: "Bullet List", icon: "List", category: "text", defaultContent: "- Item 1\n- Item 2\n- Item 3" },
	{ type: "ol", label: "Numbered List", icon: "ListOrdered", category: "text", defaultContent: "1. Item 1\n2. Item 2\n3. Item 3" },
	{ type: "task-list", label: "Task List", icon: "ListTodo", category: "text", defaultContent: "- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task" },

	// Media blocks
	{ type: "image", label: "Image", icon: "Image", category: "media", defaultContent: "", defaultProps: { src: "", alt: "", caption: "", layout: "full" } },
	{ type: "video", label: "Video", icon: "Video", category: "media", defaultContent: "", defaultProps: { src: "", provider: "youtube" } },
	{ type: "link", label: "Link Card", icon: "Link2", category: "media", defaultContent: "", defaultProps: { url: "https://example.com", title: "Link Title", description: "Link description" } },

	// Layout blocks
	{ type: "separator", label: "Divider", icon: "Minus", category: "layout", defaultContent: "---" },
	{ type: "table", label: "Table", icon: "Table", category: "layout", defaultContent: "| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |" },

	// Advanced blocks
	{ type: "code", label: "Code Block", icon: "Code", category: "advanced", defaultContent: 'function hello() {\n  console.log("Hello, World!");\n}', defaultProps: { language: "javascript" } },
	{ type: "math", label: "Math Equation", icon: "Sigma", category: "advanced", defaultContent: "E = mc²" },
	{ type: "diagram", label: "Diagram", icon: "GitBranch", category: "advanced", defaultContent: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action 1]\n  B -->|No| D[Action 2]\n  C --> E[End]\n  D --> E", defaultProps: { type: "mermaid" } },
];

export const BLOCK_CATEGORIES = [
	{ id: "text", label: "Text", icon: "Type" },
	{ id: "media", label: "Media", icon: "Image" },
	{ id: "layout", label: "Layout", icon: "LayoutGrid" },
	{ id: "advanced", label: "Advanced", icon: "Sparkles" },
] as const;

export const SUPPORTED_LANGUAGES = [
	"javascript", "typescript", "python", "java", "csharp", "cpp", "go",
	"rust", "ruby", "php", "swift", "kotlin", "sql", "html", "css",
	"json", "yaml", "markdown", "bash", "plaintext",
];

export function generateBlockId(): string {
	return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createBlock(type: BlockType): Block {
	const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
	if (!def) throw new Error(`Unknown block type: ${type}`);
	return {
		id: generateBlockId(),
		type,
		content: def.defaultContent,
		props: def.defaultProps ? { ...def.defaultProps } : undefined,
	};
}

/** Serialize editor blocks to the DB-compatible format (props → meta). */
export function serializeBlocks(blocks: Block[]): { id: string; type: string; content: string; meta?: Record<string, unknown> }[] {
	return blocks.map((b) => ({
		id: b.id,
		type: b.type,
		content: b.content,
		meta: b.props,
	}));
}

/** Deserialize DB blocks back to editor format (meta → props). */
export function deserializeBlocks(raw: { id: string; type: string; content: string; meta?: Record<string, unknown> }[]): Block[] {
	return raw.map((b) => ({
		id: b.id,
		type: b.type as BlockType,
		content: b.content,
		props: b.meta,
	}));
}

export function blocksToMarkdown(blocks: Block[]): string {
	return blocks.map((block) => {
		switch (block.type) {
			case "h1": return `# ${block.content}\n`;
			case "h2": return `## ${block.content}\n`;
			case "h3": return `### ${block.content}\n`;
			case "h4": return `#### ${block.content}\n`;
			case "paragraph": return `${block.content}\n`;
			case "blockquote": return `> ${block.content.split("\n").join("\n> ")}\n`;
			case "code": {
				const lang = block.props?.language || "plaintext";
				return `\`\`\`${lang}\n${block.content}\n\`\`\`\n`;
			}
			case "image": {
				const src = block.props?.src || "";
				const alt = block.props?.alt || "";
				const caption = block.props?.caption || "";
				return caption ? `![${alt}](${src})\n*${caption}*\n` : `![${alt}](${src})\n`;
			}
			case "separator": return `---\n`;
			case "ul":
			case "ol":
			case "task-list":
				return `${block.content}\n`;
			case "table": return `${block.content}\n`;
			case "alert": {
				const variant = (block.props?.variant as string) || "info";
				return `> [!${variant.toUpperCase()}]\n> ${block.content.split("\n").join("\n> ")}\n`;
			}
			case "diagram": return `\`\`\`mermaid\n${block.content}\n\`\`\`\n`;
			case "link": {
				const url = block.props?.url || "";
				const title = block.props?.title || url;
				return `[${title}](${url})\n`;
			}
			default: return `${block.content}\n`;
		}
	}).join("\n");
}
