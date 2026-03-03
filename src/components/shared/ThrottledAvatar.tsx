import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useImageLoadQueue } from "@/lib/performance/image-load-queue";

export function ThrottledAvatar({
	src,
	alt,
	fallback,
	className,
	rootMargin = "200px",
}: {
	src?: string | null;
	alt: string;
	fallback: string;
	className?: string;
	rootMargin?: string;
}) {
	const { load } = useImageLoadQueue();
	const wrapperRef = React.useRef<HTMLDivElement | null>(null);
	const [resolvedSrc, setResolvedSrc] = React.useState<string | undefined>(
		undefined,
	);

	React.useEffect(() => {
		setResolvedSrc(undefined);
		if (!src) return;
		const el = wrapperRef.current;
		if (!el) return;

		let cancelled = false;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting) return;

				observer.disconnect();

				load(src)
					.then(() => {
						if (cancelled) return;
						setResolvedSrc(src);
					})
					.catch(() => {
						// Ignore failed images; fallback will render.
					});
			},
			{ root: null, rootMargin, threshold: 0.01 },
		);

		observer.observe(el);

		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [load, rootMargin, src]);

	return (
		<div ref={wrapperRef}>
			<Avatar className={className}>
				<AvatarImage
					src={resolvedSrc}
					alt={alt}
					loading="lazy"
					decoding="async"
					fetchPriority="low"
				/>
				<AvatarFallback className="bg-muted text-muted-foreground">
					{fallback}
				</AvatarFallback>
			</Avatar>
		</div>
	);
}
