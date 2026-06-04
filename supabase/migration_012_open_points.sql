-- ============================================================
-- Migration 012 — Open Points as individual cards
-- Adds a discriminator to the `inputs` table so each "Offener Punkt"
-- becomes its own row (like Outline notes) instead of one big text
-- field on the book project. Backfills the existing `roter_faden`
-- text by splitting on newlines into one row per non-empty line.
-- The `roter_faden` column on projects is kept as dead storage for
-- safety — can be dropped in a future migration once verified.
-- ============================================================

ALTER TABLE inputs
  ADD COLUMN IF NOT EXISTS is_open_point BOOLEAN NOT NULL DEFAULT FALSE;

-- Targeted partial index — fast lookup of open points per book.
CREATE INDEX IF NOT EXISTS inputs_open_points_idx
  ON inputs (project_id)
  WHERE is_open_point = TRUE;

-- Backfill — only runs if migration 011 (which added the
-- projects.roter_faden column) has already been applied. This makes
-- 012 safe to run regardless of order; without 011 there's simply
-- nothing to migrate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'projects'
      AND column_name = 'roter_faden'
  ) THEN
    EXECUTE $sql$
      INSERT INTO inputs (project_id, idea_id, user_id, content, role, is_note, is_open_point)
      SELECT
        p.id,
        NULL,
        p.user_id,
        trim(line),
        'user',
        TRUE,
        TRUE
      FROM projects p
      CROSS JOIN LATERAL regexp_split_to_table(p.roter_faden, E'\n') AS line
      WHERE p.kind = 'book'
        AND p.roter_faden IS NOT NULL
        AND length(trim(p.roter_faden)) > 0
        AND length(trim(line)) > 0;
    $sql$;
  END IF;
END $$;
