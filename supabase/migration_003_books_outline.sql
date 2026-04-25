-- Run this in the Supabase SQL Editor
-- Adds: project kinds (single/book), chapter hierarchy, Kernidee, outline ordering, used flag

-- ============================================================
-- Projects: kind, parent (for chapters), chapter_order, kernidee
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'single';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_kind_check') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_kind_check CHECK (kind IN ('single', 'book'));
  END IF;
END $$;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chapter_order INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS kernidee TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);

-- ============================================================
-- Inputs: outline_order (per project), used (marked-as-used flag)
-- ============================================================
ALTER TABLE inputs ADD COLUMN IF NOT EXISTS outline_order INTEGER;
ALTER TABLE inputs ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inputs_outline ON inputs(project_id, outline_order);
