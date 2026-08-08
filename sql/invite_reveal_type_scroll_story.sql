-- Widen the invites.reveal_type CHECK constraint to allow 'scroll_story'.
--
-- Phase 2 of the scroll-story feature lets creators pick a cinematic "Scroll
-- Story" reveal. createInviteShell() writes reveal_type = 'scroll_story', which
-- the pre-existing constraint (tap | countdown only) rejects. Without this the
-- publish flow fails at insert time.
--
-- Idempotent: drops the old constraint if present, then adds the widened one.
-- Reversible: to roll back, restore the two-value constraint (see bottom).

ALTER TABLE invites
  DROP CONSTRAINT IF EXISTS invites_reveal_type_check;

ALTER TABLE invites
  ADD CONSTRAINT invites_reveal_type_check
  CHECK (reveal_type IN ('tap', 'countdown', 'scroll_story'));

-- Rollback (only safe once no rows use 'scroll_story'):
--   ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_reveal_type_check;
--   ALTER TABLE invites ADD CONSTRAINT invites_reveal_type_check
--     CHECK (reveal_type IN ('tap', 'countdown'));
