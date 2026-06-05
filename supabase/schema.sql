-- Jotday Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'text', 'mixed')),
  title TEXT,
  content TEXT,
  image_url TEXT,
  image_public_id TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_representative BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS cards_user_date_idx ON cards(user_id, date);
CREATE INDEX IF NOT EXISTS cards_tags_gin_idx ON cards USING GIN (tags);
CREATE INDEX IF NOT EXISTS cards_content_trgm_idx ON cards USING GIN (content gin_trgm_ops);

-- Row Level Security
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cards" ON cards
  FOR ALL USING (auth.uid() = user_id);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Share tokens table
CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  date DATE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS share_tokens_token_idx ON share_tokens(token);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own share tokens" ON share_tokens
  FOR ALL USING (auth.uid() = user_id);
