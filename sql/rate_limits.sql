-- Distributed rate limiter backed by Postgres. Works across serverless instances.
-- Each (key, window_start) row holds the count for that fixed window.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_start);

-- Atomically increment-or-create the counter and return whether the call is allowed.
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
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
