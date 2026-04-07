-- Phase 2: Role model + plan fields + site ownership
-- Applied directly to DB (drizzle-kit journal out of sync after 0010)

-- User plan fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan" text NOT NULL DEFAULT 'free';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan_expires_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan_sites_limit" integer NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;

-- Site ownership
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "owner_id" text REFERENCES "user"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_owner_idx" ON "sites" USING btree ("owner_id");
