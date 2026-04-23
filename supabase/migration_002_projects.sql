-- Run this in the Supabase SQL Editor
-- Adds Projects layer (step 3 in the Idea → Project → Kompost cycle)

-- ============================================================
-- Projects table
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT,
  outline          TEXT,
  writing_content  TEXT,
  synthesis        TEXT,
  source_idea_ids  UUID[]      NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'done')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: owner full access"
  ON projects FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Inputs: allow linking to a project instead of (or in addition to) an idea
-- ============================================================
ALTER TABLE inputs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE inputs
  ALTER COLUMN idea_id DROP NOT NULL;

-- Every input must belong to at least one container (idea or project)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inputs_target_check'
  ) THEN
    ALTER TABLE inputs
      ADD CONSTRAINT inputs_target_check
      CHECK ((idea_id IS NOT NULL) OR (project_id IS NOT NULL));
  END IF;
END $$;

-- Mirror source: if set, this input is a mirror of another input
-- Used for the "note in mehrere Ideen/Projekte spiegeln" feature
ALTER TABLE inputs
  ADD COLUMN IF NOT EXISTS mirror_source_id UUID REFERENCES inputs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inputs_project_id ON inputs(project_id);
CREATE INDEX IF NOT EXISTS idx_inputs_mirror_source_id ON inputs(mirror_source_id);
