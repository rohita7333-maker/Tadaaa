CREATE TABLE IF NOT EXISTS ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_drafts_user_idx ON ai_drafts(user_id, created_at DESC);
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_drafts' AND policyname = 'self-read'
  ) THEN
    CREATE POLICY "self-read" ON ai_drafts FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
