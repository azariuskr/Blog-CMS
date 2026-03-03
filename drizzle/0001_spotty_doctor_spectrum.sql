CREATE TABLE "platform_route_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"route" text NOT NULL,
	"kind" text DEFAULT 'page' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"connector" text DEFAULT 'AND' NOT NULL,
	"required_permissions" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_route_policies_route_kind_idx" ON "platform_route_policies" USING btree ("route","kind");