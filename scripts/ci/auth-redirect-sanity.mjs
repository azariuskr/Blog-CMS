import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const authPagesRoute = resolve(root, "src/routes/(auth-pages)/route.tsx");
const text = readFileSync(authPagesRoute, "utf8");

const mustContain = [
  "ROUTES.AUTH.CALLBACK.VERIFY_EMAIL",
  "ROUTES.AUTH.CALLBACK.ACCEPT_INVITATION",
  "/auth/callback/accept-invitation",
  "/auth/accept-invitation",
];

const missing = mustContain.filter((s) => !text.includes(s));
if (missing.length) {
  console.error("[auth-redirect-sanity] Missing required guard allowances:\n" + missing.map((m) => ` - ${m}`).join("\n"));
  process.exit(1);
}

console.log("[auth-redirect-sanity] OK");
