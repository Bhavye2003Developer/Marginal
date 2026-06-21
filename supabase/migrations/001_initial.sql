-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('article', 'pdf')),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'archived')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  collection_ids UUID[] NOT NULL DEFAULT '{}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT,
  images JSONB,
  file_url TEXT,
  page_count INTEGER,
  searchable_text TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(content, '') || ' ' ||
      coalesce(searchable_text, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS articles_status_saved_at_idx ON articles(status, saved_at DESC);
CREATE INDEX IF NOT EXISTS articles_tags_idx ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS articles_collection_ids_idx ON articles USING GIN(collection_ids);
CREATE INDEX IF NOT EXISTS articles_search_idx ON articles USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  text TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  block_id TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  page INTEGER,
  rects JSONB
);

CREATE INDEX IF NOT EXISTS highlights_article_id_idx ON highlights(article_id);
CREATE INDEX IF NOT EXISTS highlights_created_at_idx ON highlights(created_at DESC);

-- Helper function: remove a collection UUID from all articles
CREATE OR REPLACE FUNCTION remove_collection_from_articles(collection_uuid UUID)
RETURNS void AS $$
  UPDATE articles
  SET collection_ids = array_remove(collection_ids, collection_uuid)
  WHERE collection_uuid = ANY(collection_ids);
$$ LANGUAGE sql SECURITY DEFINER;
