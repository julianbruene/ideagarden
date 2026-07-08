-- ============================================================
-- Migration 019 — Garden becomes a post workshop
-- The Garden is repurposed: take 1–2 raw Dump notes and rewrite them
-- in your own words as a short post. The post text reuses the existing
-- ideas.synthesis column; this migration just adds an optional target
-- platform for the character counter.
-- ============================================================

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS platform TEXT;
