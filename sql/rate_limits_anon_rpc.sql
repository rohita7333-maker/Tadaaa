-- Security hardening: allow anon key to call consume_rate_limit RPC
-- without granting service-role access to public routes.
--
-- Before: rateLimit() used createServiceClient() (service-role key) even for
-- unauthenticated routes (answer, rsvp, report, contribute). Every anon
-- request opened a service-role connection unnecessarily.
--
-- After: rateLimit() uses createClient() (anon key). The RPC is SECURITY
-- DEFINER so it executes with owner privileges and can still write to
-- rate_limits. Anon cannot read/write the table directly (RLS blocks it).

-- 1. Rebuild function with SECURITY DEFINER so owner perms are used at call time
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window BIGINT;
  v_count INTEGER;
BEGIN
  v_window := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT / p_window_ms;

  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Opportunistic cleanup of old windows (>2 windows ago)
  DELETE FROM rate_limits WHERE window_start < v_window - 2;

  RETURN v_count <= p_limit;
END;
$$;

-- 2. Allow anon role to execute the RPC (anon key = unauthenticated callers)
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, BIGINT) TO anon;

-- 3. Also grant to authenticated role (logged-in callers using anon key client)
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, BIGINT) TO authenticated;

-- 4. Enable RLS on rate_limits so anon cannot read/write the table directly
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — all access goes through the SECURITY DEFINER RPC.
-- Direct SELECT/INSERT/UPDATE/DELETE by anon/authenticated is blocked by default.
