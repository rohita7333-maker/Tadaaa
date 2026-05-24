-- Atomic view count increment. Returns the NEW count so callers can decide
-- whether this was the first view (returned value = 1).
-- SECURITY DEFINER + anon GRANT allow public routes to call this without
-- service-role (see migration: public_rpc_security.sql).
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
