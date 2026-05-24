-- RSVPs — record "I'm in!" taps on the recipient surprise page.
-- One row per (invite, anon_visitor_token) so a single recipient confirming
-- twice doesn't double-count. We don't have a recipient user_id (these pages
-- are public/anonymous), so we hash an opaque visitor token from the client.

CREATE TABLE IF NOT EXISTS invite_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  user_agent TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invite_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS invite_rsvps_invite_idx ON invite_rsvps(invite_id);
