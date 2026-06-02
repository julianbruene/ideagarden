-- ============================================================
-- Migration 013 — Lernen workspace (Concept notes)
-- A second workspace alongside Garden for personal knowledge:
-- concept notes restated in your own words (Feynman-style)
-- plus optional connections between them.
-- ============================================================

CREATE TABLE concepts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT,                                              -- the concept name
  summary      TEXT,                                              -- one sentence, in your own words (Feynman test)
  own_example  TEXT,                                              -- the concrete example that makes it stick
  body         TEXT,                                              -- formal/scientific background, longer notes
  source       TEXT,                                              -- where you encountered it (book, article, …)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concepts: owner full access"
  ON concepts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX concepts_user_updated_idx
  ON concepts (user_id, updated_at DESC);

-- Undirected connections between two concepts.
-- We store as a directed row but treat as undirected in the UI by
-- querying both directions (UNION) when showing a concept's links.
CREATE TABLE concept_links (
  from_id    UUID        NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_id      UUID        NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_id, to_id),
  CONSTRAINT no_self_link CHECK (from_id <> to_id)
);

ALTER TABLE concept_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_links: owner full access"
  ON concept_links FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX concept_links_from_idx ON concept_links (from_id);
CREATE INDEX concept_links_to_idx   ON concept_links (to_id);
