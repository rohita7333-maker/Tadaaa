-- =============================================================================
-- free_tier_expiry.sql
-- Model B: free surprises expire 28 days after first reveal (first recipient view).
-- Soft delete: deleted_at replaces hard DELETE for all tiers.
-- GDPR purge handled by cron/purge-deleted (separate migration).
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add new columns to invites (idempotent)
-- -----------------------------------------------------------------------------
ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2. Partial indexes for perf (only index non-null rows)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invites_revealed_at
  ON invites (revealed_at)
  WHERE revealed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invites_deleted_at
  ON invites (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Also useful for purge cron — find old soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_invites_deleted_old
  ON invites (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Upgrade increment_view_count to plpgsql
--    On first view (count becomes 1) for FREE tier creators:
--      - stamp revealed_at = NOW()
--      - stamp expires_at  = NOW() + 28 days (only if not already set)
--    Paid (plus / unlimited): no expiry stamped.
--    Grandfather: existing invites without revealed_at keep expires_at as-is.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS increment_view_count(UUID);

CREATE OR REPLACE FUNCTION increment_view_count(p_invite_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count  INTEGER;
  v_creator_id UUID;
  v_tier       TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Atomic increment + capture results in one UPDATE
  UPDATE invites
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_invite_id
  RETURNING view_count, creator_id, expires_at
  INTO v_new_count, v_creator_id, v_expires_at;

  -- First view: stamp expiry for free-tier creators
  IF v_new_count = 1 AND v_creator_id IS NOT NULL THEN
    -- Lookup tier from profiles
    SELECT COALESCE(subscription_tier, 'free')
    INTO v_tier
    FROM profiles
    WHERE id = v_creator_id;

    -- Only stamp if free tier AND no expires_at already set (grandfather existing)
    IF (v_tier NOT IN ('plus', 'unlimited')) AND v_expires_at IS NULL THEN
      UPDATE invites
      SET
        revealed_at = NOW(),
        expires_at  = NOW() + INTERVAL '28 days'
      WHERE id = p_invite_id;
    END IF;
  END IF;

  RETURN v_new_count;
END;
$$;

-- Re-grant: DROP + CREATE loses previous grants
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO anon, authenticated;
