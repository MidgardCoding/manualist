-- Separate packs per User Manual and To-Do checkbox persistence

-- 1. Add manual_id to user_files to isolate packs per manual
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS manual_id uuid REFERENCES manuals(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_files_manual_id ON user_files(manual_id);
CREATE INDEX IF NOT EXISTS idx_user_files_user_manual ON user_files(user_id, manual_id);

-- 2. Add todo_checked to manuals for per-pack To-Do state
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS todo_checked jsonb DEFAULT '[]'::jsonb;

-- Ensure todo_checked is always a JSON array
-- Backfill existing rows with empty array if null
UPDATE manuals SET todo_checked = '[]'::jsonb WHERE todo_checked IS NULL;

-- 3. Storage RLS already checks (storage.foldername(name))[1] = auth.uid()::text
-- This works for nested paths like <user_id>/<manual_id>/<file> because foldername[1] is still user_id.
-- Add explicit policy for update on storage objects if not already present (for completeness)
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-manuals'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-manuals'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Comment for documentation
COMMENT ON COLUMN user_files.manual_id IS 'Pack isolation: each file belongs to a specific manual pack';
COMMENT ON COLUMN manuals.todo_checked IS 'Per-pack To-Do Steps checkbox state as JSON boolean array';
