-- ============================================================
-- Migration 010 — Handwerk: second axis "Kniff"
-- A free-text technique tag (Anfang, Dialog, Beschreibung, Übergang, …)
-- alongside the existing mood field. Same emergence pattern:
-- vocabulary grows from your own usage, no fixed taxonomy.
-- ============================================================

ALTER TABLE craft_snippets
  ADD COLUMN IF NOT EXISTS kniff TEXT;
