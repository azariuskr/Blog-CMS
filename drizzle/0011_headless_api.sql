-- Phase 8: Headless CMS Public API
-- Adds API key management, webhook support, and post visibility

-- Post visibility enum
CREATE TYPE post_visibility AS ENUM ('public', 'external', 'both');

-- Add visibility column to posts (metadata-only operation with DEFAULT in PG 11+)
ALTER TABLE posts
  ADD COLUMN visibility post_visibility NOT NULL DEFAULT 'public';

-- Composite index for API feed queries
CREATE INDEX posts_site_visibility_idx
  ON posts (site_id, visibility, status, published_at DESC);

-- API keys table
CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  key_hash        text NOT NULL UNIQUE,
  key_prefix      varchar(12) NOT NULL,
  site_id         uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_by      text NOT NULL REFERENCES "user"(id),
  rate_limit_rpm  integer NOT NULL DEFAULT 60,
  allowed_origins text[],
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_site_idx ON api_keys (site_id);

-- API webhooks table
CREATE TABLE api_webhooks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id       uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url              text NOT NULL,
  secret           text NOT NULL,
  events           text[] NOT NULL DEFAULT ARRAY['post.published', 'post.updated', 'post.deleted'],
  is_active        boolean NOT NULL DEFAULT true,
  last_fired_at    timestamptz,
  last_status_code integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_webhooks_key_idx ON api_webhooks (api_key_id);
