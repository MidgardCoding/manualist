-- 1. Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-manuals', 'user-manuals', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the user_files table
CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security on the table
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies if they exist (for clean reruns)
DROP POLICY IF EXISTS "Users can insert their own files" ON user_files;
DROP POLICY IF EXISTS "Users can select their own files" ON user_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON user_files;
DROP POLICY IF EXISTS "Users can update their own files" ON user_files;

-- 5. Table RLS policies
CREATE POLICY "Users can insert their own files"
  ON user_files FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own files"
  ON user_files FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON user_files FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON user_files FOR UPDATE USING (auth.uid() = user_id);

-- 6. Storage RLS policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-manuals'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-manuals'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-manuals'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
