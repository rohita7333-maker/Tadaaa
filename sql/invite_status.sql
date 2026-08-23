-- ============================================================================
-- invites.status — lifecycle label
-- ============================================================================
-- WRITTEN, NOT APPLIED. Requires explicit user approval before running.
--
-- WHY
-- Two things need this column:
--   1. public.record_rsvp(uuid, text, text) — the legacy 3-arg overload — gates
--      on `v_invite.status = 'expired'`. The column was removed at some point
--      but the function was not updated, so that overload raises on every call.
--      Adding the column repairs it instead of destroying it.
--   2. The editorial mockup's dashboard renders live / scheduled / expired
--      badges per invite. P2 needs this label anyway.
--
-- DESIGN — no split-brain
-- An earlier version of this schema had `status` AND `is_active` as two
-- independently-written columns, which drifted (see PLAN_free_tier_expiry.md).
-- This version does NOT repeat that mistake. `is_active` + `expires_at` +
-- `deleted_at` + `countdown_date` stay the single source of truth and remain the
-- hot-path gate. `status` is a DERIVED label, recomputed by trigger on every
-- insert and update. No application code ever writes it directly.
--
-- Time-based transitions (an invite crossing `expires_at`) do not fire a
-- trigger on their own. The `expire-invites` cron already flips `is_active`,
-- and that UPDATE causes the trigger to recompute `status` to 'expired'. So the
-- cron needs no further change.
--
-- Additive, idempotent, reversible. Nothing is dropped: no DROP TABLE, no
-- DROP COLUMN, no DROP FUNCTION, no DROP TRIGGER. Re-running is safe.
--
-- ROLLBACK (only if explicitly asked for — this project does not drop things):
--   -- The column can simply be left in place and ignored; it is derived and
--   -- carries no independent truth.
-- ============================================================================

-- 1. The column. Defaults to 'live' so existing inserts keep working unchanged.
alter table public.invites
  add column if not exists status text not null default 'live';

-- 2. Allowed values. Added only if absent, so a re-run never has to drop it.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.invites'::regclass
      and conname  = 'invites_status_check'
  ) then
    alter table public.invites
      add constraint invites_status_check
      check (status in ('draft', 'scheduled', 'live', 'expired', 'archived'));
  end if;
end $$;

-- 3. The single derivation rule. Used by both the backfill and the trigger so
--    they can never disagree. IMMUTABLE-unsafe (`now()`), hence a function
--    rather than a generated column.
create or replace function public.derive_invite_status(
  p_deleted_at     timestamptz,
  p_expires_at     timestamptz,
  p_is_active      boolean,
  p_countdown_date timestamptz
) returns text language sql stable as $$
  select case
    when p_deleted_at is not null                              then 'archived'
    when p_expires_at is not null and p_expires_at < now()     then 'expired'
    when p_is_active is distinct from true                     then 'archived'
    when p_countdown_date is not null
         and p_countdown_date > now()                          then 'scheduled'
    else 'live'
  end;
$$;

-- 4. Backfill every existing row from the current source of truth.
update public.invites
   set status = public.derive_invite_status(
     deleted_at, expires_at, is_active, countdown_date
   )
 where status is distinct from public.derive_invite_status(
     deleted_at, expires_at, is_active, countdown_date
   );

-- 5. Keep it derived forever. CREATE OR REPLACE TRIGGER (PG14+) so nothing is
--    dropped on re-run.
create or replace function public.sync_invite_status()
returns trigger language plpgsql as $$
begin
  new.status := public.derive_invite_status(
    new.deleted_at, new.expires_at, new.is_active, new.countdown_date
  );
  return new;
end $$;

create or replace trigger invites_sync_status
  before insert or update on public.invites
  for each row execute function public.sync_invite_status();

-- 6. Dashboard filters by status.
create index if not exists invites_status_idx on public.invites (status);
