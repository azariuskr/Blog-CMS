import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const contentSchemaPath = resolve(root, "src/lib/blog/content-schema.ts");
const functionsPath = resolve(root, "src/lib/blog/functions.ts");

const contentSchema = readFileSync(contentSchemaPath, "utf8");
const functions = readFileSync(functionsPath, "utf8");

const contentSchemaMustContain = [
  "export const POST_SCHEMA_VERSION",
  "export const PostBlockSchema",
  "export const PostContentSchema",
];

const functionsMustContain = [
  "PostContentSchema",
  "normalizeContentEnvelope",
  "schemaVersion",
  "SCHEMA_VERSION_META_KEY",
  "withCanonicalContent",
];

const missing = [
  ...contentSchemaMustContain
    .filter((s) => !contentSchema.includes(s))
    .map((s) => `[content-schema] ${s}`),
  ...functionsMustContain
    .filter((s) => !functions.includes(s))
    .map((s) => `[functions] ${s}`),
];

if (missing.length > 0) {
  console.error("[blog-schema-contract] Missing canonical schema wiring:\n" + missing.map((m) => ` - ${m}`).join("\n"));
  process.exit(1);
}

console.log("[blog-schema-contract] OK");
