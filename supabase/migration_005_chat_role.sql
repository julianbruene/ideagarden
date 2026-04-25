-- Run this in the Supabase SQL Editor
-- Adds: chat_role per project (Sparring / Recherche / Lektor)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS chat_role TEXT NOT NULL DEFAULT 'sparring';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_chat_role_check') THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_chat_role_check
      CHECK (chat_role IN ('sparring', 'researcher', 'editor'));
  END IF;
END $$;
