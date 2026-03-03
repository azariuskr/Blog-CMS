import { useEffect, useState } from "react";

type DelayedPendingProps = {
	delayMs?: number;
	children: React.ReactNode;
};

export function DelayedPending({
	delayMs = 200,
	children,
}: DelayedPendingProps) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const t = window.setTimeout(() => setShow(true), delayMs);
		return () => window.clearTimeout(t);
	}, [delayMs]);

	if (!show) return null;
	return <>{children}</>;
}
