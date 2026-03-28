CREATE TABLE IF NOT EXISTS "free_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"period_start" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_reads" ADD CONSTRAINT "free_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "free_reads_user_period_idx" ON "free_reads" USING btree ("user_id","period_start");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "free_reads_user_post_period_uidx" ON "free_reads" USING btree ("user_id","post_id","period_start");
