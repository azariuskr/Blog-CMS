import { useCallback, useRef, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../blockTypes";
import type { Block } from "../blockTypes";

interface CodeBlockProps {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

export function CodeBlock({ block, onUpdate }: CodeBlockProps) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [language, setLanguage] = useState((block.props?.language as string) ?? "javascript");
	const [copied, setCopied] = useState(false);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onUpdate({ content: e.target.value });
	}, [onUpdate]);

	const handleLang = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		const lang = e.target.value;
		setLanguage(lang);
		onUpdate({ props: { ...block.props, language: lang } });
	}, [onUpdate, block.props]);

	const handleCopy = useCallback(() => {
		if (!block.content) return;
		navigator.clipboard.writeText(block.content).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [block.content]);

	useEffect(() => {
		if (ref.current) {
			ref.current.style.height = "auto";
			ref.current.style.height = Math.max(100, ref.current.scrollHeight) + "px";
		}
	}, [block.content]);

	return (
		<div className="rounded-lg bg-[hsl(222,47%,8%)] border border-[hsl(216,33%,20%)] overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 bg-[hsl(222,44%,11%)] border-b border-[hsl(216,33%,20%)]">
				<select
					value={language}
					onChange={handleLang}
					className="bg-[hsl(216,33%,20%)] text-[hsl(216,100%,95%)] text-sm rounded px-2 py-1 border-none outline-none cursor-pointer"
				>
					{SUPPORTED_LANGUAGES.map((lang) => (
						<option key={lang} value={lang}>{lang}</option>
					))}
				</select>
				<button
					type="button"
					onClick={handleCopy}
					title="Copy code"
					className="flex items-center gap-1.5 text-xs text-[hsl(216,33%,50%)] hover:text-[hsl(199,89%,49%)] transition-colors"
				>
					{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>
			<textarea
				ref={ref}
				value={block.content}
				onChange={handleChange}
				className="w-full bg-transparent border-none outline-none resize-none text-green-400 font-mono text-sm p-4 placeholder:text-[hsl(216,33%,30%)]"
				placeholder="// Enter your code here..."
				rows={4}
				spellCheck={false}
			/>
		</div>
	);
}
