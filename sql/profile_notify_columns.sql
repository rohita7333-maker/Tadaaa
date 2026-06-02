-- Notification preference columns on profiles.
-- The settings page (src/app/settings/page.tsx) and updateNotifications
-- (src/actions/account.ts) read/write these; getProfile() selects them.
-- They were missing in prod, so getProfile()'s SELECT errored and returned
-- null, which silently blanked the avatar (R fallback) and never persisted
-- notification prefs. Defaults match the UI's defaultChecked values.
alter table public.profiles
  add column if not exists notify_on_view boolean not null default false,
  add column if not exists notify_on_answer boolean not null default true,
  add column if not exists notify_occasions boolean not null default true;
