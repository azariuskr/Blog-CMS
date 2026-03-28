CREATE TABLE IF NOT EXISTS "user_interests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "category_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_interests_user_idx" ON "user_interests" ("user_id");
