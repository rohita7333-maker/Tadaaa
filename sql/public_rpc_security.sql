-- Migration: public_rpc_security
-- Adds SECURITY DEFINER + anon GRANT to all RPCs callable from unauthenticated
-- public routes, eliminating service-role usage on the public request path.

-- ── 1. increment_view_count ───────────────────────────────────────────────────
-- Previously required service-role because no GRANT existed. Now callable by anon.
CREATE OR REPLACE FUNCTION increment_view_count(invite_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE invites
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = invite_id
  RETURNING view_count;
$$;

GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO anon, authenticated;

-- ── 2. record_rsvp ────────────────────────────────────────────────────────────
-- Validates invite active/not-expired, then upserts into invite_rsvps.
-- Returns JSONB {ok, code} — code is set on failure ('not_found'|'unavailable').
CREATE OR REPLACE FUNCTION record_rsvp(
  p_invite_id   UUID,
  p_visitor_hash TEXT,
  p_user_agent  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF NOT v_invite.is_active
     OR v_invite.status = 'expired'
     OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW())
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unavailable');
  END IF;

  INSERT INTO invite_rsvps (invite_id, visitor_hash, user_agent)
  VALUES (p_invite_id, p_visitor_hash, LEFT(p_user_agent, 255))
  ON CONFLICT (invite_id, visitor_hash) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION record_rsvp(UUID, TEXT, TEXT) TO anon, authenticated;

-- ── 3. record_answer ──────────────────────────────────────────────────────────
-- Validates invite + question ownership, inserts answer.
-- Returns JSONB {ok, code, creator_id, title} so caller can send notification
-- email without a second SELECT (no service-role needed post-insert).
CREATE OR REPLACE FUNCTION record_answer(
  p_question_id UUID,
  p_invite_id   UUID,
  p_answer      BOOLEAN,
  p_user_agent  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite      invites%ROWTYPE;
  v_question_id UUID;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF NOT v_invite.is_active
     OR v_invite.status = 'expired'
     OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW())
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unavailable');
  END IF;

  SELECT id INTO v_question_id
  FROM invite_questions
  WHERE id = p_question_id AND invite_id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_question');
  END IF;

  INSERT INTO invite_answers (question_id, invite_id, answer, answered_at, user_agent)
  VALUES (p_question_id, p_invite_id, p_answer, NOW(), LEFT(p_user_agent, 255));

  RETURN jsonb_build_object(
    'ok',         true,
    'creator_id', v_invite.creator_id,
    'title',      v_invite.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_answer(UUID, UUID, BOOLEAN, TEXT) TO anon, authenticated;

-- ── 4. unsubscribe_user ───────────────────────────────────────────────────────
-- Upserts the relevant notification column to FALSE.
-- CASE statement prevents arbitrary column injection — only known list keys accepted.
CREATE OR REPLACE FUNCTION unsubscribe_user(
  p_user_id UUID,
  p_list    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column TEXT;
BEGIN
  CASE p_list
    WHEN 'monthly', 'weekly' THEN v_column := 'notify_occasions';
    WHEN 'view'               THEN v_column := 'notify_on_view';
    WHEN 'answer'             THEN v_column := 'notify_on_answer';
    ELSE RETURN FALSE;
  END CASE;

  EXECUTE format(
    'INSERT INTO profiles (id, %I) VALUES ($1, FALSE)
     ON CONFLICT (id) DO UPDATE SET %I = FALSE',
    v_column, v_column
  ) USING p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION unsubscribe_user(UUID, TEXT) TO anon, authenticated;
