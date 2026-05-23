-- Gift purchases table — created by D2 task.
-- Applied via Supabase MCP on 2026-05-23.
-- Stores gift checkout sessions, tracks redeem status.
-- Service-role only (no client RLS policies — webhook + redeem route use admin client).

CREATE TABLE IF NOT EXISTS gift_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  sender_email TEXT,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  gift_message TEXT,
  redeem_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|redeemed|expired
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_invite_id UUID REFERENCES invites(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS gift_purchases_token_idx ON gift_purchases(redeem_token);
CREATE INDEX IF NOT EXISTS gift_purchases_recipient_idx ON gift_purchases(recipient_email);
ALTER TABLE gift_purchases ENABLE ROW LEVEL SECURITY;
-- No client policies: service role only (webhook + redeem route)
