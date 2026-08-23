-- ============================================================================
-- MOBILE HANDOFF — phase 0 additive batch
-- ============================================================================
-- APPLIED 2026-08-16 (migrations `mobile_handoff_phase0` +
-- `open_invite_letter_refuse_locked`). Verified live — see the block at the end.
--
-- Everything the mobile handoff needs that production genuinely does not have.
-- Renames are NOT in here: the schema-adapter (`mobile/src/lib/schema-adapter.ts`)
-- absorbs every vocabulary difference, so nothing production already provides is
-- touched. Nothing is dropped, nothing is renamed, no existing column changes
-- type or nullability. Every statement is idempotent.
--
-- What this does NOT create, and why:
--   themes        — production themes are app-layer data (`src/lib/themes.ts`),
--                   parity-locked byte-identical across web and mobile. A table
--                   would fork that contract.
--   music_tracks  — blocked on the licensing question. No point in a table for a
--                   feature that may never ship.
--   reveal_events — production already decomposes this into invite_views /
--                   invite_rsvps / invite_answers / invite_reactions. Analytics
--                   aggregates those four; a fifth overlapping table would make
--                   two sources of truth for the same number.
--   surprise_videos — production models video 1:1 on `invites.video_*` with a
--                   real Remotion pipeline behind it. 1:N is a bigger change
--                   than the handoff realises; deferred to its own decision.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. PIN + password (D1 gate, C5 lock)
--
-- Stored HASHED. The handoff says "4 digits, hashed server-side" — a plaintext
-- PIN in a row that any future `select *` might reach is not a lock, it is a
-- label. Verification happens in the reveal reader, never client-side, so the
-- hash never leaves the database.
-- ----------------------------------------------------------------------------
alter table public.invites add column if not exists pin_hash text;
alter table public.invites add column if not exists pin_hint text;
alter table public.invites add column if not exists password_hash text;

comment on column public.invites.pin_hash is
  'bcrypt/pgcrypto hash of the 4-digit reveal PIN. NEVER returned by any reader.';
comment on column public.invites.pin_hint is
  'Optional creator-written hint shown above the D1 keypad. Not a secret.';


-- ----------------------------------------------------------------------------
-- 2. Letters (D5)
--
-- `invites.reveal_type` already accepts 'letters' (widened 2026-08-14). This is
-- the content those reveals render.
-- ----------------------------------------------------------------------------
create table if not exists public.letters (
  id         uuid primary key default uuid_generate_v4(),
  invite_id  uuid not null references public.invites(id) on delete cascade,
  label      text not null,
  body       text not null,
  position   integer not null default 0,
  -- null = openable now. Set = the D5 "date-locked" row state.
  unlock_at  timestamptz,
  -- Written once by an anonymous recipient when they open it.
  opened_at  timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists letters_invite_idx
  on public.letters (invite_id, position);

alter table public.letters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.letters'::regclass and polname = 'creator manages own letters'
  ) then
    create policy "creator manages own letters"
      on public.letters for all
      using (
        exists (select 1 from public.invites i
                 where i.id = letters.invite_id and i.creator_id = auth.uid())
      );
  end if;
end $$;

-- Recipients reach letters ONLY through the security-definer reader below —
-- same model as the 2026-08-14 lockdown. No direct anon SELECT policy exists.


-- ----------------------------------------------------------------------------
-- 3. notify_requests (D7 waiting room)
--
-- Email is the only way to reach someone who has nothing installed.
-- ----------------------------------------------------------------------------
create table if not exists public.notify_requests (
  id         uuid primary key default uuid_generate_v4(),
  invite_id  uuid not null references public.invites(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (invite_id, email)
);

alter table public.notify_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.notify_requests'::regclass
      and polname = 'creator reads own notify requests'
  ) then
    create policy "creator reads own notify requests"
      on public.notify_requests for select
      using (
        exists (select 1 from public.invites i
                 where i.id = notify_requests.invite_id and i.creator_id = auth.uid())
      );
  end if;
end $$;

-- anon writes go through record_notify_request() below, never a direct insert:
-- a bare INSERT policy would let anyone enumerate-by-writing and would carry no
-- rate limit.


-- ----------------------------------------------------------------------------
-- 4. push_tokens (F1)
-- ----------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.push_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.push_tokens'::regclass and polname = 'owner manages own push tokens'
  ) then
    create policy "owner manages own push tokens"
      on public.push_tokens for all using (user_id = auth.uid());
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 5. entitlements (phase 9 — StoreKit / Play Billing)
--
-- Production sells through Stripe today (`invites.is_paid`,
-- `profiles.subscription_tier`). Apple rejects card forms in native apps, so
-- mobile must use StoreKit. This is the single reconciliation point: BOTH rails
-- write here, and the app reads only this. Client writes are impossible —
-- receipts are verified in an Edge Function under the service role.
-- ----------------------------------------------------------------------------
create table if not exists public.entitlements (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('theme_unlock', 'unlimited', 'premium_surprise')),
  invite_id    uuid references public.invites(id) on delete set null,
  theme_id     text,
  source       text not null check (source in ('stripe', 'app_store', 'play_store')),
  store_txn_id text,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  -- One row per store transaction. The anti-replay guard for receipt validation.
  unique (source, store_txn_id)
);

create index if not exists entitlements_user_idx on public.entitlements (user_id, kind);

alter table public.entitlements enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.entitlements'::regclass and polname = 'owner reads own entitlements'
  ) then
    -- SELECT only. No client INSERT/UPDATE policy exists by design: an
    -- entitlement the client can write is an entitlement the client can forge.
    create policy "owner reads own entitlements"
      on public.entitlements for select using (user_id = auth.uid());
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 6. profiles — onboarding + biometric lock (A3, B6)
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists occasions text[] not null default '{}';
alter table public.profiles add column if not exists biometric_lock boolean not null default false;


-- ----------------------------------------------------------------------------
-- 7. Contribution moderation — closes a real gap
--
-- Production stores `approved boolean`, so REJECTED and PENDING are the same
-- value. After a refetch the B4 queue shows rejected items again, and the
-- moderator rejects them forever.
--
-- `approved` is NOT touched — every existing reader keeps working. This adds the
-- third state alongside it and backfills from the boolean.
-- ----------------------------------------------------------------------------
alter table public.invite_contributions
  add column if not exists moderation_status text
  check (moderation_status in ('pending', 'approved', 'rejected'));

update public.invite_contributions
   set moderation_status = case when approved then 'approved' else 'pending' end
 where moderation_status is null;


-- ----------------------------------------------------------------------------
-- 8. Readers for the new anon-facing content
--
-- Same pattern as sql/invite_read_lockdown.sql: SECURITY DEFINER, single
-- invite's worth of rows, no direct table grant.
-- ----------------------------------------------------------------------------

-- Letters for one live invite. Bodies of date-locked letters are NOT returned —
-- otherwise "unlocks 14 Sep" is decoration and the content is one devtools tab
-- away.
create or replace function public.get_invite_letters(p_slug text)
returns table (
  id        uuid,
  label     text,
  position  integer,
  unlock_at timestamptz,
  opened_at timestamptz,
  locked    boolean,
  body      text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.label, l.position, l.unlock_at, l.opened_at,
         (l.unlock_at is not null and l.unlock_at > now()) as locked,
         case when l.unlock_at is not null and l.unlock_at > now()
              then null else l.body end as body
    from public.letters l
    join public.invites i on i.id = l.invite_id
   where i.slug = p_slug
     and i.deleted_at is null
     and i.is_active = true
   order by l.position;
$$;

revoke all on function public.get_invite_letters(text) from public;
grant execute on function public.get_invite_letters(text) to anon, authenticated;


-- Mark a letter opened. Once only — a second call must not rewrite the date,
-- or "Opened 3 days ago" changes every time the recipient revisits.
create or replace function public.open_invite_letter(p_letter_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opened timestamptz;
  v_unlock timestamptz;
begin
  select opened_at, unlock_at into v_opened, v_unlock
    from public.letters where id = p_letter_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- REFUSE a date-locked letter. Found by probing the live function: the first
  -- version stamped opened_at on a letter 30 days from unlocking. The body
  -- stayed withheld so nothing leaked, but the row then rendered "Opened today"
  -- with no content — a state the recipient could not get out of. The client
  -- disables the tap; this is the half that actually holds, because the RPC is
  -- anon-callable directly.
  if v_unlock is not null and v_unlock > now() then
    return jsonb_build_object('ok', false, 'code', 'locked', 'unlock_at', v_unlock);
  end if;

  if v_opened is not null then
    return jsonb_build_object('ok', true, 'opened_at', v_opened);
  end if;

  update public.letters set opened_at = now() where id = p_letter_id
    returning opened_at into v_opened;
  return jsonb_build_object('ok', true, 'opened_at', v_opened);
end $$;

revoke all on function public.open_invite_letter(uuid) from public;
grant execute on function public.open_invite_letter(uuid) to anon, authenticated;


-- D7 waiting-room email capture. Rate limited per invite+email so the endpoint
-- cannot be used to blast mail or probe which slugs exist.
create or replace function public.record_notify_request(p_slug text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_email');
  end if;

  if not public.consume_rate_limit('notify:' || p_slug || ':' || lower(p_email), 5, 3600000) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  select id into v_id from public.invites
   where slug = p_slug and deleted_at is null and is_active = true;
  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  insert into public.notify_requests (invite_id, email) values (v_id, lower(p_email))
    on conflict (invite_id, email) do nothing;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.record_notify_request(text, text) from public;
grant execute on function public.record_notify_request(text, text) to anon, authenticated;


-- PIN verification. The hash NEVER leaves the database, and a wrong PIN costs an
-- attempt against the same limiter the rest of the anon surface uses.
-- ⚠️ `search_path` MUST include `extensions`: Supabase installs pgcrypto there,
-- not in public. With `set search_path = public` alone this fails at runtime with
-- `42883: function crypt(text, text) does not exist` — and ONLY when called as
-- anon over PostgREST, because a psql session's default path already includes it.
-- `extensions` is admin-owned and fixed, so appending it does not reopen the
-- search-path hijack that pinning the path exists to prevent.
create or replace function public.verify_invite_pin(p_slug text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_hash text;
begin
  if not public.consume_rate_limit('pin:' || p_slug, 10, 600000) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  select pin_hash into v_hash from public.invites
   where slug = p_slug and deleted_at is null and is_active = true;

  if v_hash is null then
    -- No PIN set, or no such invite: either way there is nothing to unlock.
    return jsonb_build_object('ok', false, 'code', 'no_pin');
  end if;

  return jsonb_build_object('ok', v_hash = crypt(p_pin, v_hash));
end $$;

revoke all on function public.verify_invite_pin(text, text) from public;
grant execute on function public.verify_invite_pin(text, text) to anon, authenticated;


-- ============================================================================
-- POST-APPLY VERIFICATION — run these, do not assume:
--
--   select column_name from information_schema.columns
--    where table_name='invites' and column_name in ('pin_hash','pin_hint','password_hash');
--
--   select relname, relrowsecurity from pg_class
--    where relname in ('letters','notify_requests','push_tokens','entitlements');
--
--   select proname, prosecdef from pg_proc where proname in
--     ('get_invite_letters','open_invite_letter','record_notify_request','verify_invite_pin');
--
--   -- date-locked letters must return a NULL body:
--   select label, locked, body is null as body_hidden from get_invite_letters('<slug>');
--
--   -- with the ANON key, all four new tables must return []:
--   GET /rest/v1/letters  /notify_requests  /push_tokens  /entitlements
-- ============================================================================

-- ============================================================================
-- ROLLBACK — drops nothing:
--   revoke execute on function public.get_invite_letters(text)     from anon, authenticated;
--   revoke execute on function public.open_invite_letter(uuid)     from anon, authenticated;
--   revoke execute on function public.record_notify_request(text,text) from anon, authenticated;
--   revoke execute on function public.verify_invite_pin(text,text) from anon, authenticated;
-- New columns are nullable or defaulted and are ignored by every existing reader.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 9. get_invite_pin_meta — added after the fact (migration `get_invite_pin_meta`)
--
-- D1 needs to know whether a slug is locked, and the creator's hint.
-- `get_invite_by_slug`'s RETURNS TABLE signature is frozen — extending it would
-- need DROP FUNCTION, which the never-drop rule forbids. A separate reader is
-- the drop-free way in.
--
-- Returns a BOOLEAN, never the hash. `has_pin` is not a secret: the keypad is
-- visible to anyone who opens the link, so hiding its existence buys nothing.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_pin_meta(p_slug text)
returns table (has_pin boolean, pin_hint text)
language sql
stable
security definer
set search_path = public
as $$
  select (i.pin_hash is not null) as has_pin, i.pin_hint
    from public.invites i
   where i.slug = p_slug and i.deleted_at is null and i.is_active = true
   limit 1;
$$;

revoke all on function public.get_invite_pin_meta(text) from public;
grant execute on function public.get_invite_pin_meta(text) to anon, authenticated;
