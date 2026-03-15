export function getBasePathFromBaseUrl(baseUrl: string): string {
	try {
		const u = new URL(baseUrl);
		return u.pathname.replace(/\/$/, "");
	} catch {
		return "";
	}
}

/**
 * Prefix an absolute-path ("/api/...", "/auth/..." etc.) with the basePath derived
 * from a full baseUrl (e.g. https://host/blog => basePath="/blog").
 *
 * Idempotent: if `path` already starts with basePath, it is returned unchanged.
 */
export function withBasePath(baseUrl: string, path: string): string {
	const basePath = getBasePathFromBaseUrl(baseUrl);
	if (!basePath) return path;
	if (!path.startsWith("/")) return path;
	if (
		path === basePath ||
		path.startsWith(`${basePath}/`) ||
		path.startsWith(`${basePath}?`) ||
		path.startsWith(`${basePath}#`)
	)
		return path;
	return `${basePath}${path}`;
}

/**
 * Strip basePath from a path before passing it to a router that already has `basepath` configured.
 * Example: baseUrl=https://host/blog, path=/blog/auth => /auth
 */
export function stripBasePath(baseUrl: string, path: string): string {
	const basePath = getBasePathFromBaseUrl(baseUrl);
	if (!basePath) return path;
	if (!path.startsWith("/")) return path;
	if (path === basePath) return "/";
	if (path.startsWith(`${basePath}/`)) return path.slice(basePath.length);
	if (path.startsWith(`${basePath}?`) || path.startsWith(`${basePath}#`)) {
		return `/${path.slice(basePath.length)}`;
	}
	return path;
}
