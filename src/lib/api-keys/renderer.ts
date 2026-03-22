import type { BlockData } from "@/lib/db/schema";

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderBlock(block: BlockData): string {
	const content = block.content ?? "";
	const meta = block.meta ?? {};

	switch (block.type) {
		case "heading": {
			const level = Math.min(Math.max(meta.level ?? 2, 1), 6);
			return `<h${level}>${escapeHtml(content)}</h${level}>`;
		}

		case "paragraph":
			return `<p>${escapeHtml(content)}</p>`;

		case "blockquote":
			return `<blockquote>${escapeHtml(content)}</blockquote>`;

		case "code": {
			const lang = meta.language ? ` class="language-${escapeHtml(String(meta.language))}"` : "";
			return `<pre><code${lang}>${escapeHtml(content)}</code></pre>`;
		}

		case "image": {
			const url = meta.url ?? content;
			const alt = meta.alt ?? "";
			const caption = meta.caption ?? "";
			let html = `<figure><img src="${escapeHtml(String(url))}" alt="${escapeHtml(String(alt))}" loading="lazy" />`;
			if (caption) {
				html += `<figcaption>${escapeHtml(String(caption))}</figcaption>`;
			}
			return `${html}</figure>`;
		}

		case "video": {
			const url = meta.url ?? content;
			return `<figure><video src="${escapeHtml(String(url))}" controls></video></figure>`;
		}

		case "list": {
			const tag = meta.ordered ? "ol" : "ul";
			const items = content
				.split("\n")
				.filter((line) => line.trim())
				.map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s*/, ""))}</li>`)
				.join("");
			return `<${tag}>${items}</${tag}>`;
		}

		case "divider":
			return "<hr />";

		case "alert": {
			const variant = meta.variant ?? "info";
			return `<div class="alert alert-${escapeHtml(String(variant))}">${escapeHtml(content)}</div>`;
		}

		case "callout": {
			const variant = meta.variant ?? "info";
			return `<div class="callout callout-${escapeHtml(String(variant))}">${escapeHtml(content)}</div>`;
		}

		case "table": {
			try {
				const rows: string[][] = typeof content === "string" && content.startsWith("[")
					? JSON.parse(content)
					: content.split("\n").map((row) => row.split("|").map((c) => c.trim()));

				if (rows.length === 0) return "";

				const [header, ...body] = rows;
				let html = "<table><thead><tr>";
				for (const cell of header) {
					html += `<th>${escapeHtml(cell)}</th>`;
				}
				html += "</tr></thead><tbody>";
				for (const row of body) {
					html += "<tr>";
					for (const cell of row) {
						html += `<td>${escapeHtml(cell)}</td>`;
					}
					html += "</tr>";
				}
				return `${html}</tbody></table>`;
			} catch {
				return `<pre>${escapeHtml(content)}</pre>`;
			}
		}

		case "embed": {
			const url = meta.url ?? content;
			return `<div class="embed"><iframe src="${escapeHtml(String(url))}" frameborder="0" allowfullscreen></iframe></div>`;
		}

		case "math":
			return `<div class="math">${escapeHtml(content)}</div>`;

		case "diagram":
			return `<div class="diagram">${escapeHtml(content)}</div>`;

		default:
			return content ? `<p>${escapeHtml(content)}</p>` : "";
	}
}

export function renderBlocksToHtml(blocks: BlockData[]): string {
	return blocks.map(renderBlock).join("\n");
}
