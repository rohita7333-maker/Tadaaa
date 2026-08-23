-- ============================================================================
-- PENDING — NOT RUN. Requires the user's explicit yes before execution.
--
-- Purpose: make W-D1's analytics panel computable. The frame draws
--   "How far they got:  Opened 100% · Scrolled 84% · Saw photos 71% · RSVP'd 46%"
--   "AVG TIME 1:42"
--   "Where from:  India 82 · United Kingdom 38 · UAE 21"
-- and none of it can be derived from what we store today. `invite_views` holds
-- only (id, invite_id, viewed_at, user_agent) — no depth, no dwell, no country.
--
-- The existing funnel in src/lib/analytics-data.ts is opened -> rsvped ->
-- answered, computed from three separate tables. That stays; this adds the two
-- middle steps and the two new tiles.
--
-- PRIVACY POSTURE (deliberate, please read before approving):
--   * No IP address is stored, ever. `country` is resolved from request geo at
--     write time and only the two-letter code is persisted.
--   * No visitor identifier is stored. Dwell and depth are per-SESSION only,
--     via a random per-page-load id that is never persisted anywhere else and
--     cannot be joined back to a person.
--   * user_agent is deliberately NOT duplicated here; invite_views already has
--     it and one copy is enough.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- the table
create table if not exists public.invite_events (
  id           uuid primary key default gen_random_uuid(),
  invite_id    uuid not null references public.invites(id) on delete cascade,

  -- One row per milestone reached. 'opened' is redundant with invite_views by
  -- design: it makes the funnel computable from a single table, and lets the
  -- percentages stay internally consistent even when the view counter lags.
  kind         text not null check (kind in ('opened','scrolled','saw_photos','finished')),

  -- Ephemeral per-page-load id. NOT a visitor id: regenerated on every load,
  -- never stored client-side, never joined to a user. Present only so the four
  -- milestones of one sitting can be de-duplicated and a dwell computed.
  session_key  text not null check (length(session_key) between 8 and 64),

  -- Milliseconds from 'opened' to this milestone. Null on 'opened' itself.
  -- Capped on write so a tab left open overnight cannot skew the average.
  elapsed_ms   integer check (elapsed_ms is null or (elapsed_ms >= 0 and elapsed_ms <= 3600000)),

  -- ISO 3166-1 alpha-2, resolved from request geo. Never an IP.
  country      text check (country is null or country ~ '^[A-Z]{2}$'),

  created_at   timestamptz not null default now()
);

-- One row per (session, milestone). A recipient scrolling up and back down
-- must not inflate anything.
create unique index if not exists invite_events_session_kind_uniq
  on public.invite_events (invite_id, session_key, kind);

-- The read pattern is always "this invite, recent first".
create index if not exists invite_events_invite_created_idx
  on public.invite_events (invite_id, created_at desc);

-- ------------------------------------------------------------------- RLS
-- Same posture as the rest of the reveal tables after the enumeration
-- lockdown: nothing is readable by anon or by an arbitrary signed-in user.
-- Writes go through the SECURITY DEFINER function below; reads go through the
-- creator-scoped reader.
alter table public.invite_events enable row level security;

drop policy if exists invite_events_no_direct_read on public.invite_events;
create policy invite_events_no_direct_read
  on public.invite_events
  as restrictive
  for select
  to anon, authenticated
  using (false);

drop policy if exists invite_events_no_direct_write on public.invite_events;
create policy invite_events_no_direct_write
  on public.invite_events
  as restrictive
  for insert
  to anon, authenticated
  with check (false);

-- --------------------------------------------------------------- the writer
-- SECURITY DEFINER so anon can record a milestone without the table being
-- writable. Validates the invite is live before accepting anything.
--
-- NOTE the search_path: Supabase installs pgcrypto into `extensions`, and a
-- definer function with `set search_path = public` alone cannot resolve
-- gen_random_uuid() when called as anon over PostgREST. This has bitten this
-- project before (error 42883, reproducible only over the API, invisible in a
-- psql session). Do not "tidy" this line.
create or replace function public.record_invite_event(
  p_invite_id   uuid,
  p_kind        text,
  p_session_key text,
  p_elapsed_ms  integer default null,
  p_country     text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ok boolean;
begin
  if p_kind not in ('opened','scrolled','saw_photos','finished') then
    return jsonb_build_object('ok', false, 'code', 'bad_kind');
  end if;

  select true into v_ok
  from public.invites i
  where i.id = p_invite_id
    and i.deleted_at is null
    and i.is_active
    and (i.expires_at is null or i.expires_at > now())
  limit 1;

  if v_ok is not true then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  insert into public.invite_events (invite_id, kind, session_key, elapsed_ms, country)
  values (
    p_invite_id,
    p_kind,
    p_session_key,
    least(coalesce(p_elapsed_ms, 0), 3600000),
    nullif(upper(p_country), '')
  )
  on conflict (invite_id, session_key, kind) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_invite_event(uuid, text, text, integer, text) from public;
grant execute on function public.record_invite_event(uuid, text, text, integer, text) to anon, authenticated;

-- --------------------------------------------------------------- the reader
-- Creator-scoped. Returns aggregates only — never individual rows, so this
-- cannot become a visitor-tracking surface even by accident.
create or replace function public.get_invite_event_summary(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_creator uuid;
  v_result  jsonb;
begin
  select creator_id into v_creator
  from public.invites
  where id = p_invite_id and deleted_at is null;

  if v_creator is null or v_creator <> auth.uid() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select jsonb_build_object(
    'ok', true,
    'funnel', (
      select jsonb_object_agg(kind, n)
      from (
        select kind, count(distinct session_key) as n
        from public.invite_events
        where invite_id = p_invite_id
        group by kind
      ) f
    ),
    'avg_ms', (
      select round(avg(elapsed_ms))
      from public.invite_events
      where invite_id = p_invite_id and kind = 'finished' and elapsed_ms is not null
    ),
    'countries', (
      select jsonb_agg(jsonb_build_object('country', country, 'views', n) order by n desc)
      from (
        select country, count(distinct session_key) as n
        from public.invite_events
        where invite_id = p_invite_id and kind = 'opened' and country is not null
        group by country
        limit 20
      ) c
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_invite_event_summary(uuid) from public;
grant execute on function public.get_invite_event_summary(uuid) to authenticated;

commit;

-- ============================================================================
-- SEPARATE CHANGE, same approval — ONE stale overload. Only one.
--
-- Three RPCs each exist as two same-named functions. I initially flagged all
-- three as split-brain. That was wrong, and dropping either half of two of them
-- would have broken working features. Bodies inspected 2026-08-17:
--
--   open_invite_letter(uuid)                    -> SAFE convenience wrapper.
--     Reads invites.pin_hash; returns {'ok':false,'code':'pin_required'} when a
--     PIN is set, otherwise delegates to the (uuid, text) form with a null pin.
--     KEEP.
--
--   record_reaction(text, text, text)           -> SAFE convenience wrapper.
--     Delegates to the 4-arg form with a null pin. The 4-arg form rejects
--     `p_pin is null` whenever pin_hash is set, so the PIN gate is NOT
--     bypassable through the short form. KEEP.
--
--   record_rsvp(uuid, text, text)               -> GENUINELY STALE.
--     The 4-arg form (…, p_name) is what /api/invite/rsvp actually calls; the
--     3-arg form predates named RSVPs and nothing references it.
--
-- So the only drop is:
--
--   drop function if exists public.record_rsvp(uuid, text, text);
--
-- Re-confirm immediately before running:
--   select p.proname, pg_get_function_identity_arguments(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'record_rsvp';
-- ============================================================================
