-- Schema for the member check app. Safe to run many times (idempotent).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS members (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,              -- original name, shown to the user
  search_name TEXT        NOT NULL,              -- normalized name (see src/lib/normalize.ts)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT members_search_name_unique UNIQUE (search_name)
);

-- Trigram index so ILIKE '%...%' search stays fast when data grows.
CREATE INDEX IF NOT EXISTS members_search_name_trgm
  ON members USING gin (search_name gin_trgm_ops);

-- Access tokens. We only store the SHA-256 hash, never the real token.
CREATE TABLE IF NOT EXISTS access_tokens (
  id           BIGSERIAL PRIMARY KEY,
  token_hash   TEXT        NOT NULL UNIQUE,
  label        TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
