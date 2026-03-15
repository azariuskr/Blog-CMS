import { describe, expect, it } from "vitest";
import {
	getBasePathFromBaseUrl,
	stripBasePath,
	withBasePath,
} from "./with-base-path";

describe("with-base-path utils", () => {
	it("extracts base path from URL", () => {
		expect(getBasePathFromBaseUrl("https://example.com/blog")).toBe("/blog");
		expect(getBasePathFromBaseUrl("https://example.com/blog/")).toBe("/blog");
		expect(getBasePathFromBaseUrl("https://example.com/blog?tab=1")).toBe("/blog");
		expect(getBasePathFromBaseUrl("https://example.com/blog/#hash")).toBe("/blog");
		expect(getBasePathFromBaseUrl("https://example.com")).toBe("");
		expect(getBasePathFromBaseUrl("https://example.com/")).toBe("");
		expect(getBasePathFromBaseUrl("not-a-url")).toBe("");
	});

	it("prefixes absolute paths with base path idempotently", () => {
		expect(withBasePath("https://example.com/blog", "/auth/login")).toBe(
			"/blog/auth/login",
		);
		expect(withBasePath("https://example.com/blog", "/blog/auth/login")).toBe(
			"/blog/auth/login",
		);
		expect(
			withBasePath("https://example.com/blog", "/blog/auth/login?next=%2Fapp"),
		).toBe("/blog/auth/login?next=%2Fapp");
		expect(withBasePath("https://example.com/blog", "/blog")).toBe("/blog");
		expect(withBasePath("https://example.com", "/auth/login")).toBe(
			"/auth/login",
		);
		expect(
			withBasePath("https://example.com/blog", "/auth/login?next=%2Fapp"),
		).toBe("/blog/auth/login?next=%2Fapp");
		expect(withBasePath("https://example.com/blog", "/blog?tab=security")).toBe(
			"/blog?tab=security",
		);
		expect(withBasePath("https://example.com/blog", "/auth/login#magic")).toBe(
			"/blog/auth/login#magic",
		);
		expect(withBasePath("https://example.com/blog", "auth/login")).toBe(
			"auth/login",
		);
		expect(withBasePath("https://example.com/blog", "/blog#magic")).toBe(
			"/blog#magic",
		);
	});

	it("strips base path for router-bound paths", () => {
		expect(stripBasePath("https://example.com/blog", "/blog/auth/login")).toBe(
			"/auth/login",
		);
		expect(stripBasePath("https://example.com/blog", "/blog")).toBe("/");
		expect(stripBasePath("https://example.com/blog", "/auth/login")).toBe(
			"/auth/login",
		);
		expect(stripBasePath("https://example.com", "/auth/login")).toBe(
			"/auth/login",
		);
		expect(stripBasePath("https://example.com", "/auth/login#magic")).toBe(
			"/auth/login#magic",
		);
		expect(
			stripBasePath("https://example.com/blog", "/blog/auth/login?next=%2Fapp"),
		).toBe("/auth/login?next=%2Fapp");
		expect(stripBasePath("https://example.com/blog", "/blog/")).toBe("/");
		expect(
			stripBasePath("https://example.com/blog", "/blog?tab=security"),
		).toBe("/?tab=security");
		expect(stripBasePath("https://example.com/blog", "/blog#magic")).toBe(
			"/#magic",
		);
		expect(
			stripBasePath("https://example.com/blog", "/blog/?tab=security"),
		).toBe("/?tab=security");
		expect(
			stripBasePath("https://example.com/blog", "/blog/auth/login#magic"),
		).toBe("/auth/login#magic");
		expect(stripBasePath("https://example.com/blog", "auth/login")).toBe(
			"auth/login",
		);
	});
});
