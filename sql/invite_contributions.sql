-- Collaborative memory invites — contributions table.
-- Family members can drop a photo + short message into an invite before the
-- recipient sees the reveal. The invite owner has to opt in via the create
-- wizard (accept_contributions flag), and each visitor can only contribute
-- once per invite (UNIQUE (invite_id, visitor_hash)).
--
-- All inserts come through the server route (service role). RLS public-read
-- policy below lets the surprise page reveal approved contributions without
-- needing a session, while the absence of an INSERT policy blocks any direct
-- writes from the anon client.

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

-- Opt-in toggle on the parent invite. Defaults to FALSE so existing invites
-- keep their current "private reveal" behaviour without a backfill.
ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS accept_contributions BOOLEAN NOT NULL DEFAULT FALSE;

-- RLS — public read for approved rows only. No client INSERT policy: the
-- API route uses the service role, which bypasses RLS. Direct anon inserts
-- are silently rejected.
ALTER TABLE invite_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public-read-approved" ON invite_contributions;
CREATE POLICY "public-read-approved" ON invite_contributions
  FOR SELECT
  USING (approved = TRUE);
