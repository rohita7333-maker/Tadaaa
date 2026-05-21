-- Stripe customer linkage for webhook cross-check.
-- Bind a user_id to the FIRST stripe_customer_id we see, then refuse to flip the binding.
-- This is what prevents a forged webhook with arbitrary metadata.user_id from
-- minting tier=unlimited for someone else.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON profiles(stripe_customer_id);

-- Atomic: return true if (user_id, customer_id) pairing matches existing or this is the first binding.
CREATE OR REPLACE FUNCTION verify_stripe_customer(p_user_id UUID, p_customer_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  existing_user UUID;
BEGIN
  IF p_user_id IS NULL OR p_customer_id IS NULL THEN RETURN FALSE; END IF;

  SELECT id INTO existing_user FROM profiles WHERE stripe_customer_id = p_customer_id LIMIT 1;

  IF existing_user IS NOT NULL THEN
    RETURN existing_user = p_user_id;
  END IF;

  -- First binding for this customer — record it (only if profile has no other customer_id).
  UPDATE profiles
  SET stripe_customer_id = p_customer_id
  WHERE id = p_user_id AND (stripe_customer_id IS NULL OR stripe_customer_id = p_customer_id);

  RETURN FOUND;
END;
$$;
