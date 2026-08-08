-- Push tokens — one row per (user, device) Expo push token, for mobile
-- notify-on-RSVP / notify-on-view. Owner-only RLS: a user can register,
-- read, and revoke only their own tokens.
--
-- STATUS: NOT APPLIED. Written for review per the phase's DB-migration gate
-- (Phase W5, task 4). Apply via Supabase SQL editor or `apply_migration` only
-- after explicit user confirmation.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS claim_push_token(TEXT, TEXT);
--   DROP TABLE IF EXISTS push_tokens;

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own push tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── claim_push_token ─────────────────────────────────────────────────────────
-- Device hand-off. expo_token is UNIQUE, so a plain
--   upsert(..., { onConflict: "expo_token" })
-- from the client turns into an UPDATE of the *previous owner's* row — which
-- the owner-only policy above forbids. The write fails, the second user on a
-- shared device silently never receives notifications, and nothing in the app
-- reports it.
--
-- SECURITY DEFINER lets the delete-then-insert run as the table owner, so the
-- token always ends up owned by whoever is signed in right now. auth.uid() is
-- the only source of ownership — the caller cannot name another user.
CREATE OR REPLACE FUNCTION claim_push_token(
  p_token    TEXT,
  p_platform TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'invalid platform: %', p_platform;
  END IF;

  DELETE FROM push_tokens WHERE expo_token = p_token;

  INSERT INTO push_tokens (user_id, expo_token, platform)
  VALUES (v_user, p_token, p_platform);
END;
$$;

REVOKE ALL ON FUNCTION claim_push_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_push_token(TEXT, TEXT) TO authenticated;
