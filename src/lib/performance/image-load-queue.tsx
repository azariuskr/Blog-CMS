import { useAsyncQueuer } from "@tanstack/react-pacer/async-queuer";
import * as React from "react";

type ImageLoadQueueContextValue = {
	load: (src: string) => Promise<void>;
};

const ImageLoadQueueContext =
	React.createContext<ImageLoadQueueContextValue | null>(null);

async function preloadImage(src: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
		img.src = src;
	});

	// Best-effort decode to reduce main-thread jank on insertion.
	try {
		const img = new Image();
		img.src = src;
		if (typeof img.decode === "function") {
			await img.decode();
		}
	} catch {
		// ignore
	}
}

export function ImageLoadQueueProvider({
	children,
	concurrency = 4,
	maxSize = 500,
}: {
	children: React.ReactNode;
	concurrency?: number;
	maxSize?: number;
}) {
	const inFlight = React.useRef(new Map<string, Promise<void>>());

	const queuer = useAsyncQueuer(async (task: () => Promise<void>) => task(), {
		concurrency,
		maxSize,
		started: true,
		throwOnError: false,
	});

	const load = React.useCallback(
		(src: string) => {
			const existing = inFlight.current.get(src);
			if (existing) return existing;

			let resolvePromise: () => void;
			let rejectPromise: (error: unknown) => void;

			const promise = new Promise<void>((resolve, reject) => {
				resolvePromise = resolve;
				rejectPromise = reject;
			});

			inFlight.current.set(src, promise);

			queuer.addItem(async () => {
				try {
					await preloadImage(src);
					resolvePromise();
				} catch (error) {
					rejectPromise(error);
				} finally {
					inFlight.current.delete(src);
				}
			});

			return promise;
		},
		[queuer],
	);

	return (
		<ImageLoadQueueContext.Provider value={{ load }}>
			{children}
		</ImageLoadQueueContext.Provider>
	);
}

export function useImageLoadQueue() {
	const ctx = React.useContext(ImageLoadQueueContext);
	if (!ctx) {
		throw new Error(
			"useImageLoadQueue must be used within ImageLoadQueueProvider",
		);
	}
	return ctx;
}
