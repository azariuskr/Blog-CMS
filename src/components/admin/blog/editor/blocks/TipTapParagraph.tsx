import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import { Bold, Italic, Code, Link as LinkIcon } from "lucide-react";
import type { Block } from "../blockTypes";

interface Props {
	block: Block;
	onUpdate: (updates: Partial<Block>) => void;
}

function ToolbarButton({
	active,
	onClick,
	title,
	children,
}: {
	active?: boolean;
	onClick: () => void;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			title={title}
			onMouseDown={(e) => {
				e.preventDefault();
				onClick();
			}}
			className={`p-1 rounded text-xs transition-colors ${
				active
					? "bg-[hsl(199,89%,49%)]/20 text-[hsl(199,89%,49%)]"
					: "text-[hsl(216,33%,50%)] hover:text-[hsl(199,89%,49%)] hover:bg-[hsl(199,89%,49%)]/10"
			}`}
		>
			{children}
		</button>
	);
}

export function TipTapParagraph({ block, onUpdate }: Props) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				// Disable block-level nodes we don't need in paragraph
				heading: false,
				blockquote: false,
				codeBlock: false,
				horizontalRule: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-[hsl(199,89%,49%)] underline underline-offset-2",
					rel: "noopener noreferrer",
					target: "_blank",
				},
			}),
		],
		content: block.content || "",
		onUpdate: ({ editor: e }) => {
			onUpdate({ content: e.getHTML() });
		},
		editorProps: {
			attributes: {
				class:
					"w-full bg-transparent border-none outline-none text-[hsl(217,24%,59%)] text-base leading-relaxed min-h-[1.5em] focus:outline-none",
			},
		},
	});

	// Sync external content changes (e.g. version restore)
	useEffect(() => {
		if (!editor) return;
		const current = editor.getHTML();
		if (block.content !== current) {
			editor.commands.setContent(block.content || "");
		}
	}, [block.content, editor]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const prev = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("Enter URL", prev ?? "https://");
		if (!url) {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor) return null;

	const hasFocus = editor.isFocused;
	const isActive = (mark: string) => editor.isActive(mark);

	return (
		<div className="relative group/tiptap">
			{/* Inline toolbar — shows on focus */}
			{hasFocus && (
				<div className="absolute -top-8 left-0 z-10 flex items-center gap-0.5 rounded-md border border-[hsl(216,33%,20%)] bg-[hsl(222,44%,13%)] px-1 py-0.5 shadow-lg">
					<ToolbarButton
						title="Bold (⌘B)"
						active={isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<Bold className="h-3.5 w-3.5" />
					</ToolbarButton>
					<ToolbarButton
						title="Italic (⌘I)"
						active={isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<Italic className="h-3.5 w-3.5" />
					</ToolbarButton>
					<ToolbarButton
						title="Inline code"
						active={isActive("code")}
						onClick={() => editor.chain().focus().toggleCode().run()}
					>
						<Code className="h-3.5 w-3.5" />
					</ToolbarButton>
					<div className="w-px h-3 bg-[hsl(216,33%,25%)] mx-0.5" />
					<ToolbarButton
						title="Link"
						active={isActive("link")}
						onClick={setLink}
					>
						<LinkIcon className="h-3.5 w-3.5" />
					</ToolbarButton>
				</div>
			)}

			<EditorContent
				editor={editor}
				placeholder="Start writing…"
			/>
		</div>
	);
}
