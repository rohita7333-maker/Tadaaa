-- Migration: rsvp_name — optional recipient name on RSVPs.
--
-- STATUS: ALREADY APPLIED TO LIVE DB. Ledger record only, written after the
-- fact: the column and the 4-arg function overload exist in production but no
-- sql/ file documented them. The bodies below were transcribed verbatim from
-- pg_get_functiondef() on the live database, so re-running this file is a
-- no-op — it is safe to replay and safe to include in a rebuild from sql/.
--
-- Depends on: sql/invite_rsvps.sql (table), sql/public_rpc_security.sql
-- (defines the original 3-arg record_rsvp this overloads).
--
-- Caller: src/app/api/invite/rsvp/route.ts passes p_name.
--
-- NOTE (pre-existing, not fixed here): the 3-arg record_rsvp still shipped in
-- public_rpc_security.sql references v_invite.status, a column that no longer
-- exists on invites. It is dead — every caller uses the 4-arg overload below,
-- which gates on is_active + expires_at only — but it would raise if called.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS record_rsvp(UUID, TEXT, TEXT, TEXT);
--   ALTER TABLE invite_rsvps DROP COLUMN IF EXISTS name;

-- ── 1. invite_rsvps.name ─────────────────────────────────────────────────────
-- Free-text, optional. Trimmed, empty-to-NULL and capped at 80 chars by the
-- RPC below; the API route caps it again before the call.
ALTER TABLE invite_rsvps
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN invite_rsvps.name IS
  'Optional recipient-supplied display name on an RSVP. Trimmed, empty->NULL, capped at 80 chars by record_rsvp.';

-- ── 2. record_rsvp(…, p_name) overload ───────────────────────────────────────
-- Same contract as the 3-arg version (validate the invite is live, upsert on
-- (invite_id, visitor_hash), return {ok, code}) plus the name. p_name defaults
-- to NULL, so any surviving 3-arg call site still resolves to the original
-- function and is unaffected.
--
-- ON CONFLICT DO UPDATE (not DO NOTHING) so a visitor who first RSVPs without
-- a name and then supplies one is recorded — COALESCE keeps an existing name
-- from being blanked by a later nameless RSVP.
CREATE OR REPLACE FUNCTION public.record_rsvp(
  p_invite_id    uuid,
  p_visitor_hash text,
  p_user_agent   text,
  p_name         text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite invites%ROWTYPE;
  v_name   text;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- No `status` column anymore; gate on is_active + expires_at only.
  IF NOT v_invite.is_active
     OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW())
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unavailable');
  END IF;

  -- Optional, trimmed, length-capped display name. Empty -> NULL.
  v_name := NULLIF(LEFT(TRIM(COALESCE(p_name, '')), 80), '');

  INSERT INTO invite_rsvps (invite_id, visitor_hash, user_agent, name)
  VALUES (p_invite_id, p_visitor_hash, LEFT(p_user_agent, 255), v_name)
  ON CONFLICT (invite_id, visitor_hash)
  DO UPDATE SET name = COALESCE(EXCLUDED.name, invite_rsvps.name);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION record_rsvp(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
