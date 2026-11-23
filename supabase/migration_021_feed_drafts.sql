-- ============================================================
-- Migration 021 — Rewrite drafts on Lesen posts
-- A post you read can be rewritten in your own words (side panel).
-- When marked ready, Claude sends it to the EDEN scheduler as a draft
-- and stores the returned id.
-- ============================================================

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS draft            TEXT,
  ADD COLUMN IF NOT EXISTS draft_platform   TEXT NOT NULL DEFAULT 'threads',
  ADD COLUMN IF NOT EXISTS draft_status     TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eden_post_id     TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_posts_draft_status_check') THEN
    ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_draft_status_check
      CHECK (draft_status IN ('none','writing','ready','sent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_posts_draft_platform_check') THEN
    ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_draft_platform_check
      CHECK (draft_platform IN ('threads','substack','both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS feed_posts_draft_status_idx
  ON feed_posts (user_id, draft_status);
