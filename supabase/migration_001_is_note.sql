-- Run this in the Supabase SQL Editor
-- Adds a flag to distinguish notes (added directly) from chat messages (trigger AI)
ALTER TABLE inputs ADD COLUMN IF NOT EXISTS is_note BOOLEAN NOT NULL DEFAULT FALSE;
