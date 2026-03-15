import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShikiCodeBlockProps {
	code: string;
	lang: string;
}

type Highlighter = Awaited<ReturnType<typeof import("shiki")["createHighlighter"]>>;

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS = [
	"javascript", "typescript", "python", "java", "csharp", "cpp", "go",
	"rust", "ruby", "php", "swift", "kotlin", "sql", "html", "css",
	"json", "yaml", "markdown", "bash", "shellscript",
] as const;

type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function normalizeLang(lang: string): SupportedLang | "plaintext" {
	const l = lang.toLowerCase();
	if (l === "js") return "javascript";
	if (l === "ts") return "typescript";
	if (l === "py") return "python";
	if (l === "sh" || l === "shell" || l === "zsh") return "shellscript";
	if (l === "cs") return "csharp";
	if (l === "c++") return "cpp";
	if ((SUPPORTED_LANGS as readonly string[]).includes(l)) return l as SupportedLang;
	return "plaintext";
}

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = import("shiki").then(({ createHighlighter }) =>
			createHighlighter({
				themes: ["tokyo-night"],
				langs: [...SUPPORTED_LANGS],
			}),
		);
	}
	return highlighterPromise;
}

export function ShikiCodeBlock({ code, lang }: ShikiCodeBlockProps) {
	const [html, setHtml] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const cancelled = useRef(false);
	const normalizedLang = normalizeLang(lang);

	useEffect(() => {
		cancelled.current = false;
		if (!code?.trim()) {
			setHtml(null);
			return;
		}
		getHighlighter()
			.then((hl) => {
				if (cancelled.current) return;
				const out = hl.codeToHtml(code, { lang: normalizedLang, theme: "tokyo-night" });
				setHtml(out);
			})
			.catch(() => {
				if (!cancelled.current) setHtml(null);
			});
		return () => {
			cancelled.current = true;
		};
	}, [code, normalizedLang]);

	function handleCopy() {
		navigator.clipboard.writeText(code);
		setCopied(true);
		toast.success("Code copied!");
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="bg-[hsl(222,44%,10%)] rounded-xl my-6 overflow-hidden border border-[hsl(216,33%,20%)] text-sm">
			<div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(216,33%,20%)] bg-[hsl(222,47%,11%)]">
				<span className="text-xs text-[hsl(216,33%,50%)] uppercase font-mono">{lang || "code"}</span>
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center gap-1 text-xs text-[hsl(216,33%,60%)] hover:text-white transition-colors"
				>
					{copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>
			{html ? (
				<div
					className="overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:p-4 [&_code]:font-mono [&_code]:text-sm"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted shiki output
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="p-4 overflow-x-auto">
					<code className="font-mono text-[hsl(199,69%,84%)]">{code}</code>
				</pre>
			)}
		</div>
	);
}
