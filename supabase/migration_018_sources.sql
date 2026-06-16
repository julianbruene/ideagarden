-- ============================================================
-- Migration 018 — Quellen (sources) for the Lernen workspace
-- A source (book/article/podcast/…) you learn from. Concepts can be
-- linked to the source they came from; the source also holds a stream
-- of raw reading notes (literature notes) that can be distilled into
-- concepts later.
-- ============================================================

CREATE TABLE sources (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'book'
                         CHECK (type IN ('book','article','podcast','course','conversation','other')),
  title      TEXT,
  author     TEXT,
  status     TEXT        NOT NULL DEFAULT 'want'
                         CHECK (status IN ('want','reading','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources: owner full access"
  ON sources FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX sources_user_updated_idx ON sources (user_id, updated_at DESC);

-- Raw reading notes bound to one source (literature notes).
CREATE TABLE source_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  UUID        NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL DEFAULT '',
  location   TEXT,                                  -- optional page / timestamp / chapter
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE source_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_notes: owner full access"
  ON source_notes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX source_notes_source_idx ON source_notes (source_id, created_at DESC);

-- Link a concept to the source it came from. SET NULL keeps the concept
-- if its source is deleted.
ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS concepts_source_idx ON concepts (source_id);
