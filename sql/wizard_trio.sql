-- wizard-trio persistence: music (additive, never-drop rule).
-- CONFIRM-GATED: do not apply without explicit user yes.
-- Rollback: column is nullable and unread until app code ships; leave in place per never-drop.
--
-- Video message needs NO migration: the recorder reuses the existing
-- invites.video_storage_path + video_status columns (already read by
-- getInviteBySlug, cleaned by purge-deleted/account-delete, played by
-- TapToReveal/CountdownReveal). A recorded message and an AI-generated
-- video share the slot — last writer wins.

alter table invites add column if not exists music_track text;

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
