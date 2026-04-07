-- Phase 19: Encrypted API key storage + admin site gifting metadata

-- api_keys: store AES-256-GCM ciphertext of the raw key for permanent copy button
ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "key_encrypted" text;

-- sites: admin gifting flags
ALTER TABLE "sites"
  ADD COLUMN IF NOT EXISTS "granted_by_admin" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "granted_until"    timestamp;
