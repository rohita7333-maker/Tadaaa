-- Account-level audit log: durable trail of auth + account-mutation events.
-- Backed by RLS so a user can read only their own rows. Authenticated users
-- may only insert rows where user_id matches their own auth.uid().
--
-- Pre-auth events (magic-link, signup, password-reset) MUST be written via
-- the service-role admin client (see src/lib/audit.ts), not the user-context
-- client. Authenticated users cannot insert rows for arbitrary user_ids,
-- which would otherwise be a spam vector (NULL user_id + arbitrary action/meta).
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

-- A user can write their own audit rows. Pre-auth (user_id IS NULL) events are
-- NOT writable through this policy — they must go through the service-role
-- admin client, which bypasses RLS. Allowing NULL here would let any
-- authenticated user spam the table with arbitrary action/meta payloads.
DROP POLICY IF EXISTS "self-insert" ON account_audit;
CREATE POLICY "self-insert" ON account_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
