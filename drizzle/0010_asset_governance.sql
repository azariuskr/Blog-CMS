-- Migration: Asset governance — org scoping, soft deletion, usage quota tracking
-- Adds orgId (nullable) for org-shared assets, deletedAt for safe soft-delete,
-- and a per-user/org storage quota tracking table.

ALTER TABLE "file"
  ADD COLUMN IF NOT EXISTS "org_id" text REFERENCES "organization"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "is_org_shared" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "file_org_id_idx" ON "file" ("org_id");
CREATE INDEX IF NOT EXISTS "file_deleted_at_idx" ON "file" ("deleted_at");

-- Storage quota snapshots (updated on each upload/delete)
CREATE TABLE IF NOT EXISTS "storage_quota" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_type" text NOT NULL, -- 'user' | 'org'
  "owner_id" text NOT NULL,
  "used_bytes" bigint DEFAULT 0 NOT NULL,
  "limit_bytes" bigint DEFAULT 524288000 NOT NULL, -- 500 MB default
  "file_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("owner_type", "owner_id")
);

CREATE INDEX IF NOT EXISTS "storage_quota_owner_idx" ON "storage_quota" ("owner_type", "owner_id");
