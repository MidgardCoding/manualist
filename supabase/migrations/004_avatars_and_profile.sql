-- 004: Avatars bucket + delete account function

-- 1. Avatars bucket (public for easy display, but RLS on objects)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for avatars
DROP POLICY IF EXISTS "Allow avatar uploads" ON storage.objects;
CREATE POLICY "Allow avatar uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow avatar reads" ON storage.objects;
CREATE POLICY "Allow avatar reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
  );

DROP POLICY IF EXISTS "Allow avatar updates" ON storage.objects;
CREATE POLICY "Allow avatar updates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow avatar deletes" ON storage.objects;
CREATE POLICY "Allow avatar deletes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Function to allow authenticated user to delete own account
-- Requires supabase to be configured to allow this function for authenticated role
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from auth.users will cascade to manuals, user_files etc via FK ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = auth.uid();
  -- If no row deleted, raise
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found for deletion';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
