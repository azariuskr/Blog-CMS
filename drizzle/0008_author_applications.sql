-- Phase D2: Author application flow
-- Adds application tracking fields to author_profiles table.

ALTER TABLE "author_profiles"
  ADD COLUMN IF NOT EXISTS "application_status" varchar(20),
  ADD COLUMN IF NOT EXISTS "accepted_policy" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "author_profiles_application_status_idx"
  ON "author_profiles" ("application_status");
