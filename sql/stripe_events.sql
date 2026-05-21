-- Stripe event dedup table for idempotent webhook processing.
-- Insert with ON CONFLICT DO NOTHING; if zero rows inserted, event was already processed.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic "claim" — returns true if inserted (first time), false if already seen.
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
