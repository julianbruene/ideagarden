-- Run this in the Supabase SQL Editor
-- Adds: per-message chat_role on inputs so each role has its own thread.

ALTER TABLE inputs ADD COLUMN IF NOT EXISTS chat_role TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inputs_chat_role_check') THEN
    ALTER TABLE inputs
      ADD CONSTRAINT inputs_chat_role_check
      CHECK (chat_role IS NULL OR chat_role IN ('sparring', 'researcher', 'editor'));
  END IF;
END $$;

-- Backfill: existing chat messages on projects → 'sparring'.
-- Garden idea chats stay NULL (single-role anyway).
UPDATE inputs
SET chat_role = 'sparring'
WHERE chat_role IS NULL
  AND (is_note = FALSE OR is_note IS NULL)
  AND idea_id IS NULL
  AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inputs_project_chat_role
  ON inputs(project_id, chat_role)
  WHERE chat_role IS NOT NULL;
