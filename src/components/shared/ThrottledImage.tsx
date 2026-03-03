import * as React from "react";
import { useImageLoadQueue } from "@/lib/performance/image-load-queue";

type ThrottledImageProps = Omit<
	React.ComponentProps<"img">,
	"src" | "loading" | "decoding"
> & {
	src?: string | null;
	rootMargin?: string;
	placeholder?: React.ReactNode;
};

export function ThrottledImage({
	src,
	alt,
	rootMargin = "200px",
	placeholder,
	className,
	...props
}: ThrottledImageProps) {
	const { load } = useImageLoadQueue();
	const wrapperRef = React.useRef<HTMLSpanElement | null>(null);
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
						// Ignore failed images; keep placeholder/fallback.
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

	if (!resolvedSrc) {
		return (
			<span ref={wrapperRef} className={className}>
				{placeholder ?? null}
			</span>
		);
	}

	return (
		<img
			{...props}
			ref={undefined}
			src={resolvedSrc}
			alt={alt}
			className={className}
			loading="lazy"
			decoding="async"
			fetchPriority="low"
		/>
	);
}
