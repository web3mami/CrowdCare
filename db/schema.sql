-- Run in Neon (SQL Editor) or psql against your DATABASE_URL.
-- Stores user-created campaigns so hub links work for everyone.

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  creator_sub TEXT NOT NULL,
  share_slug TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_share_slug ON campaigns (share_slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_sub ON campaigns (creator_sub);
