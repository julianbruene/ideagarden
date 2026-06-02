-- ============================================================
-- Migration 014 — Connection notes
-- Each link between two concepts can carry a short text on
-- WHY they belong together. Optional, free-text.
-- ============================================================

ALTER TABLE concept_links
  ADD COLUMN IF NOT EXISTS note TEXT;
