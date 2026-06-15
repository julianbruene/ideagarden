-- ============================================================
-- Migration 017 — Fiction dump stream
-- A genre flag on nodes so the Fiction workspace has its own Dump,
-- separate from the Garden Dump. Default 'nonfiction' keeps every
-- existing node in the Garden.
-- ============================================================

ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS genre TEXT NOT NULL DEFAULT 'nonfiction';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nodes_genre_check'
  ) THEN
    ALTER TABLE nodes
      ADD CONSTRAINT nodes_genre_check
      CHECK (genre IN ('nonfiction', 'fiction'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS nodes_genre_idx
  ON nodes (user_id, genre, created_at DESC)
  WHERE promoted = FALSE;
