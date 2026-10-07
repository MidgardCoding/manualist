-- 005: Credits system - 10 credits per new user, 1 per manual, 1 per chat message

CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 10 CHECK (credits >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own credits" ON user_credits;
CREATE POLICY "Users can select own credits"
  ON user_credits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
CREATE POLICY "Users can update own credits"
  ON user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;
CREATE POLICY "Users can insert own credits"
  ON user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create 10 credits on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Backfill existing users who have no credits row
INSERT INTO public.user_credits (user_id, credits)
SELECT id, 10 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Function to atomically deduct credits (returns new balance or raises exception)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_amount integer)
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

  -- Lock row for update to avoid race conditions
  SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    -- No row yet, create with 10 then deduct
    INSERT INTO public.user_credits (user_id, credits) VALUES (auth.uid(), 10) ON CONFLICT (user_id) DO NOTHING;
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  END IF;

  IF v_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: % available, % required', v_credits, p_amount;
  END IF;

  v_new := v_credits - p_amount;
  UPDATE public.user_credits SET credits = v_new, updated_at = now() WHERE user_id = auth.uid();
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer) TO authenticated;

-- Helper to get current credits (for fallback if RLS issues)
CREATE OR REPLACE FUNCTION public.get_my_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, credits) VALUES (auth.uid(), 10) ON CONFLICT (user_id) DO NOTHING;
    SELECT credits INTO v_credits FROM public.user_credits WHERE user_id = auth.uid();
  END IF;
  RETURN COALESCE(v_credits, 10);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_credits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_credits() TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_credits_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_credits_updated_at ON user_credits;
CREATE TRIGGER user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION public.handle_credits_updated_at();
