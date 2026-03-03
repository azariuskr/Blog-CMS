# Conventions (from AGENTS.md)

- Prefer centralized constants/keys in `src/constants.ts` (`ROUTES`, `QUERY_KEYS`, `MESSAGES`, `ROLES`).
- Auth/permissions derive from `src/lib/auth/permissions.ts` + `src/lib/auth/navigation.ts`.
- Use Better Auth client hooks via `src/hooks/auth-hooks.ts`.
- Use Result helpers in `src/lib/result.ts` and Zod validation helpers in `src/lib/validation.ts`.
- Use `src/hooks/use-action.ts` for mutation flows (toasts, validation errors, invalidation).
- Avoid inline comments unless necessary; keep patterns consistent.
