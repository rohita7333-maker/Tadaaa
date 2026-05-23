-- =============================================================================
-- TaDaaaa — All Migrations (run in order)
-- Paste this entire file into Supabase SQL Editor and run once.
-- All statements are idempotent (IF NOT EXISTS / CREATE OR REPLACE).
-- NOTE: sql/ai_drafts.sql is EXCLUDED — already run in Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. increment_view_count.sql — atomic view counter, returns new count
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS increment_view_count(UUID);
CREATE OR REPLACE FUNCTION increment_view_count(invite_id UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE invites
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = invite_id
  RETURNING view_count;
$$;


-- -----------------------------------------------------------------------------
-- 2. stripe_events.sql — webhook dedup + atomic claim
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS enabled, no policies = service-role only (internal webhook table, never client-accessible)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION claim_stripe_event(p_event_id TEXT, p_event_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO stripe_events (event_id, event_type)
  VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. rate_limits.sql — Postgres-backed distributed rate limiter
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_start);

-- RLS enabled, no policies = service-role only (internal rate-limit table, never client-accessible)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_window BIGINT;
  v_count INTEGER;
BEGIN
  v_window := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT / p_window_ms;

  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  DELETE FROM rate_limits WHERE window_start < v_window - 2;

  RETURN v_count <= p_limit;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. stripe_customers.sql — customer binding to prevent webhook spoofing
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON profiles(stripe_customer_id);

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

  UPDATE profiles
  SET stripe_customer_id = p_customer_id
  WHERE id = p_user_id AND (stripe_customer_id IS NULL OR stripe_customer_id = p_customer_id);

  RETURN FOUND;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5. invite_rsvps.sql — RSVP table + count helper
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invite_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  user_agent TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invite_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS invite_rsvps_invite_idx ON invite_rsvps(invite_id);

ALTER TABLE invite_rsvps ENABLE ROW LEVEL SECURITY;

-- Invite owner can read RSVPs for their own invites (dashboard count display).
-- Inserts come through service-role API route — bypasses RLS, no insert policy needed.
DROP POLICY IF EXISTS "owner-read" ON invite_rsvps;
CREATE POLICY "owner-read" ON invite_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invites
      WHERE invites.id = invite_rsvps.invite_id
        AND invites.creator_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION rsvp_count(p_invite_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM invite_rsvps WHERE invite_id = p_invite_id;
$$;


-- -----------------------------------------------------------------------------
-- 6. profiles_welcomed_at.sql — welcome email dedup flag
-- -----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcomed_at TIMESTAMPTZ;


-- -----------------------------------------------------------------------------
-- 7. account_audit.sql — auth event audit log + RLS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_audit_user_idx
  ON account_audit(user_id, created_at DESC);

ALTER TABLE account_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self-read" ON account_audit;
CREATE POLICY "self-read" ON account_audit
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self-insert" ON account_audit;
CREATE POLICY "self-insert" ON account_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 8. invite_contributions.sql — collaborative memory (B2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invite_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contributor_email TEXT,
  message TEXT,
  photo_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  visitor_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invite_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS contributions_invite_idx
  ON invite_contributions(invite_id, created_at);

ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS accept_contributions BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE invite_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public-read-approved" ON invite_contributions;
CREATE POLICY "public-read-approved" ON invite_contributions
  FOR SELECT
  USING (approved = TRUE);
