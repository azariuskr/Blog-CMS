/**
 * MDX Renderer — compiles a posts.content MDX string into React elements.
 * Used as the rich rendering path when posts.content is available.
 *
 * Lazy-compiled: evaluates MDX in the browser using @mdx-js/mdx.
 * Falls back to the block-renderer when content is unavailable.
 */
"use client";

import { useEffect, useState } from "react";
import * as runtime from "react/jsx-runtime";
import { compile, run } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

interface MdxRendererProps {
	content: string;
	className?: string;
}

type MdxModule = { default: React.ComponentType };

// Singleton compile cache to avoid re-compiling the same content
const compileCache = new Map<string, MdxModule>();

async function compileMdx(content: string): Promise<MdxModule> {
	if (compileCache.has(content)) return compileCache.get(content)!;

	const code = await compile(content, {
		outputFormat: "function-body",
		remarkPlugins: [remarkGfm],
		rehypePlugins: [],
	});

	// biome-ignore lint/security/noNewFunction: MDX compilation requires dynamic evaluation
	const mod = (await run(code, {
		...runtime,
		baseUrl: import.meta.url,
	})) as MdxModule;

	compileCache.set(content, mod);
	return mod;
}

export function MdxRenderer({ content, className }: MdxRendererProps) {
	const [Component, setComponent] = useState<React.ComponentType | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setComponent(null);
		setError(null);

		compileMdx(content)
			.then((mod) => {
				if (!cancelled) setComponent(() => mod.default);
			})
			.catch((err: unknown) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "MDX render failed");
			});

		return () => {
			cancelled = true;
		};
	}, [content]);

	if (error) {
		return (
			<p className="text-destructive text-sm p-4 rounded border border-destructive/30 bg-destructive/5">
				Failed to render content: {error}
			</p>
		);
	}

	if (!Component) {
		return (
			<div className="space-y-3 animate-pulse">
				{[100, 90, 80, 95].map((w, i) => (
					<div key={i} className="h-4 rounded bg-muted" style={{ width: `${w}%` }} />
				))}
			</div>
		);
	}

	return (
		<div className={className}>
			<Component />
		</div>
	);
}
