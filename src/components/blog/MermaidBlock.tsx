import { useEffect, useRef, useState } from "react";

interface MermaidBlockProps {
	code: string;
	id: string;
}

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function getMermaid() {
	if (!mermaidPromise) {
		mermaidPromise = import("mermaid").then((m) => {
			const mermaid = m.default;
			mermaid.initialize({
				startOnLoad: false,
				theme: "dark",
				themeVariables: {
					primaryColor: "hsl(199,89%,49%)",
					background: "hsl(222,47%,11%)",
					mainBkg: "hsl(222,44%,13%)",
					nodeBorder: "hsl(216,33%,30%)",
					clusterBkg: "hsl(216,33%,20%)",
					titleColor: "hsl(216,100%,95%)",
					edgeLabelBackground: "hsl(222,44%,13%)",
					lineColor: "hsl(199,89%,49%)",
					textColor: "hsl(217,24%,59%)",
					fontFamily: "inherit",
				},
			});
			return mermaid;
		});
	}
	return mermaidPromise;
}

export function MermaidBlock({ code, id }: MermaidBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [rendered, setRendered] = useState(false);

	useEffect(() => {
		if (!code?.trim()) return;
		let cancelled = false;

		getMermaid().then(async (mermaid) => {
			if (cancelled) return;
			try {
				const uniqueId = `mermaid-${id}-${Date.now()}`;
				const { svg } = await mermaid.render(uniqueId, code);
				if (!cancelled && containerRef.current) {
					containerRef.current.innerHTML = svg;
					setRendered(true);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Diagram render failed");
				}
			}
		});

		return () => {
			cancelled = true;
		};
	}, [code, id]);

	if (error) {
		return (
			<div className="my-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
				<p className="text-xs text-destructive mb-2">Diagram error: {error}</p>
				<pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{code}</pre>
			</div>
		);
	}

	return (
		<div className="my-6 rounded-xl border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] p-4 overflow-x-auto">
			{!rendered && (
				<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
					<span className="animate-pulse">Rendering diagram…</span>
				</div>
			)}
			<div
				ref={containerRef}
				className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
				style={{ display: rendered ? undefined : "none" }}
			/>
		</div>
	);
}
