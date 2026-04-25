-- Run this in the Supabase SQL Editor
-- Adds: subheaders ("Abschnitte") in outlines

ALTER TABLE inputs ADD COLUMN IF NOT EXISTS is_section BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inputs_section ON inputs(project_id, is_section);
