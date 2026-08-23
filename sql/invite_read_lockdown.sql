-- ============================================================================
-- CRITICAL — close public enumeration of invites, questions, photos and
-- contributions.
-- ============================================================================
-- WRITTEN, NOT APPLIED. Requires explicit user approval before running.
--
-- THE BUG (verified live against pg_policy, 2026-08-14, not theoretical)
--
--   table                 policy                                     roles   using
--   invites               Anyone can view active invites             PUBLIC  true
--   invite_questions      Anyone can view questions for active …     PUBLIC  exists(… is_active)
--   invite_photos         Anyone can view photos                     PUBLIC  true
--   invite_contributions  public-read-approved                       PUBLIC  approved = true
--
-- `PUBLIC` covers anon AND authenticated. So with the anon key — the key that
-- ships inside the client bundle and is public to anyone who opens devtools:
--
--   GET /rest/v1/invites?select=slug,title,message
--   -> every row, full private message bodies, no slug needed
--
-- Live row counts at time of writing: invites 7, invite_questions 9,
-- invite_photos 20, invite_contributions 0.
--
-- Three consequences:
--   1. The `invites` policy name is a lie. It says "active invites"; `true`
--      also exposes inactive, expired and soft-deleted rows.
--   2. It is not just anonymous visitors. ANY signed-up user can dump every
--      other creator's invites. That was the open question in the 2026-08-09
--      draft of this file; it is now answered, and the answer is yes.
--   3. invite_photos leaks storage_path + caption for every photo of every
--      invite. invite_contributions leaks contributor_name, message AND
--      contributor_email + visitor_hash — direct PII — for every approved
--      contribution. It has no rows today, so nothing has leaked yet; the leak
--      goes live with the first guest contribution.
--
-- `invite_views`, `invite_rsvps` and `invite_answers` are already correctly
-- restricted (anon reads 0 rows where service-role reads 16 / 4 / 23).
--
-- The product's own landing copy promises "a private reveal page". Secrecy-by-
-- URL is the entire security model of a surprise, and it does not exist today.
--
-- WHY A POLICY EDIT ALONE DOES NOT WORK
-- RLS cannot express "anon may read one row if it already knows the slug" —
-- PostgREST applies the policy identically to `?slug=eq.x` and to a bare list.
-- The fix is to take direct table SELECT away from these roles and hand them
-- functions that can only ever return one invite's worth of rows.
--
-- NOTHING IS DROPPED, per project rule. This adds RESTRICTIVE policies (which
-- Postgres ANDs with the OR-ed permissive ones) and CREATE OR REPLACEs
-- functions. No DROP POLICY, no DROP FUNCTION, no DROP COLUMN, no REVOKE of an
-- existing grant. Existing policies are left in place untouched.
--
-- ⚠️ SIGNATURES ARE FROZEN ON FIRST APPLY. `create or replace function` cannot
-- change a `returns table` signature — Postgres demands `drop function`, which
-- the never-drop rule forbids. Every column these readers will ever need must
-- be present below BEFORE this runs once.
--
-- ⚠️ APPLY ORDER MATTERS — the app changes must ship FIRST or the reveal page
-- 404s for every anonymous visitor:
--   1. Land the web + mobile app changes  (code, no SQL)
--   2. Gate both repos green
--   3. Deploy the web app change
--   4. THEN run this file
-- Rollback is at the bottom and also drops nothing.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Single-invite reader. SECURITY DEFINER so it can see the table while the
--    caller cannot. Returns only what the public reveal page needs.
--
--    `is_paid` IS included and must stay: it is the tier gate.
--    from-invite.ts:96 reads `tier: invite.is_paid ? "paid" : "free"`, and
--    mobile's reveal reads invite.is_paid. Omitting it stamps the free-tier
--    watermark on every paid invite. It is low-sensitivity — already inferable
--    from whether the watermark renders.
--
--    Deliberately NOT returned: creator_id, stripe_session_id, video_job_id.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_by_slug(p_slug text)
returns table (
  id                   uuid,
  slug                 text,
  title                text,
  message              text,
  theme                text,
  occasion_type        text,
  reveal_type          text,
  countdown_date       timestamptz,
  expires_at           timestamptz,
  events               jsonb,
  enable_dodge_no      boolean,
  accept_contributions boolean,
  is_paid              boolean,
  view_count           integer,
  response_count       integer,
  created_at           timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.slug, i.title, i.message, i.theme, i.occasion_type,
         i.reveal_type, i.countdown_date, i.expires_at, i.events,
         i.enable_dodge_no, i.accept_contributions, i.is_paid,
         i.view_count, i.response_count, i.created_at
    from public.invites i
   where i.slug = p_slug
     and i.deleted_at is null
     and i.is_active = true
     and (i.expires_at is null or i.expires_at > now())
   limit 1;
$$;

revoke all on function public.get_invite_by_slug(text) from public;
grant execute on function public.get_invite_by_slug(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. Liveness probe, NO CONTENT.
--
--    get_invite_by_slug deliberately returns zero rows for an inactive or
--    expired invite. That alone would collapse the reveal error screen back
--    into a single wrong "this surprise has closed" for all three cases —
--    the exact regression the cross-platform parity drive just fixed.
--
--    This returns only enough to classify (missing / inactive / expired) and
--    nothing an enumerator could harvest: no title, no message, no slug echo.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_state(p_slug text)
returns table (
  found      boolean,
  is_active  boolean,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select true, i.is_active, i.expires_at
    from public.invites i
   where i.slug = p_slug
     and i.deleted_at is null
   limit 1;
$$;

revoke all on function public.get_invite_state(text) from public;
grant execute on function public.get_invite_state(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. Questions for one invite.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_questions(p_invite_id uuid)
returns table (
  id                   uuid,
  invite_id            uuid,
  question_text        text,
  yes_label            text,
  no_label             text,
  attached_photo_index integer,
  require_answer       boolean,
  sort_order           integer
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.invite_id, q.question_text, q.yes_label, q.no_label,
         q.attached_photo_index, q.require_answer, q.sort_order
    from public.invite_questions q
    join public.invites i on i.id = q.invite_id
   where q.invite_id = p_invite_id
     and i.deleted_at is null
     and i.is_active = true
   order by q.sort_order;
$$;

revoke all on function public.get_invite_questions(uuid) from public;
grant execute on function public.get_invite_questions(uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Photos for one invite. storage_path is required — the client exchanges it
--    for a signed URL through the backend; the bucket itself is private, so the
--    path is not a fetchable handle on its own.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_photos(p_invite_id uuid)
returns table (
  id           uuid,
  invite_id    uuid,
  storage_path text,
  caption      text,
  rotation_deg double precision,
  sort_order   integer,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.invite_id, p.storage_path, p.caption, p.rotation_deg,
         p.sort_order, p.created_at
    from public.invite_photos p
    join public.invites i on i.id = p.invite_id
   where p.invite_id = p_invite_id
     and i.deleted_at is null
     and i.is_active = true
   order by p.sort_order;
$$;

revoke all on function public.get_invite_photos(uuid) from public;
grant execute on function public.get_invite_photos(uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Approved contributions for one invite.
--
--    contributor_email and visitor_hash are deliberately NOT returned. Today's
--    `approved = true` policy exposes both to anon; that is direct PII and a
--    de-anonymisation handle, and no reveal surface reads either.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_contributions(p_invite_id uuid)
returns table (
  id               uuid,
  invite_id        uuid,
  contributor_name text,
  message          text,
  photo_url        text,
  approved         boolean,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.invite_id, c.contributor_name, c.message, c.photo_url,
         c.approved, c.created_at
    from public.invite_contributions c
    join public.invites i on i.id = c.invite_id
   where c.invite_id = p_invite_id
     and c.approved = true
     and i.deleted_at is null
     and i.is_active = true
   order by c.created_at;
$$;

revoke all on function public.get_invite_contributions(uuid) from public;
grant execute on function public.get_invite_contributions(uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. Close the direct reads.
--
--    Postgres ANDs RESTRICTIVE policies with the OR-ed permissive ones, so
--    these narrow access without touching the existing policies. Effective
--    access becomes (permissive) AND (restrictive). NOTHING IS DROPPED.
--
--    SECURITY DEFINER functions run as the function owner and bypass RLS, so
--    every reader above keeps working for anonymous visitors.
--
--    The child-table policies subquery `invites`, and that subquery is itself
--    subject to the invites restrictive policy for the calling role — which is
--    what makes them collapse to zero rows for anon rather than needing their
--    own auth.uid() plumbing.
-- ----------------------------------------------------------------------------
create policy invites_select_restrict
  on public.invites
  as restrictive
  for select
  to anon, authenticated
  using (creator_id = auth.uid());

create policy invite_questions_select_restrict
  on public.invite_questions
  as restrictive
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.invites i
       where i.id = invite_questions.invite_id
         and i.creator_id = auth.uid()
    )
  );

create policy invite_photos_select_restrict
  on public.invite_photos
  as restrictive
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.invites i
       where i.id = invite_photos.invite_id
         and i.creator_id = auth.uid()
    )
  );

create policy invite_contributions_select_restrict
  on public.invite_contributions
  as restrictive
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.invites i
       where i.id = invite_contributions.invite_id
         and i.creator_id = auth.uid()
    )
  );

-- Net effect:
--   anon           -> auth.uid() is null, so every restrictive policy fails ->
--                     0 direct rows on all four tables. Reveal pages still work
--                     through the SECURITY DEFINER readers above.
--   authenticated  -> sees only its own invites and their children directly.
--                     Other creators' invites are reachable only through the
--                     slug reader, which is exactly the secrecy-by-URL model
--                     the product promises.
--   service_role   -> BYPASSRLS, unaffected. Cron, webhooks, the SSR reveal
--                     page, OG images and every admin path keep working.


-- ============================================================================
-- POST-APPLY VERIFICATION — run these, do not assume:
--
--   -- 1. policies present and restrictive
--   select c.relname, p.polname, p.polpermissive, p.polroles::regrole[]
--     from pg_policy p join pg_class c on c.oid = p.polrelid
--    where p.polname like '%_select_restrict';
--
--   -- 2. readers present and executable by anon
--   select proname, prosecdef from pg_proc
--    where proname in ('get_invite_by_slug','get_invite_state',
--                      'get_invite_questions','get_invite_photos',
--                      'get_invite_contributions');
--
--   -- 3. the probe that started this. With the ANON key, expect 0 rows where
--   --    it previously returned 7:
--   --    GET /rest/v1/invites?select=slug,title,message
--
--   -- 4. an anonymous reveal page still renders end to end.
-- ============================================================================

-- ============================================================================
-- ROLLBACK — restores today's behaviour exactly, and still drops nothing.
-- A restrictive policy of `true` is a no-op, so this neutralises the change
-- without removing anything:
--
--   alter policy invites_select_restrict              on public.invites              using (true);
--   alter policy invite_questions_select_restrict     on public.invite_questions     using (true);
--   alter policy invite_photos_select_restrict        on public.invite_photos        using (true);
--   alter policy invite_contributions_select_restrict on public.invite_contributions using (true);
-- ============================================================================

-- ============================================================================
-- FOLLOW-UP, not covered here: the misleading policy name.
-- "Anyone can view active invites" with `using (true)` is how this hid in plain
-- sight. Per the never-drop rule it is left alone. Worth renaming so the next
-- reader is not misled:
--   alter policy "Anyone can view active invites" on public.invites
--     rename to "Legacy: anyone can view any invite (narrowed by restrictive)";
-- ============================================================================
