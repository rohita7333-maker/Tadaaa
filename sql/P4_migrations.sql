-- ============================================================================
-- P4 MIGRATIONS — written, NOT applied. Each needs explicit approval.
-- Ordered by the ship order in the plan: QR (no SQL) -> reactions -> letters
-- -> timezone. Nothing here drops data, columns, functions or triggers.
-- ============================================================================


-- ============================================================================
-- M2 — REACTIONS  (ship second; QR needs no SQL at all)
-- ============================================================================
-- Guests are anonymous, so there is no direct table write. Reactions go through
-- a SECURITY DEFINER RPC, the same pattern record_rsvp / record_answer already
-- use, so the liveness check cannot be bypassed by hitting PostgREST directly.
--
-- Rate limiting is called EXPLICITLY below. It is not inherited: record_rsvp
-- carries no rate limit (verified against pg_get_functiondef on the live DB),
-- so there was nothing to inherit and an earlier draft of this comment was
-- simply wrong about it.
--
-- The emoji is stored as a KEY ('heart'), never as a glyph. The editorial
-- identity bans emoji-as-content, so the UI renders these as drawn icons; the
-- key also survives font and platform differences.

create table if not exists public.invite_reactions (
  id         uuid primary key default uuid_generate_v4(),
  invite_id  uuid not null references public.invites(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.invite_reactions'::regclass
      and conname  = 'invite_reactions_emoji_check'
  ) then
    alter table public.invite_reactions
      add constraint invite_reactions_emoji_check
      check (emoji in ('heart', 'laugh', 'cry', 'fire'));
  end if;
end $$;

create index if not exists invite_reactions_invite_idx
  on public.invite_reactions (invite_id, created_at desc);

alter table public.invite_reactions enable row level security;

-- Only the creator can read. Note this is written as a normal permissive
-- policy AND the invites-lockdown restrictive policy is independent of it.
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.invite_reactions'::regclass
      and polname  = 'creator reads own invite reactions'
  ) then
    create policy "creator reads own invite reactions"
      on public.invite_reactions
      for select
      using (
        exists (
          select 1 from public.invites i
           where i.id = invite_id and i.creator_id = auth.uid()
        )
      );
  end if;
end $$;

-- ⚠️ SIGNATURE FREEZES ON FIRST APPLY. Adding a parameter later does NOT
-- replace this function — Postgres creates a second overload, and clearing that
-- needs a DROP. `p_visitor_hash` is therefore present from the start.
create or replace function public.record_reaction(
  p_slug         text,
  p_emoji        text,
  p_visitor_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_emoji not in ('heart', 'laugh', 'cry', 'fire') then
    return jsonb_build_object('ok', false, 'code', 'invalid_emoji');
  end if;

  -- Reactions are the most spammable surface in the product: anonymous, one
  -- tap, no cost. An earlier draft of this file claimed reactions inherited
  -- rate limiting from the existing anon RPCs — they do not. record_rsvp has
  -- no rate limit either (verified against pg_get_functiondef), so there was
  -- nothing to inherit. This calls the limiter explicitly.
  --
  -- Scoped to visitor AND invite so one guest spamming cannot exhaust the
  -- budget for everyone else reacting to the same surprise.
  if not public.consume_rate_limit(
       'reaction:' || p_slug || ':' || coalesce(p_visitor_hash, 'anon'),
       60,
       3600000
     ) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  -- Same liveness gate the 4-arg record_rsvp uses. Deliberately does NOT
  -- reference invites.status: is_active + expires_at + deleted_at stay the
  -- hot-path truth, and status is a derived label.
  select id into v_id
    from public.invites
   where slug = p_slug
     and is_active = true
     and deleted_at is null
     and (expires_at is null or expires_at > now());

  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  insert into public.invite_reactions (invite_id, emoji) values (v_id, p_emoji);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.record_reaction(text, text, text) from public;
grant execute on function public.record_reaction(text, text, text) to anon, authenticated;

-- Aggregate counts for the reveal page, without exposing individual rows.
create or replace function public.get_reaction_counts(p_slug text)
returns table (emoji text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.emoji, count(*)::bigint
    from public.invite_reactions r
    join public.invites i on i.id = r.invite_id
   where i.slug = p_slug
     and i.is_active = true
     and i.deleted_at is null
   group by r.emoji;
$$;

revoke all on function public.get_reaction_counts(text) from public;
grant execute on function public.get_reaction_counts(text) to anon, authenticated;

-- ROLLBACK: leave the table in place (never drop). To disable the feature,
-- revoke execute on the two functions:
--   revoke execute on function public.record_reaction(text,text,text) from anon, authenticated;


-- ============================================================================
-- M3 — TIMEZONE  (ship fourth; trivial, purely additive)
-- ============================================================================
-- countdown_date is already timestamptz, so this is a RENDERING concern only:
-- store the creator's chosen IANA zone and format with Intl on the client.
alter table public.invites
  add column if not exists display_timezone text;

-- ROLLBACK: leave the column; it is nullable and ignored when unset.


-- ============================================================================
-- M1 — OPEN WHEN LETTERS  ⚠️ NEEDS A RULING FROM YOU
-- ============================================================================
-- This is the ONE P4 migration that cannot be written drop-free, and I am not
-- going to pretend otherwise.
--
-- The live constraint is:
--   invites_reveal_type_check CHECK (reveal_type = ANY (ARRAY['tap','countdown','scroll_story']))
--
-- Postgres offers no ALTER for a CHECK expression. Adding a second constraint
-- does not work either — multiple CHECKs are ANDed, so the existing one would
-- still reject 'letters'. The only mechanism is DROP + ADD.
--
-- What that costs: nothing. No data is touched, no column is removed, and the
-- new constraint is a strict SUPERSET of the old one — every value valid before
-- stays valid. The DROP and the ADD are in one transaction, so there is no
-- window where the table is unconstrained.
--
-- Your rule is "never ever drop anything, think long term". I read that as
-- protecting data and functionality, and this protects both. But it is your
-- rule, so it is your call. I am not applying this without you saying yes to
-- this specific statement.
--
-- If you would rather nothing was ever dropped, the alternative is to leave the
-- constraint alone and NOT ship Letters as a reveal_type value — which would
-- mean either a separate boolean column or no Letters feature. Say which.

-- begin;
--   alter table public.invites drop constraint invites_reveal_type_check;
--   alter table public.invites add constraint invites_reveal_type_check
--     check (reveal_type in ('tap', 'countdown', 'scroll_story', 'letters'));
-- commit;

-- ROLLBACK (same shape, back to three values — only safe if no row uses
-- 'letters' yet):
--   begin;
--     alter table public.invites drop constraint invites_reveal_type_check;
--     alter table public.invites add constraint invites_reveal_type_check
--       check (reveal_type in ('tap', 'countdown', 'scroll_story'));
--   commit;
