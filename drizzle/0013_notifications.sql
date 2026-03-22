DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE "public"."notification_type" AS ENUM('comment_reply','new_follower','post_reaction','post_published','author_approved','author_rejected','post_comment');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "type" "notification_type" NOT NULL,
  "post_id" uuid REFERENCES "posts"("id") ON DELETE CASCADE,
  "comment_id" uuid REFERENCES "comments"("id") ON DELETE CASCADE,
  "message" text,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
