-- =============================================================================
-- subscription_tier.sql
-- Adds the monetization columns the entire paid-gate + Stripe webhook depend on.
-- WITHOUT these, getActiveTier() resolves every profile to 'free', so all paid
-- gates deny and the Stripe webhook (checkout.session.completed) fails to persist
-- a purchase -- no user can ever become paid.
--
-- Read/written by:
--   src/lib/tier.ts (getActiveTier)
--   src/app/dashboard/{page,layout}.tsx, src/app/settings/page.tsx
--   src/app/api/video/generate/route.ts        (paid video gate)
--   src/app/api/invite/[slug]/art/route.ts     (designer-art paid gate)
--   src/app/api/stripe/webhook/route.ts        (WRITES both columns)
--   sql/free_tier_expiry.sql increment_view_count() (reads subscription_tier)
--
-- RLS: profiles RLS unchanged. The Stripe webhook uses the service-role key,
-- which bypasses RLS, so it can UPDATE these columns. No new policy needed.
-- Safe to run multiple times (idempotent).
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Tier lookups happen on every dashboard load and paid-gate check.
CREATE INDEX IF NOT EXISTS profiles_subscription_tier_idx
  ON profiles (subscription_tier)
  WHERE subscription_tier <> 'free';
