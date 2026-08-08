-- Migration: premium_enforcement — make invites.is_paid server-settable only.
--
-- STATUS: NOT APPLIED. Written for review; apply via the Supabase SQL editor or
-- `apply_migration` only after explicit user confirmation.
--
-- ── The hole ────────────────────────────────────────────────────────────────
-- Live RLS on `invites` (verified against production):
--   INSERT  WITH CHECK (auth.uid() = creator_id)      -- no column restriction
--   UPDATE  USING      (auth.uid() = creator_id)      -- no WITH CHECK at all
-- Both mobile and web ship the anon key, so anyone holding a valid session can
-- POST directly to PostgREST with is_paid: true — or flip it on an existing
-- row — and unlock every premium theme, the 30-day signed-URL TTL, and video
-- generation without paying. Nothing in the DB currently says otherwise; the
-- only enforcement is application code that a direct API call skips.
--
-- ── The fix ─────────────────────────────────────────────────────────────────
-- A BEFORE INSERT OR UPDATE trigger that silently forces is_paid back to false
-- whenever the writer is one of the two client-facing PostgREST roles
-- (`authenticated`, `anon`). Every other role — `service_role`, `postgres`,
-- migration roles — passes through untouched, so the server-verified paths
-- keep working:
--   * createInviteShell stamps is_paid at publish, after retrieving the
--     Checkout Session from Stripe and verifying buyer + theme + payment
--     status. That insert uses the service-role client (src/actions/invite.ts).
--   * The Stripe webhook sets is_paid from a signature-verified event, also
--     service role (src/app/api/stripe/webhook/route.ts).
-- Silent coercion rather than RAISE is deliberate: an honest client never sets
-- is_paid (mobile's createInvite always sends false), so an exception would
-- only ever surface to an attacker while telling them exactly what to bypass.
--
-- ── Apply ordering ──────────────────────────────────────────────────────────
-- The code side must land FIRST, and already has on this branch: the
-- is_paid-stamping insert in createInviteShell was switched from the
-- user-scoped client to createAdminClient(). Applying this migration against a
-- deploy that predates that change would break paid publishes (is_paid would be
-- forced false and the buyer would get a free-tier surprise).
--   1. Deploy the branch containing src/actions/invite.ts `insertClient`.
--   2. Apply this file.
--   3. Verify: publish a premium theme end-to-end; confirm is_paid = true.
--
-- ── Not covered here ────────────────────────────────────────────────────────
-- stripe_session_id is still client-writable. It is inert on its own (the
-- webhook only ever matches on it, and createInviteShell re-verifies the
-- session with Stripe before trusting it), but a follow-up that locks it down
-- the same way is worth doing.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS invites_enforce_is_paid ON invites;
--   DROP FUNCTION IF EXISTS enforce_is_paid_server_only();

CREATE OR REPLACE FUNCTION enforce_is_paid_server_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- PostgREST does SET ROLE to the JWT's role before running the statement, so
  -- current_user is 'authenticated' or 'anon' for every client-originated
  -- write and something else for every trusted one.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.is_paid IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_paid IS DISTINCT FROM NEW.is_paid)
  THEN
    NEW.is_paid := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invites_enforce_is_paid ON invites;

CREATE TRIGGER invites_enforce_is_paid
  BEFORE INSERT OR UPDATE ON invites
  FOR EACH ROW
  EXECUTE FUNCTION enforce_is_paid_server_only();
