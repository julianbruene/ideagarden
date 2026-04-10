-- ============================================================
-- Idea Garden — Supabase Schema
-- Run this in the Supabase SQL Editor for your project
-- ============================================================

-- nodes: raw thoughts from Layer 1 (the Dump)
CREATE TABLE nodes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       TEXT,
  content_type  TEXT        NOT NULL DEFAULT 'text'
                            CHECK (content_type IN ('text', 'voice', 'image', 'quote')),
  image_url     TEXT,
  promoted      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes: owner full access"
  ON nodes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ideas: active items in Layer 2 (the Garden)
CREATE TABLE ideas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT,
  synthesis       TEXT,
  status          TEXT        NOT NULL DEFAULT 'growing'
                              CHECK (status IN ('growing', 'done')),
  source_node_ids UUID[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas: owner full access"
  ON ideas FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- inputs: messages/fragments inside an idea (the chat history)
CREATE TABLE inputs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'user'
             CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inputs: owner full access"
  ON inputs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for node images
-- Run after creating the bucket in Supabase Storage dashboard:
--   Bucket name: node-images  (public)
-- ============================================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "node-images: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'node-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public reads (images embedded in nodes)
CREATE POLICY "node-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'node-images');

-- Allow owners to delete their own images
CREATE POLICY "node-images: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'node-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
