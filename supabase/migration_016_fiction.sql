-- ============================================================
-- Migration 016 — Fiction workspace
-- A genre flag on projects so the Fiction workspace can reuse the
-- existing book/chapter machinery. A "Roman" is a project with
-- kind='book' and genre='fiction'. Chapters inherit the genre.
-- Default 'nonfiction' keeps every existing project where it is.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS genre TEXT NOT NULL DEFAULT 'nonfiction';

-- Validate allowed values without breaking existing rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_genre_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_genre_check
      CHECK (genre IN ('nonfiction', 'fiction'));
  END IF;
END $$;
