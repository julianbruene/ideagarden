-- Run this in the Supabase SQL Editor
-- Adds: per-user overrides for the three role prompts (Sparring/Recherche/Lektor)

CREATE TABLE IF NOT EXISTS user_settings (
  user_id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sparring_prompt    TEXT,
  researcher_prompt  TEXT,
  editor_prompt      TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_settings: owner full access') THEN
    CREATE POLICY "user_settings: owner full access"
      ON user_settings FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
