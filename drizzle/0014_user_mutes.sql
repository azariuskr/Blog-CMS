CREATE TABLE IF NOT EXISTS "user_mutes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "muted_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "muted_user_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_mutes_user_idx" ON "user_mutes" ("user_id");
