-- ============================================================
-- Migration 015 — Leitfragen
-- Standing personal questions (Wie überwinde ich Overthinking?,
-- Wie kommt mein Kopf nicht im Weg?, …). Stable over years.
-- Each concept can be linked to N Leitfragen with a per-pair
-- "Wie hilft das konkret?" reflection — your evolving reader on
-- the question.
-- ============================================================

CREATE TABLE goals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,                                            -- the question itself, short
  description TEXT,                                            -- optional self-clarification
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: owner full access"
  ON goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX goals_user_updated_idx ON goals (user_id, updated_at DESC);

-- Join: a reflection per (concept, goal) pair.
CREATE TABLE concept_goals (
  concept_id UUID        NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  goal_id    UUID        NOT NULL REFERENCES goals(id)    ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection TEXT,                                            -- how this concept helps with the question
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (concept_id, goal_id)
);

ALTER TABLE concept_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_goals: owner full access"
  ON concept_goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX concept_goals_concept_idx ON concept_goals (concept_id);
CREATE INDEX concept_goals_goal_updated_idx ON concept_goals (goal_id, updated_at DESC);
