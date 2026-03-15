import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = [
  join(ROOT, "src/components/admin"),
  join(ROOT, "src/components/shared"),
  join(ROOT, "src/routes/(authenticated)"),
];
const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignoredDirs = new Set(["node_modules", ".git", "dist", ".output", "coverage"]);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const HSL = /\bhsl\([^)]*\)/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const KNOWN_EXCEPTIONS = new Set([
  join(ROOT, "src/components/o-auth-icons.tsx"),
  join(ROOT, "src/routes/(authenticated)/admin/blog/categories.tsx"),
  join(ROOT, "src/routes/(authenticated)/editor/new.tsx"),
]);

const files = SCAN_ROOTS.flatMap((root) => walk(root)).filter((f) => {
  if (KNOWN_EXCEPTIONS.has(f)) return false;
  const dot = f.lastIndexOf(".");
  return dot > -1 && exts.has(f.slice(dot));
});

const violations = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  const hexMatches = [...content.matchAll(HEX)];
  const hslMatches = [...content.matchAll(HSL)];

  for (const m of [...hexMatches, ...hslMatches]) {
    const v = m[0];
    // Allow hash fragments in URLs/imports like '#section'
    if (v.length <= 4 && v.startsWith("#")) continue;

    violations.push(`${file.replace(ROOT + "/", "")}: ${v}`);
    if (violations.length >= 50) break;
  }
  if (violations.length >= 50) break;
}

if (violations.length) {
  console.error("[no-hardcoded-colors] Found hardcoded colors in source files:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("[no-hardcoded-colors] OK");
