-- Create manuals table for User Archive feature
CREATE TABLE IF NOT EXISTS manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  description text CHECK (char_length(description) <= 1000),
  extracted_text text,
  input_mode text CHECK (input_mode IN ('ocr', 'pdf', 'text')),
  api_response jsonb,
  todo_response jsonb,
  file_names jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;

-- Drop old policies for reruns
DROP POLICY IF EXISTS "Users can insert their own manuals" ON manuals;
DROP POLICY IF EXISTS "Users can select their own manuals" ON manuals;
DROP POLICY IF EXISTS "Users can delete their own manuals" ON manuals;
DROP POLICY IF EXISTS "Users can update their own manuals" ON manuals;

-- RLS policies
CREATE POLICY "Users can insert their own manuals"
  ON manuals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own manuals"
  ON manuals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manuals"
  ON manuals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own manuals"
  ON manuals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_manuals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manuals_updated_at_trigger ON manuals;
CREATE TRIGGER manuals_updated_at_trigger
  BEFORE UPDATE ON manuals
  FOR EACH ROW EXECUTE FUNCTION update_manuals_updated_at();

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_manuals_user_id ON manuals(user_id);
CREATE INDEX IF NOT EXISTS idx_manuals_created_at ON manuals(created_at DESC);
