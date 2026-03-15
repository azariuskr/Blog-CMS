export type BlogDataMode = "live" | "mock" | "hybrid";

export function getBlogDataMode(): BlogDataMode {
	const value = (
		(typeof process !== "undefined" ? process.env.BLOG_DATA_MODE : undefined) ??
		(typeof import.meta !== "undefined" ? import.meta.env?.VITE_BLOG_DATA_MODE : undefined) ??
		"hybrid"
	).toLowerCase();

	if (value === "live" || value === "mock" || value === "hybrid") {
		return value;
	}

	return "hybrid";
}
