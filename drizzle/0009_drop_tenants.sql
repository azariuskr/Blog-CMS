-- Drop old tenant FK from sites, add organization_id column
ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "sites_tenant_id_tenants_id_fk";
DROP INDEX IF EXISTS "sites_tenant_idx";
ALTER TABLE "sites" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "organization_id" text REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "sites_org_idx" ON "sites" ("organization_id");

-- Drop old tenant tables
DROP TABLE IF EXISTS "tenant_members";
DROP TABLE IF EXISTS "tenants";
