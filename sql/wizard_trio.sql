-- wizard-trio persistence: music + video message (additive, never-drop rule).
-- CONFIRM-GATED: do not apply without explicit user yes.
-- Rollback: both columns are nullable and unread until app code ships; leave in place per never-drop.

alter table invites add column if not exists music_track text;
alter table invites add column if not exists video_message_path text;

-- Anonymous reveal pages need the track id; get_invite_by_slug's RETURNS TABLE
-- is frozen (see project traps), so a separate narrow reader per precedent.
create or replace function get_invite_music(p_slug text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select music_track
    from invites
   where slug = p_slug
     and is_active = true
     and deleted_at is null
$$;

grant execute on function get_invite_music(text) to anon, authenticated;
