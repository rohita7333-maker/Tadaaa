-- Atomic view count increment. Returns the NEW count so callers can decide
-- whether this was the first view (returned value = 1).
CREATE OR REPLACE FUNCTION increment_view_count(invite_id UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE invites
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = invite_id
  RETURNING view_count;
$$;
