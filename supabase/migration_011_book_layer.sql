-- ============================================================
-- Migration 011 — Book Layer
-- Three new project columns to support the Book container view:
--   • zielleser        : one sentence on who the book is for (book-level)
--   • roter_faden      : recurring threads, metaphors, arguments (book-level)
--   • chapter_function : one sentence on what role this chapter plays
--                        in the book (chapter-level, not chapter content)
-- All optional. Reuses the existing kernidee column as the book's "Kernthese".
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS zielleser TEXT,
  ADD COLUMN IF NOT EXISTS roter_faden TEXT,
  ADD COLUMN IF NOT EXISTS chapter_function TEXT;
