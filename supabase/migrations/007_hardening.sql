-- 007: Hardening — credits self-mint fix, user_files update check,
-- storage cleanup on account delete, refund helper.
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.

-- ---------------------------------------------------------------------------
-- 1. user_credits: revoke direct client writes. Only SELECT + RPC stays.
-- Client could self-mint via UPDATE/INSERT. After this, deduct/refund/get
-- go through SECURITY DEFINER functions only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;

-- Keep read-only select (needed for UI display; writes go via RPC).
-- Recreate idempotently in case it was dropped manually:
DROP POLICY IF EXISTS "Users can select own credits" ON user_credits;
CREATE POLICY "Users can select own credits"
  ON user_credits FOR SELECT USING (auth.uid() = user_id);

-- Explicitly block DELETE (no policy = denied, but be explicit for clarity).
-- (No DELETE policy is created on purpose.)

-- ---------------------------------------------------------------------------
-- 2. user_files UPDATE: add missing WITH CHECK so user_id cannot be reassigned.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own files" ON user_files;
CREATE POLICY "Users can update their own files"
  ON user_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. refund_credits(p_amount): compensating action for deduct-before-LLM.
-- Client deducts 1 credit BEFORE calling the LLM; if the LLM / save fails,
-- it calls refund to give the credit back. Atomic + row-locked like deduct.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_credits(p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
  v_new integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (auth.uid(), 10)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  END IF;

  v_new := COALESCE(v_credits, 10) + p_amount;
  UPDATE public.user_credits SET credits = v_new, updated_at = now() WHERE user_id = auth.uid();
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credits(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. delete_current_user(): also purge storage.objects (no FK cascade there).
-- DB rows cascade via FK ON DELETE CASCADE; storage files would otherwise
-- remain billable/leakable under user-manuals/<uid>/... and avatars/<uid>/...
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove private manual packs + public avatars owned by this user.
  -- storage.objects.name holds the full path "<uid>/..." so prefix match is safe.
  DELETE FROM storage.objects
  WHERE bucket_id = 'user-manuals'
    AND name LIKE v_uid::text || '/%';

  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND name LIKE v_uid::text || '/%';

  -- Cascades to manuals, user_files, user_credits via FK ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found for deletion';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
