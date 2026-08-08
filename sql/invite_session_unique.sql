-- Closes W1.5: a Stripe Checkout Session id must fulfil at most one invite.
-- Without this, a replayed/duplicated fulfilment (webhook re-run racing the
-- createInviteShell server action, or a client retry) could stamp is_paid on
-- two different invites from a single $4.99 purchase. Partial index (only
-- non-null values) so free invites — which never set stripe_session_id — are
-- unaffected.
--
-- STATUS: NOT APPLIED. Written for review per the phase's DB-migration gate
-- (Phase W5, task 5). Apply via Supabase SQL editor or `apply_migration` only
-- after explicit user confirmation.
--
-- Rollback: DROP INDEX IF EXISTS invites_stripe_session_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS invites_stripe_session_id_unique
  ON invites (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
