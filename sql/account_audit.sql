-- Account-level audit log: durable trail of auth + account-mutation events.
-- Backed by RLS so a user can read only their own rows. Inserts are written from
-- server actions using the user-context client; a self-insert policy + a
-- system-insert allowance (NULL user_id) covers the cases we need.
--
-- Run this in the Supabase SQL editor before deploying the audit code; missing
-- table simply causes audit inserts to fail silently (logged), so user flows
-- are never blocked.

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

-- A user can read their own audit rows.
DROP POLICY IF EXISTS "self-read" ON account_audit;
CREATE POLICY "self-read" ON account_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- A user can write their own audit rows. user_id IS NULL is allowed so that
-- pre-auth events (failed sign-in, magic-link request for a bad email) can
-- still be recorded by the same user-context client without a service role.
DROP POLICY IF EXISTS "self-insert" ON account_audit;
CREATE POLICY "self-insert" ON account_audit
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
