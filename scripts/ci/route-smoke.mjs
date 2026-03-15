import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const routeTreePath = resolve(root, "src/routeTree.gen.ts");

if (!existsSync(routeTreePath)) {
  console.error("[route-smoke] Missing src/routeTree.gen.ts");
  process.exit(1);
}

const text = readFileSync(routeTreePath, "utf8");

const requiredRoutes = [
  "/auth/callback/verify-email",
  "/auth/callback/accept-invitation",
  "/auth/$authView",
  "/account/organizations",
  "/org/$organizationView",
  "/org/$slug/$organizationView",
  "/dashboard",
  "/admin",
];

const missing = requiredRoutes.filter((r) => !text.includes(r));

if (missing.length) {
  console.error("[route-smoke] Missing required routes:\n" + missing.map((m) => ` - ${m}`).join("\n"));
  process.exit(1);
}

console.log("[route-smoke] OK");
