-- Phase 8.4: Full-text search index on posts (title + excerpt)
-- Uses a functional GIN index so existing rows are indexed immediately.

CREATE INDEX "posts_fts_idx" ON "posts" USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("excerpt", ''))
);
