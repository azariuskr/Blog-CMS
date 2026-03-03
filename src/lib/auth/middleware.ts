import { createMiddleware } from "@tanstack/react-start";
import { unauthorized } from "../result";
import { AppRole, MESSAGES } from "@/constants";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { auth } from "./auth";

export type AccessConfig = {
  requireAuth?: boolean;
  permissions?: Record<string, string[]>;
  minRole?: AppRole;
};

/**
 * Middleware to require authentication on server requests
 * Adds authenticated user to context
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const { forwardSetCookies } = await import("./server");

  const session = await auth.api.getSession({
    headers: getRequest().headers,
    query: {
      disableCookieCache: true,
    },
    returnHeaders: true,
  });

  forwardSetCookies(session.headers);

  const user = session?.response?.user;

  if (!user) {
    setResponseStatus(401);
    throw unauthorized(MESSAGES.ERROR.UNAUTHORIZED);
  }

  return next({ context: { user } });
});

export async function resolveAccess(config: AccessConfig) {
  const { requireAuth, requirePermission, requireMinRole } = await import("./server");

  let user: any = null;

  if (config.permissions) {
    const r = await requirePermission(config.permissions);
    if (!r.ok) return r as any;
    user = r.data.user;
  } else if (config.minRole) {
    const r = await requireMinRole(config.minRole);
    if (!r.ok) return r as any;
    user = r.data.user;
  } else if (config.requireAuth !== false) {
    const r = await requireAuth();
    if (!r.ok) return r as any;
    user = r.data.user;
  }

  return { ok: true as const, data: { user } };
}

export const accessMiddleware = (config: AccessConfig = {}) =>
  createMiddleware().server(async ({ next }) => {
    const r = await resolveAccess(config);
    if (!r.ok) return r as any;

    const user = r.data.user;
    return next({ context: { user } });
  });
