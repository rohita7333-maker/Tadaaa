-- Track whether the branded welcome email has been sent for a profile.
-- Set by the auth callback on first authenticated visit; checked there to
-- prevent dup welcomes when users sign in repeatedly.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcomed_at TIMESTAMPTZ;
