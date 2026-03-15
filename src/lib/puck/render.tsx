/**
 * SSR-safe Puck renderer.
 * Wraps @measured/puck's <Render> so it only executes client-side.
 * Falls back to a skeleton on the server.
 */
"use client";

import { lazy, Suspense } from "react";
import type { Data } from "@measured/puck";
import { puckConfig } from "./config";

// Lazy-import Render to avoid SSR issues with Puck's drag context
const PuckRender = lazy(async () => {
	const { Render } = await import("@measured/puck");
	return { default: Render };
});

interface PuckPageProps {
	data: Data;
	className?: string;
}

export function PuckPage({ data, className }: PuckPageProps) {
	return (
		<div className={className}>
			<Suspense fallback={<div className="animate-pulse space-y-4 p-8">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-prussian-blue" />)}</div>}>
				<PuckRender config={puckConfig} data={data} />
			</Suspense>
		</div>
	);
}
