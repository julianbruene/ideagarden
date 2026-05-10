-- ============================================================
-- Migration 009 — Handwerk (craft snippets)
-- A permanent collection of writing-craft snippets:
-- beautiful sentences, elegant metaphors, memorable phrasing.
-- No promotion, no AI, no synthesis — they stay here forever.
-- ============================================================

CREATE TABLE craft_snippets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  -- Optional free-text tag for later (e.g. mood: "ruhig", "scharf", "elegant").
  -- Schema-ready; UI can stay deferred until the vocabulary feels right.
  mood       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE craft_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "craft_snippets: owner full access"
  ON craft_snippets FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX craft_snippets_user_created_idx
  ON craft_snippets (user_id, created_at DESC);
