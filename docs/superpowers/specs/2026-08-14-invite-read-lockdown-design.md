# Invite read lockdown — design

**Date:** 2026-08-14
**Status:** approved (approach), SQL not yet applied
**Severity:** blocking before any deploy

## The defect

`public.invites` carries a permissive SELECT policy named "Anyone can view active
invites" whose `USING` expression is the literal `true`, granted to role `PUBLIC`.
Verified live against `pg_policy` on 2026-08-14:

| table | policy | permissive | roles | cmd | using |
|---|---|---|---|---|---|
| invites | Anyone can view active invites | yes | PUBLIC | SELECT | `true` |
| invite_questions | Anyone can view questions for active invites | yes | PUBLIC | SELECT | `exists(... is_active)` |

`PUBLIC` covers `anon` **and** `authenticated`. Consequences:

1. The policy name is false. `true` also exposes inactive, expired and
   soft-deleted rows.
2. Any anonymous visitor holding the anon key — which ships inside the client
   bundle and is public to anyone with devtools — can
   `GET /rest/v1/invites?select=slug,title,message` and receive every row,
   including full private message bodies, without knowing a single slug.
3. It is not limited to anonymous visitors. Any signed-up user can dump every
   other creator's invites. (This was the open question in the 2026-08-09 draft.
   It is now answered, and the answer is yes.)

The product promises "a private reveal page". Secrecy-by-URL is the entire
security model of a surprise, and it does not currently exist.

RLS cannot express "anon may read one row if it already knows the slug" —
PostgREST applies the policy identically to `?slug=eq.x` and to a bare list. So
the fix must take direct table SELECT away from these roles and hand them a
function that can only ever return a single slug's row.

## Blast radius — measured, not assumed

The remedy adds RESTRICTIVE policies scoped `to anon, authenticated`.
`service_role` holds BYPASSRLS, so every call site on an admin client is
unaffected. Enumerated every reader of `invites` / `invite_questions` in both
repos:

**Web — one file.** `getInviteBySlug` (`src/actions/invite.ts:508`) already uses
`createAdminClient()`, as do the OG image, contribute page, report route,
art/story/collage routes, the mobile BFF and the answer route. The only
anon-client read of `invites` in the web codebase is `src/lib/invite-view.ts:33`.

> Corrects the prior handoff, which asserted the SSR reveal page read via the
> anon client. It does not.

**Mobile — two functions.** `getInviteForReveal` (`src/lib/db.ts:242`) and
`getRevealUnavailableReason` (`src/lib/reveal-unavailable.ts:42`) read `invites`
directly as anon for rows the viewer does not own. `invite/[id].tsx` and
`settings.tsx` are creator-scoped and pass `creator_id = auth.uid()` unchanged.

## Two defects in the drafted SQL — both must be fixed before first apply

`create or replace function` **cannot** change a `RETURNS TABLE` signature;
Postgres requires `DROP FUNCTION`, which the project's never-drop rule forbids.
The first apply is therefore the only cheap opportunity to get the column list
right.

1. **`is_paid` is omitted but is the tier gate.** `from-invite.ts:96` reads
   `tier: invite.is_paid ? "paid" : "free"`, and mobile's reveal reads
   `invite.is_paid`. Applying as drafted stamps the free-tier watermark on every
   paid invite routed through the RPC. `is_paid` is low-sensitivity — it is
   already inferable from whether the watermark renders.
2. **The reader filters out inactive/expired rows**, returning zero rows for
   them. That destroys the three-state reveal error screen
   (not-found / expired / closed) that the parity drive restored, because the
   classifier needs `is_active` + `expires_at` for a row the reader refuses to
   return.

## Design

### SQL (`sql/invite_read_lockdown.sql`, amended, still drop-free)

- `get_invite_by_slug(text)` — SECURITY DEFINER single-row reader, **plus
  `is_paid boolean`** in the return list. Continues to omit `creator_id`,
  `stripe_session_id`, `video_job_id`.
- `get_invite_questions(uuid)` — unchanged.
- `get_invite_state(text)` — NEW. Returns `(found boolean, is_active boolean,
  expires_at timestamptz)` and **no content whatsoever**. Enough to classify the
  error screen; nothing to enumerate. Chosen over relaxing
  `get_invite_by_slug` to return dead rows with their bodies attached.
- Two RESTRICTIVE SELECT policies `to anon, authenticated` using
  `creator_id = auth.uid()`. Postgres ANDs restrictive policies with the OR-ed
  permissive ones, so this narrows access without touching the existing policy.
  Nothing is dropped. Rollback is `alter policy ... using (true)`, a no-op
  restrictive policy, which also drops nothing.

### Web

`invite-view.ts` splits its clients rather than swapping wholesale:

- `createAdminClient()` for the invite row read — the function already builds one
  ~30 lines later in the same request.
- the session `createClient()` is **retained** for `auth.getUser()`. The admin
  client carries no session; swapping wholesale would silently break the
  creator-skip that stops a creator inflating their own view count and
  prematurely stamping `revealed_at`, starting the 28-day free-tier clock.

No RPC is required on web.

### Mobile

Migrate the two functions onto the RPCs in this same pass. Mobile is paused for
feature work, but leaving it un-migrated means the SQL plants a landmine that
detonates whenever mobile resumes. "Paused" must not mean "left broken".

- `getInviteForReveal` → `rpc("get_invite_by_slug")` + `rpc("get_invite_questions")`.
  `select("*")` is replaced by the RPC's fixed column list; every field the
  reveal consumes (`id, slug, title, message, theme, occasion_type, reveal_type,
  countdown_date, events, enable_dodge_no, accept_contributions, is_paid`) is in
  that list, verified by grep against the reveal components.
- `getRevealUnavailableReason` → `rpc("get_invite_state")`, feeding the existing
  pure `classifyReveal` unchanged.

## Apply order — non-negotiable

1. Land web + mobile app changes.
2. Gate both repos green.
3. Deploy the web app change.
4. **Then** run the SQL.

Reversed, every anonymous reveal page 404s.

## Testing

- Web: unit test asserting `invite-view` reads the row on a client that is not
  the session client, and that `getUser` is still called on the session client
  (the creator-skip regression this design is most likely to introduce).
- Mobile: unit tests asserting both functions call the RPCs and never
  `.from("invites")`, plus the existing `classifyReveal` cases held unchanged.
- Post-apply verification: re-query `pg_policy`, and re-run the anon-key
  enumeration probe expecting 0 rows where it previously returned 7.

## Known gaps

- The misleading policy name is left in place per the never-drop rule. A rename
  is suggested in the SQL file's footer but not executed.
- `invite_contributions` was inconclusive in the original probe (no rows). Not
  covered here.
- Rate-limit bypass on anon RPCs (M2, previously accepted) is unchanged by this
  work.
