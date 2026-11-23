-- ============================================================
-- Migration 020 — Lesen (feed_posts)
-- Text versions of social posts (reel transcripts, carousel slide
-- text, captions) from followed creators, pulled via EDEN and
-- imported as JSON. Read outside Instagram; no metrics, no images.
-- ============================================================

CREATE TABLE IF NOT EXISTS feed_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL DEFAULT 'instagram',
  external_id     TEXT        NOT NULL,                -- EDEN contentId
  url             TEXT,
  author_username TEXT        NOT NULL,
  author_name     TEXT,
  post_type       TEXT        NOT NULL DEFAULT 'post'
                              CHECK (post_type IN ('reel','carousel','post')),
  published_at    TIMESTAMPTZ,
  caption         TEXT,
  transcript      TEXT,
  slide_text      TEXT,
  on_screen_text  TEXT,
  main_text       TEXT        NOT NULL DEFAULT '',     -- the best readable text
  main_source     TEXT        NOT NULL DEFAULT 'caption'
                              CHECK (main_source IN ('transcript','slides','onscreen','caption')),
  truncated       BOOLEAN     NOT NULL DEFAULT FALSE,
  status          TEXT        NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new','read','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform, external_id)
);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feed_posts' AND policyname = 'feed_posts: owner full access'
  ) THEN
    CREATE POLICY "feed_posts: owner full access"
      ON feed_posts FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS feed_posts_user_status_idx
  ON feed_posts (user_id, status, published_at DESC);
