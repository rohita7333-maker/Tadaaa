# PROGRESS — web desktop parity build

Read `2026-08-17-web-desktop-parity.md` first. Resume at the first phase not DONE.
**No commits. No migration without the SQL shown and an explicit yes.**

## Entry baseline — 2026-08-17, verified, pasted

```
tsc     --noEmit        -> exit 0
eslint                  -> 0 errors, 12 warnings
vitest run              -> Test Files 55 passed (55) / Tests 768 passed (768)
```

Live DB before any change (project `xrlmnlknymgakswsbawk`):
```
invites 13 · invite_photos 32 · invite_rsvps 16 · invite_answers 30
video_status -> NULL on all 13 invites (no render has ever completed)
record_rsvp  -> TWO overloads (3-arg stale + 4-arg live)
```

## Orchestrator verification of agent claims — 2026-08-17 18:29

Agent reports are not evidence. Re-ran every gate myself and probed the claims.

```
tsc --noEmit -> 0    eslint -> 0 errors / 12 warnings    vitest -> 69 files / 968 tests
next build   -> Compiled successfully in 7.3s, 56/56 static pages
```

**One agent claim did not hold: "All six legacy URLs 308".** Measured against a
PRODUCTION build, the page-level `permanentRedirect()` stubs answered
**200 with a full HTML document**:

```
/templates                       200 ->            (claimed 308)
/templates?template=golden-hour  200 ->
```

A browser did land on `/themes?template=golden-hour`, so it worked for humans — but
as a SOFT redirect. A crawler sees two live URLs: duplicate content, no link equity
moved. Since the stated reason for these routes is "the old URL is already in the
wild, in emails and search results", the soft version fails its only job.

Fixed by declaring them in `next.config.ts` `redirects()`, which runs before
rendering. Re-measured on a fresh production build:

```
/templates                       308 -> /themes
/templates?template=golden-hour  308 -> /themes?template=golden-hour
/settings                        308 -> /account
/settings/data                   308 -> /account/data
/dashboard/activity              308 -> /activity
```

New `src/lib/legacy-redirects.test.ts` (5 tests) keeps `next.config.ts` and
`LEGACY_ROUTES` in sync, and fails on `permanent: false` or a redirect chain. The
page stubs are left in place as an unreachable fallback.

**Independently confirmed** (my own measurements, not the agents'):
- Reveal chrome share pill is now `rgba(26,26,26,0.65)` with a paper glyph on the
  paper photo stage — the white-on-white invisibility is real and really fixed.
- `/themes`, `/activity`, `/account` all resolve; auth-gated ones 307 to signin.

## Phase 5 groundwork (orchestrator, built while Phases 3+4 ran)

`src/lib/invite-events.ts` + 25 tests — the pure half of W-D1's funnel, dwell and
geography. Reproduces the frame's numbers exactly:

```
Opened 100 · Scrolled 84 · Saw photos 71 · RSVP'd 46
formatAvgTime(102_000) -> "1:42"
buildCountryRows -> India 82 · United Kingdom 38 · UAE 21
```

Decisions baked in, so they are not re-litigated downstream:
- Percentages are share-of-openers, not step-relative. A reveal with no photos
  never fires `saw_photos`, and a step-relative number would render that as a
  0% drop-off rather than "not applicable".
- Later milestones are clamped to earlier ones — two racing beacons could
  otherwise report more scrolls than opens.
- `formatAvgTime(null)` is `"—"`, never `"0:00"`. "They bounced instantly" is a
  different and much worse claim than "we don't know yet".
- An unmapped country renders as its code, never as "Unknown".

`src/app/api/invite/events/route.ts` — the beacon. **Degrades on purpose**: with
the migration unapplied it answers 501 `telemetry_disabled` rather than 500ing on
every reveal, and warns once per process instead of once per request. Verified live:

```
POST /api/invite/events (valid)    -> 501 {"ok":false,"code":"telemetry_disabled"}
POST /api/invite/events (bad kind) -> 400 {"error":"Unknown event kind"}
```

Country is read from `x-vercel-ip-country` / `cf-ipcountry` at the edge and reduced
to two letters — never taken from the client (forgeable, would make the panel a
lie) and no IP is stored.

**Bundler trap worth keeping:** Turbopack's parser rejects the `in` operator inside
a default parameter initialiser — `"randomUUID" in crypto` typechecked clean under
`tsc` and then 500ed at request time with `Expected ',', got 'in'`. Hoisted to a
named function. `tsc` passing is not evidence the bundler can parse it.

## MIGRATIONS APPLIED — 2026-08-17 18:45, user approved 4, THREE ran

### 1. `invite_events_telemetry` — APPLIED, verified end to end
Table + `record_invite_event` + `get_invite_event_summary`, RLS on, both direct
read and direct write denied to anon/authenticated (writes go through the definer).
Live proof through the real HTTP route:
```
opened / scrolled / saw_photos / finished  -> {"ok":true} 200 each
replay of `opened` on the same session_key -> 200, still 1 row  (dedupe works)
elapsed_ms 102000 stored; country null on localhost (no geo header — correct)
```
Probe rows deleted afterwards; `invite_events` is back to 0 rows.

**Grant bug found and fixed in a follow-up migration.** `revoke all ... from public`
did NOT remove anon's execute on `get_invite_event_summary` — Supabase's
ALTER DEFAULT PRIVILEGES grants EXECUTE to `anon`/`authenticated` *explicitly* at
creation, so revoking from PUBLIC leaves those intact. Had to `revoke ... from anon`
by name. Final state verified:
```
summary anon           false     summary authenticated  true
letters(text,text) anon true     record_invite_event anon true
```
Worth remembering: on Supabase, `revoke from public` is not sufficient to lock a
function down.

**Route hardening from the same probe:** a malformed `inviteId` 500ed (Postgres
`invalid input syntax for type uuid` on the cast). Now shape-checked with `isUuid`
and answered 400 — a bad beacon is a client error and shouldn't drown real 500s.

### 2. `drop_stale_record_rsvp_3arg` — APPLIED
`record_rsvp` overloads: 2 -> **1**. The live 4-arg form is untouched.

### 3. `get_invite_letters_pin_aware` — APPLIED, bug reproduced AND fix proven
Added `get_invite_letters(p_slug, p_pin)`. Proven by temporarily PIN-locking the
`letters-verify` invite (original `pin_hash` was NULL, captured first, restored
after — confirmed back to NULL with 4 letters readable):
```
OLD reader, PIN set   -> 0 letters   <- the empty-shelf bug, reproduced live
NEW reader, right PIN -> 4 letters   <- fixed
NEW reader, wrong PIN -> 0 letters
NEW reader, no PIN    -> 0 letters
locked bodies leaked  -> 0
```

### 4. Purge of self-preview rows — **NOT RUN. Cannot be done as specified.**
Neither table records who submitted:
```
invite_rsvps   : id, invite_id, visitor_hash, user_agent, responded_at, name
invite_answers : id, question_id, answer, answered_at, user_agent, ip_hash
```
No `user_id` on either. `visitor_hash` is a SHA-256 of a random localStorage token
and is not linkable to the creator's account. There is therefore **no query that
distinguishes a creator's preview from a real guest's RSVP** — the only executable
version is "delete everything", which would irreversibly destroy real recipients'
responses.

Not run on an inferred instruction. Options put back to the user; the going-forward
leak is already closed either way (Phase 1.5), so the count stops growing.

## Phase 6 — open-when letters SHIPPED (orchestrator, while 3+4 ran)

**The bug:** `reveal_type === "letters"` had no branch in
`src/app/surprise/[slug]/page.tsx` and fell through to `TapToReveal`. Two live
invites carry that reveal type, so their letters were **never rendered at all**.

Built:
- `src/lib/letters.ts` + 21 tests — state machine, W-F5 status lines, W-F10
  position labels, initial-open selection, aria names that never depend on a glyph.
- `src/components/surprise/LettersReveal.tsx` — dark shelf; at desktop the list
  sits beside the open letter and the letter is the only light surface (W-F10).
- `src/app/api/invite/[slug]/letters/open/route.ts` — forwards to
  `open_invite_letter`; does NOT re-implement the lock or PIN checks, so the
  rules live in exactly one place. `pin_required` -> 401 so the client can prompt.
- Page branch, incl. the PIN-locked case showing `PIN_LOCKED_LETTERS_GAP`
  rather than an empty shelf.

Browser-verified live on `/surprise/letters-verify` at 390 and 1440:
```
Open when you miss me      Opened yesterday
Open when you cannot sleep Opened today
Open on our anniversary    Unlocks 15 Sep     (locked, dimmed, lock glyph)
Open when you are proud    Sealed -> Opened today after opening

aria: "Open on our anniversary — locked, unlocks 15 Sep"
open: "LETTER FOUR OF FOUR / Open when you are proud / I already am."
```
Screens: `verify/letters-390.png`, `letters-1440.png`, `letters-1440-open.png`

**Gap vs the frame:** W-F5/F10 show a recipient line ("For Arun"); the reader
does not return `recipient_name`, so it is omitted rather than faked.

**Test-suite note, `\p{Emoji}`:** an assertion that an aria-label carries no emoji
failed on "14 Oct" — ASCII digits carry the Emoji property (keycap bases).
`\p{Extended_Pictographic}` is the property that means "a pictograph".

## Phase status

| Phase | Title | Status |
|---|---|---|
| 0 | Baseline, spec extraction, safety net | DONE |
| 1 | The six reported bugs | IN PROGRESS |
| 2 | App shell — top bar + left rail | DONE (shell + routes; see Phase 2 log) |
| 3 | Dashboard, themes, states | DONE (browser + DB verified; see Phase 3 log) |
| 4 | 6-step wizard with live preview | DONE for the wizard; publish blocked on tier (see Phase 4 log) |
| 5 | Detail+analytics, moderation, account | DONE (browser + DB verified; see Phase 5 log) |
| 6 | Reveals, contributor, entry | PARTIAL (PIN gate DONE + proved; A0/A2 not started — see Phase 6 log) |
| 7 | Wire everything, harden, verify | TODO |

## Phase 0 artifacts

- `tadaaaa/design-handoff/web-frames/W-*.png` — 33 frames, 1440@2x
- `tadaaaa/design-handoff/web-spec.md` — 20,450 chars of spec prose
- Token diff: spec tokens == `globals.css` already. `--head` is Georgia. No re-skin.

## Phase 1 log

Gates after this batch — all pasted, none regressed:
```
tsc --noEmit  -> exit 0
eslint        -> 0 errors, 12 warnings (unchanged from baseline)
vitest run    -> Test Files 62 passed (62) / Tests 831 passed (831)   [baseline 55 / 768]
```

### 1.1 Sequential photo reveal — DONE, browser-verified
New `src/lib/photo-reveal.ts` (pure pacing) + 18 unit tests + 7 seam tests.
`PolaroidCarousel.tsx` rewritten: one photo, its caption, a progress line, Next /
Back, arrow keys, next-photo preload that is never painted. Editorial styling kept.
`scrollstory/PolaroidScene` deliberately still lays the deck out at once.
Live proof on `/surprise/warm-embrace-k69tyvcpua` (8 photos):
```
PHOTOS visible imgs: 1
progress: 1 of 8  ->  2 of 8  ->  3 of 8   (imgs stays 1)
```
Screens: `design-handoff/verify/after-1-photo-{1,2,3}.png`

### 1.2 Question screen readable — DONE, browser-verified
`FloatingPhotos` removed from `QuestionScreen`. `MAX_DODGES` 5 -> **4** per spec W-F6.
`onTouchStart` `preventDefault` removed (No was untappable on a phone). Emoji stripped
from `QuestionScreen` x4 and `ReportButton` x1.
New `src/lib/dodge.ts` — dodge measures the BUTTON ROW, not the viewport, and can
never overlap Yes. 8 unit tests incl. 300-dodge fuzz.
Live proof, 390x844:
```
QUESTION stage. floating imgs behind: 0     (was 8)
total imgs on question screen: 0
YES x=256 y=420.5 110x56   NO x=24 y=420.5 110x56
dodge 1..5: NO y=419..424, overlapsYes=false every time   (was +/-169px of travel)
hint after 4: "Fine, it'll stay still now."
```
Screens: `design-handoff/verify/after-2-question.png`, `after-3-dodged.png`

### 1.3 Cookie banner off the reveal — DONE, browser-verified
New `src/lib/cookie-banner.ts` + 5 tests. Banner suppressed on `/surprise/*` and
`/gift/redeem`. Also re-tokenised off the RETIRED rose/gold palette (#C4686D,
#2D2926, #FFF8F0, #D4CBC3) onto editorial tokens + `ed-btn` classes.
Live proof: `cookie banner present on reveal: 0`

### 1.5 Creator preview does not record — DONE, unit-verified
New `src/lib/creator-preview.ts` + 6 tests. Both `/api/invite/rsvp` and
`/api/invite/answer` now resolve the caller and short-circuit with
`{ok:true, preview:true}`; `rsvp-client` gained `postRsvpDetailed` returning
`recorded | preview | failed`. 7 + 7 route tests, including "rpc NOT called for the
creator" and "fails open when the creator lookup is empty".
NOT yet done: the reveal UI does not yet SHOW a "preview — not recorded" chip; and
the two data/migration items below still need the user's yes.

### 1.8 Collage determinism — DONE, live-verified
`pickCollageTemplateForCount` no longer random-picks; `polaroid-scrapbook` is marked
`signature` and wins at 8 photos. Old behaviour kept reachable as
`pickRandomCollageTemplateForCount`. Test that asserted rng-steering was replaced
with one that asserts stability (behaviour change, deliberate, documented).
Live proof — 6 identical requests, same invite:
```
run1..run6 bytes=3132894   (was 3132894 / 1762070 / 1762070 / 1762070)
```

## Still open in Phase 1

- **1.7** Video pipeline honesty pass. Not started.
- Reveal Yes/No still use the retired rose/green gradients; spec W-F6 restyles them.
  Deliberately deferred to Phase 6 (reveals), not forgotten.

(1.4, 1.5 tail and 1.6 closed — see "Phase 1 remainder" below.)

---

# Phase 1 remainder — 1.4, 1.5 tail, 1.6

Gates after this batch, pasted verbatim, none regressed:
```
tsc --noEmit  -> exit 0
eslint        -> 0 errors, 12 warnings   (was 1 error / 13 warnings mid-run; the
                                          error was this batch's own and is fixed)
vitest run    -> Test Files 68 passed (68) / Tests 963 passed (963)
```
New tests from this batch alone: 4 files / 78 tests
(`reveal-chrome`, `preview-chip`, `invite-update`, `preview-chip.seams`),
plus 3 added to `utils.test.ts` for `isUuid`.

### 1.4 RevealChrome — DONE, browser-verified

**The reported symptom did not reproduce.** There is no garbled `‹ … to` fragment,
and the top strip (`top-[14px]`, h44) cannot geometrically reach the watermark
(`bottom-4`). Measured at 390 and at 1440, on the photo stage:
```
share  x=274 y=14  w=44 h=44        heading "A few favorites" y=64
chromeOverlapsHeading: false        wmOverlapsFlag: false
```
Two **real** defects were found in the same place and fixed:

1. **The controls were invisible for the whole photo beat.** They shipped as
   `rgba(255,254,253,0.14)` — paper at 14% — with paper glyphs, copied from the
   scroll story where the ground is always ink. `TapToReveal`'s photo stage is
   `bg-paper`. Measured live:
   ```
   share bg  rgba(255, 254, 253, 0.14)
   colour    rgb(255, 254, 253)
   ground    rgb(255, 254, 253)      <- white on white
   ```
   That is why the pills are absent from `verify/after-1-photo-1.png`.
   Now an ink scrim + hairline, contrast asserted (not eyeballed) in
   `src/lib/reveal-chrome.ts` / `.test.ts`: >= WCAG 1.4.11's 3:1 on **both** the
   paper and the ink ground, and the old scrim proved failing as a regression test.

2. **The watermark pill collided with `ReportButton` below ~354px.** The pill was
   centred on the viewport; the flag is `fixed bottom-5 left-5`. Measured at 319px:
   ```
   before: watermark x=39 right=281  flag x=20 right=56  -> overlap: TRUE
   after:  watermark x=64 right=304  flag x=20 right=56  -> overlap: false
   ```
   The bottom rail now reserves a 64px gutter and the pill wraps rather than
   truncating. At 390 and 1440 it stays on one line, full text intact.

Screens: `verify/before-1.4-319-photos.png`, `verify/after-1.4-{319,390,1440}-photos.png`

### 1.5 tail — preview chip — DONE, browser-verified

New `src/lib/preview-chip.ts` + 12 tests: outcome -> copy, and `readPreviewFlag`,
which only accepts a literal `preview: true`. An unreadable 2xx body counts as
**recorded**, never as a preview — the opposite default would tell a real guest
their RSVP did not count.

- `RSVPButton.tsx` now calls `postRsvpDetailed` and renders the chip; the
  hardcoded "Recorded. They'll know you're in." is gone.
- `QuestionScreen.tsx`'s `postAnswerWithRetry` reads the body instead of treating
  any 2xx as recorded; a sticky notice shows for the rest of the run. A preview
  never blocks — the creator still walks their whole surprise.
- `preview-chip.seams.test.ts` (9 tests) fails loudly if either component goes
  back to claiming success.

Live proof, creator walking their own `/surprise/pin-verify`:
```
after rsvp: "Preview — not recorded. | This is your own surprise, so nothing was saved."
POST /api/invite/answer  ->  200 {"ok":true,"preview":true}
DB after: rsvps on that invite = 0 · rsvps_total 16 · answers_total 30  (unchanged)
```
Screen: `verify/after-1.5-preview-chip-rsvp.png`

### 1.6 Edit after publish — DONE, browser-verified end to end

New `src/lib/invite-update.ts` + 42 tests, and `updateInvite` / `getInviteForEdit`
in `src/actions/invite.ts`. Wizard re-entry at `/create?edit=<uuid>`; the
dashboard card gained the spec's EDIT action.

- **Optimistic lock on `updated_at`.** The `invites_updated_at` BEFORE UPDATE
  trigger is a free version stamp. The expected value goes in the WHERE clause;
  zero rows back is a typed `conflict`, never a throw and never a silent
  overwrite. Read-only proof of the semantics:
  ```
  live_stamp 2026-08-17 22:14:55.125776+00
  rows matched with fresh stamp: 1 · with stale stamp: 0
  ```
  Microseconds are real, so `versionMatches` is a byte-exact string compare —
  round-tripping through `Date` truncates to ms and would make every save a
  conflict. There is a test for exactly that.
- **Authorisation is server-side only**: `creator_id` re-checked from the row,
  never from the client, and the update is additionally filtered on it.
- **Paywall not editable around**: `canApplyThemeOnEdit` blocks a free user
  publishing on a free theme and editing onto a premium one; a premium theme the
  invite already paid for, and an unchanged one, still work.
- **Every input validated at the boundary** (`updateInviteSchema`), plus
  `isUuid` on the id and a 30/min per-user write rate limit.
- `buildInvitePatch` can only emit the nine editable columns — `slug`,
  `creator_id`, `is_paid`, `stripe_session_id`, `view_count`, `revealed_at`,
  `deleted_at`, `is_active` are structurally unreachable from an edit, with a
  test naming each.

**Hazard found and closed while verifying.** `invites.reveal_type` is plain text
with no DB constraint, and the live table holds `tap` 6 · `scroll_story` 5 ·
**`letters` 2**. Normalising an unrecognised value to `"tap"` so the form had
something to select would have silently converted an open-when-letters surprise
into a tap reveal the first time its creator fixed a typo. `isEditableRevealType`
now blocks the edit outright, in both the reader and the action. Proven live:
```
/create?edit=901708d6…  (reveal_type=letters)
toast: "This surprise uses a reveal style this editor can't hold yet, so editing
        it here would change how it opens. Leave it as it is for now."
editModeEntered: false
```

Live save round trip on `pin-verify`:
```
before  title "Maya"                   updated_at 21:36:25.717558
save    toast "Changes saved."
after   title "Maya (edit gate proof)" updated_at 23:19:35.422901
        slug / theme / creator_id / is_paid / view_count all unchanged
conflict: bumped updated_at out of band, saved again ->
        toast "This surprise changed in another tab. Reload to pick up the newer
               version before saving again."
restored the row to "Maya" / "Not yet." afterwards
```

**Known gaps, disclosed not hidden:**
- An edit changes words and settings only. **Photos are not editable** —
  `finalizeInvite` is create-only: it requires a `pending/<user>/<invite>/`
  prefix and **deletes the invite row** when moderation rejects an image, so
  pointing it at a live surprise would mean one flagged photo destroys a
  published invite. The banner in the wizard says so.
- **Questions are not editable** either — `updateInvite` does not write
  `invite_questions`, so edit mode skips step 3 rather than showing a builder
  that discards what you type.
- **`letters` invites cannot be edited at all** (above). Two rows affected.
- Some published rows fail today's validator: `pin-verify` carried an 8-char
  message against the 10-char floor, so it could not be saved until the message
  was lengthened. Rows seeded below the create-time floor will hit this.
- No autosave and no "Saved" indicator — spec W-C6 wants both; that belongs to
  the Phase 4 six-step wizard, which was explicitly out of scope here.
- `ReportButton.tsx` still uses the retired rose/gold hexes (#C4686D, #9B3D42,
  #2D2926, #D4CBC3). Pre-existing, untouched, flagged.

## Waiting on the user (both need an explicit yes — no migration without it)

1. Drop the stale 3-arg `record_rsvp` overload. Two same-named functions is how a
   route silently binds to the wrong one.
   ```sql
   drop function if exists public.record_rsvp(uuid, text, text);
   ```
2. Purge self-preview rows already in the table (16 RSVPs / 30 answers over 13
   invites, most of it the creator's own previews). SQL to be written and shown
   before it runs.

---

## Phase 2 — App shell: top bar + left rail  [DONE for the shell; browser-verified]

Frames worked from: W-B1, W-B2, W-D1, W-D2, W-D3, W-G1, W-H1, W-H2.

### Gates — pasted verbatim, none regressed

```
tsc --noEmit  -> exit 0
eslint src    -> 12 problems (0 errors, 12 warnings)     [baseline 0 errors / 12 warnings]
vitest run    -> Test Files 68 passed (68) / Tests 963 passed (963)
                                                          [entry to P2: 62 / 831]
```
+6 test files, +132 tests. No test was deleted; three assertions in
`nav-items.test.ts` changed shape and each change is documented in that file's
header with the behaviour change that caused it.

### What was built

- `src/lib/app-shell.ts` — all shell logic as pure functions: the four
  destinations, `resolveShellNav`, `navBadgeLabel`, `shellIdentity`,
  `planCard`, and `LEGACY_ROUTES`/`legacyTarget`. 28 unit tests in
  `src/lib/app-shell.test.ts`.
- `src/components/shell/AppShell.tsx` — the painted shell. `<header>` bar
  (wordmark · bell with unread dot · avatar + first name), `<nav aria-label="Main">`
  280px rail (pinned coral "+ New surprise" carrying the app's ONLY shadow,
  then Dashboard / Themes / Activity(badge) / Account with a coral underline on
  the active item, plan card pinned to the bottom over a hairline), `<main>`.
- `src/components/shell/AppShellServer.tsx` — the one place identity, plan and
  the pending count are read, and the one place auth is gated.
- `src/lib/dashboard-data.ts` — new `getShellCounts(userId)`: surprises this
  month + pending contributions, memoized per render.
- `src/app/globals.css` — `.ed-shell-*` block. Reflow: **≤1180px** → 72px icon
  rail, labels clipped but kept in the a11y tree, plan card and first name
  hidden; **≤860px** → rail leaves the flow, opens as a drawer from a `☰`
  button with a scrim, and the create action moves into the bar as "+ NEW".
  Breakpoints sit between the drawn widths so 1440/1024/768 each land in the
  right state.
- Dashboard page: removed its own "New surprise" coral button. The rail now
  pins that action on every screen; keeping both put the same action on the
  same fold twice. Nothing else in the page body was touched — W-B1's card grid
  and 3-tile stat strip are Phase 3.

### Route map — every old URL 308s, none 404

| Old | New | Proof (signed-in browser) |
|---|---|---|
| `/templates` | `/themes` | `-> /themes` |
| `/templates?template=x` | `/themes?template=x` | query preserved |
| `/settings` | `/account` | `-> /account` |
| `/settings/data` | `/account/data` | `-> /account/data` |
| `/dashboard/activity` | `/activity` | `-> /activity` |
| `/dashboard/activity?focus=views` | `/activity?focus=views` | query preserved |

The page bodies MOVED to the new routes; the old paths are `permanentRedirect`
stubs that read their target from `LEGACY_ROUTES`, so a stub cannot drift from
the table. `/dashboard/analytics` deliberately did NOT move: the spec merges
analytics into the surprise detail page (W-D1), which Phase 5 builds, so
redirecting it now would point at a page that does not exist.

Callers updated so nothing in the app links at a redirect stub (asserted by a
new test): landing Navbar/Footer/Examples/OccasionCards/PerfectFor/ThemeRow,
RevealChrome, ScrollStoryReveal, dashboard page, CommandPalette,
`actions/account.ts` `revalidatePath`, `lib/email/templates.ts`,
`api/unsubscribe`. `middleware.ts` protects `/activity` + `/account` and
refreshes the session on `/themes`; `auth-redirect.ts` allows the new prefixes
and keeps the old ones.

### Verified in a browser myself, at all three widths

Screenshots (`tadaaaa/design-handoff/verify/`), signed in as `tada.tester`:
`p2-shell-dashboard-1440.png`, `-1024.png`, `-768.png`, `-768-menu.png`,
`p2-shell-themes-1440.png`, `p2-shell-activity-1440.png`,
`p2-shell-account-1440.png`, `p2-shell-focus-1440.png`,
`p2-shell-badge-forced-1440.png`, `-1024.png`.

Measured against the frames:
```
1440  bar 1440x68 · rail x0 w280 · main x280 w1160 · new-btn 239x49 shadow=true
1024  rail w72 · new-btn 48x48 circle · labels clip-path inset(50%) · plan display:none
 768  rail display:none · menu 40x40 at x8 · "+ NEW" 77x38 in the bar
 768  menu open -> rail display:flex, data-open=true, aria-expanded=true, scrim on
      Escape -> data-open=false
horizontal overflow at 1440 / 1024 / 768: none
aria-current="page" on exactly one rail item on every one of the four routes
landmarks: header ✓  nav[aria-label="Main"] ✓  main ✓
tab order: wordmark → bell → avatar → +New surprise → Dashboard → Themes →
           Activity → Account → Go Unlimited → page content
           (2px solid focus ring on every one)
```

Differences from the frames, and why:
- **The dashboard/themes/activity/account page bodies do not match W-B1/W-B2/
  W-D2/W-D3 yet.** They are still the P2-A pages inside the new shell. Page
  content is Phases 3 and 5; Phase 2 owned the chrome around it.
- **The plan card shows the surprises line on `/themes` too.** W-B2 draws
  "3 of 12 themes included" there. There is no themes table with per-theme
  pricing yet — the plan itself flags that gap for Phase 3 — so inventing the
  number was not an option.
- **Rail icons.** W-H1 draws abstract glyphs; the icon rail uses lucide
  `LayoutDashboard / Palette / Inbox / User`. Same slots, real icons.
- **The create pill is `--coral-deep`, not the frame's `--coral`.** White on
  `#D45847` is 3.96:1 and fails AA for a 13px/600 label. Same call, and the
  same precedent, as `.ed-btn-coral` (pinned by `ed-atoms.test.ts`).

### Known gaps & risks

1. **The Activity badge and the bell's unread dot were painted, not lived.**
   The test account has zero pending contributions, so the real data path never
   produced them. The count logic has unit tests, the wiring has a seam test,
   and the CSS was proved by forcing the two DOM states in the browser
   (`badge bg rgb(184,65,47)` white text 22x22; `dot rgb(212,88,71)` 9x9 —
   `p2-shell-badge-forced-*.png`). **An end-to-end "a real pending contribution
   lights the badge" run has not happened.** It needs a contributor submission,
   which is Phase 6's flow.
2. **`getShellCounts` adds two queries to every authenticated page render.**
   They are `head:true` counts, memoized per render, but they are two extra
   round-trips the old bar did not make. Not benchmarked.
3. **The pending count leans on RLS** rather than restating ownership in the
   query: `invite_contributions` only exposes unapproved rows to the invite's
   creator (`invite_contributions_select_restrict`, verified against the live
   DB). If that policy is ever loosened, the badge leaks a global count. The
   invites count states `creator_id` explicitly because that table does carry a
   public read policy.
4. **`/dashboard/analytics` still exists under the dashboard.** Correct for now
   (Phase 5 merges it into W-D1) but it means one authenticated route is not yet
   at its spec home.
5. **The legacy `Navbar` / `AppBar` / `DashboardNavServer` are still alive**,
   used only by `/create`. `nav-items.ts` now re-exports the shell's
   destinations so they cannot link at a moved route, but Phase 4 should delete
   them when it builds the full-screen wizard (W-C1: no rail, no bar).
6. **Page content inside the shell carries its own shadows** (theme cards,
   buttons). The "one shadow" rule is enforced for `.ed-shell-*` only. Phase 3
   should settle whether that rule binds page content too.
7. **`src/app/api/unsubscribe/route.ts` still contains retired hexes**
   (`#C4686D`, `#6B5E57`) in inline email HTML. Pre-existing, not in the
   app-chrome palette guard, left alone.
8. **Not checked with an axe run.** Landmarks, `aria-current`, focus ring and
   tab order were each verified by hand in the browser; a full automated a11y
   sweep is Phase 7's gate.

---

## Phase 3 — Dashboard, themes, states  [DONE; browser- and DB-verified]

Frames worked from: W-B1, W-B2, W-G1, W-G2.
Ran concurrently with Phase 4 (the `/create` wizard). Nothing under
`src/app/create/**`, `src/components/create/**` or `src/actions/invite.ts` was
touched — lifecycle got its own action file for exactly that reason.

### Gates — pasted verbatim, none regressed

```
tsc --noEmit  -> exit 0
eslint src    -> 12 problems (0 errors, 12 warnings)   [baseline 0 errors / 12 warnings]
vitest run    -> Test Files 88 passed (88) / Tests 1409 passed (1409)
```

Entry baseline measured at the start of this phase was **70 files / 993 tests**
(not the 69/968 in the brief — Phase 4 had already landed work). +9 files /
+167 tests from this phase; the rest is Phase 4's, running alongside.

**`npm run build` was NOT run** — a server was already up on 4611 and the plan
forbids building underneath it.

### What was built

Rules first, in node-testable modules; the components only paint what they return.

- `src/lib/dashboard-cards.ts` (+ 32 tests) — `greetingLabel` / `greetingLine`
  ("Evening, Priya."), `dashboardSubline` ("Two running, one opens Saturday."),
  `statTiles` (VIEWS / RSVPS / PENDING, coral only when pending > 0),
  `surpriseCardModel` (status chip, `OCCASION · REVEAL STYLE`, stat line,
  per-state action row, `.6` dim), `resumeDraft`.
- `src/lib/themes-browser.ts` (+ 27 tests) — chips, search, count label, price
  line, `themesIncludedLabel`.
- `src/lib/loading-states.ts` (+ 15 tests) — skeleton stagger/pulse, offline
  copy, expired-link copy, first-run copy.
- `src/lib/upload-queue.ts` (+ 17 tests) — the localStorage failed-upload queue.
- `src/lib/invite-lifecycle.ts` (+ 15 tests) — reopen/extend arithmetic.
- `src/lib/invite-availability.ts` (+ 9 tests) — why a link did not open.
- `src/actions/invite-lifecycle.ts` — `reopenInvite` / `extendInvite`.
- Components: `SurpriseCard`, `SurpriseGrid`, `ResumeDraft`, `FirstRun`,
  `DashboardSkeleton`, `shell/OfflineBanner`, `shell/UploadQueueBanner`,
  `themes/ThemesBrowser`. Rewrote `dashboard/page.tsx`, `dashboard/loading.tsx`,
  `dashboard/Greeting.tsx`; `/themes` now renders the W-B2 browser when signed
  in and keeps the marketing catalogue when signed out.
- `globals.css`: `.ed-cards / .ed-card* / .ed-schip / .ed-newtile / .ed-firstrun
  / .ed-skel* / .ed-offline / .ed-uploadq / .ed-search / .ed-thgrid / .ed-thcard*`.
  Reflow breakpoints are the shell's own 1180 / 860, so 1440 / 1024 / 768 each
  land in exactly one state.
- 3 seam-test files (+ 27 tests) that fail if a component stops calling the
  rules — the house pattern from `photo-reveal.seams.test.ts`.

### Themes: no table, and none wanted

14 themes stay in `src/lib/themes.ts`; `entitlements` already models per-theme
purchase. The `Theme` type gained `tier`, `priceCents` and `occasion`, and
`themes-browser.test.ts` pins all three against the existing `isPremium`/`price`
so the browser and the paywall can never disagree. **No migration was written
or run in this phase.**

### REOPEN really mutates — measured, not asserted

Fixture rows were inserted for the three card states the test account did not
have, exercised, then deleted (table back to its entry count of 13).

```
BEFORE (DB)  slug p3-expired-fixture · status expired · expires_at 2026-08-14
BEFORE (UI)  chip "Expired" · "96 views · 0 RSVPs · link closed Aug 14" · opacity 0.6
   click REOPEN
toast        "Link reopened until Sep 14."
AFTER  (UI)  chip "Live" · "96 views · 0 RSVPs · expires in 28 days" · opacity 1
AFTER  (DB)  status live · is_active true · expires_at 2026-09-15 00:05:00 · updated_at bumped
account_audit rows for invite.reopen: 1
```

`status` is written by nothing in the app: the live DB carries an
`invites_sync_status` BEFORE-INSERT-OR-UPDATE trigger running
`derive_invite_status(deleted_at, expires_at, is_active, countdown_date)` — the
same precedence as `deriveInviteStatus`. The patch therefore writes only
`expires_at` + `is_active` and lets the trigger agree with us. (Several comments
in the repo still say "invites has NO status column". They are wrong; the column
and the trigger are live. Left alone rather than swept — out of scope.)

**EXTEND** shares the same action and is surfaced on a live card only inside the
last 7 days of its window (`p3-dashboard-*.png` shows it on the 6-days-left
card). Its spec home is W-D1, which Phase 5 builds; permanent EXTEND chrome on
every live card is not in W-B1.

### Bug found and fixed while verifying W-G2

`getInviteBySlug` returns `null` for four different situations — slug missing,
creator switched it off, link expired, row soft-deleted — and the reveal page
rendered all four as **"This surprise doesn't exist"**. A recipient whose link
simply ran out was told the thing they were sent had never been real, and W-G2's
closed panel was unreachable. Fixed with `classifyAvailability` + one narrow
follow-up read taken only on the already-failed path. Deleted deliberately still
reports as missing, so the page cannot be used as an oracle for purged content.

```
/surprise/<expired>   -> "This surprise has closed."  + "The link was live for 28 days…"
/surprise/<disabled>  -> "This surprise is no longer available"
/surprise/<nonsense>  -> "This surprise doesn't exist"
```

The frame writes "live for thirty days"; we do not hardcode thirty. Free
surprises live 28 days from reveal and creators can set any expiry, so the
sentence states the real lifetime when it can compute one and drops the clause
when it cannot (`loading-states.test.ts` asserts it never emits a digit it did
not measure).

### Verified in a browser myself, at all three widths

Screenshots in `tadaaaa/design-handoff/verify/`, signed in as `tada.tester`:
`p3-dashboard-{1440,1024,768}.png`, `p3-themes-{1440,1024,768}.png`,
`p3-themes-hover-1440.png`, `p3-before-reopen-1440.png`,
`p3-after-reopen-1440.png`, `p3-skeleton-1440.png`, `p3-offline-1440.png`,
`p3-upload-queue-1440.png`, `p3-expired-recipient-1440.png`,
`p3-pending-coral-forced-1440.png`, `p3-focus-1440.png`. Raw probe output in
`p3-log.txt`, `p3-states-log.txt`, `p3-final-log.txt`.

```
1440  card grid 345/345/345 · 3-up      1024  425/425 · 2-up      768  728 · 1-up
1440  theme grid 4-up                   1024  3-up                768  2-up
horizontal overflow at 1440 / 1024 / 768: none on either page
greeting  "Evening, Tada."   subline  "Four running, one opens Sunday."
scheduled "Opens Sun" · "Scheduled · Aug 23, 11:30 AM their time"  (Asia/Kolkata)
expired   opacity 0.6 · REOPEN + EXPORT      live  SHARE + ANALYTICS + PREVIEW
skeleton  17 blocks · 3 cards 345x325 (card is 345x387) · ed-pulse 1.5s
          delays 0s / 0s / 0s / 0.1s / 0.2s · spinners 0
          role=status "Loading your surprises" · every shape inside aria-hidden
offline   position static · z-index auto · bg rgb(184,65,47) on white · role=alert
          content pushed DOWN by 48px (main top 68 -> 116); gone on reconnect
queue     "2 photos didn't upload" · survives a full reload · RETRY NOW -> /create
landmarks header + nav[aria-label=Main] + main · exactly one h1 · one aria-current
focus     2px solid rgb(212,88,71) ring; 17 of 18 card controls carry an aria-label
          (the 18th is the "+ New surprise" tile, which has visible text)
```

### Differences from the frames, and why

1. **Cards show the theme's gradient with an initial, not a photograph.** None
   of the live invites have a usable cover — `createSignedUrl` returns "Object
   not found" for the paths that do exist. The signed-cover path is built
   (`getDashboardCovers`) and falls back rather than rendering a broken image.
2. **Eight filter chips on /themes, not seven.** The spec's four occasions cover
   its 12-theme set; ours has 14, and "Farewell Skies" (for goodbyes) has no
   honest home among Birthday / Anniversary / Date / Festival. Filing it under a
   wrong occasion would make the filter lie, so the vocabulary gained a fifth
   label and the chip row is DERIVED from the data — a test asserts no theme can
   exist without a chip that finds it.
3. **The greeting is "Evening, Tada." — capitalised, no "Good".** Mobile still
   writes "Good evening". Recorded as a divergence in
   `cross-platform-parity.test.ts`; the three words and both thresholds are
   unchanged and still asserted on both platforms.
4. **No "Your surprises" heading.** W-B1 does not have one — the greeting is the
   page heading. Mobile's LIST tab keeps its heading; that half of the parity
   contract stands.
5. **SHARE opens a drawer instead of navigating.** The frame's row is three
   words wide, but the share targets, QR, keepsake exports and the free-tier
   delete gate all existed before this phase. Delete's spec home is W-D1
   (Phase 5); until that page exists it lives behind SHARE rather than being
   dropped on the way to matching a picture.
6. **ANALYTICS points at the portfolio page**, not a per-invite one — W-D1 is
   Phase 5. `app-chrome.test.ts`'s orphan detector was taught to recognise
   `href: "/route"` in a data object, since the action rows are now data.
7. **The free-limit banner sits above the greeting**, so two sand-bordered
   strips can stack. Pre-existing chrome, correct behaviour (the test account
   really is over its limit), not in W-B1.

### Known gaps & risks

1. **PENDING-coral was proved by unit test and by forcing the DOM, not lived.**
   The test account has zero pending contributions, so the coral path never came
   from real data (`p3-pending-coral-forced-1440.png`, computed colour
   `rgb(184,65,47)`). A real contribution is Phase 6's flow. Same limitation the
   Phase 2 badge had, and for the same reason.
2. **The resume-draft strip has never been fed a real wizard draft.** A draft is
   inferred as `is_active=false AND expires_at IS NULL AND deleted_at IS NULL`,
   which is the only combination `createInviteShell` produces and
   `finalizeInvite` clears. It was verified against an inserted fixture, not
   against a half-finished run of the wizard — and Phase 4 is rewriting that
   wizard as I write this, so the inference should be re-checked when it lands.
   `resumeDraft` accepts a `step` but nothing supplies one yet, so the frame's
   "Step 4 of 6" clause is dropped rather than faked.
3. **`getDashboardCovers` adds one query plus N storage signings per dashboard
   render.** Memoized per render, failures fall back silently. Not benchmarked.
4. **RETRY NOW hands the reader back to the wizard; it does not re-POST.** The
   file bytes are not in localStorage (they would blow the quota) — only the
   record that a named photo failed. Nothing currently WRITES to the queue
   either: `enqueueUpload` is exported and tested, and the uploader that should
   call it is Phase 4's `PhotoUploader`. **Until that call exists the banner is
   unreachable in normal use**, which is why it was verified by seeding
   localStorage directly.
5. **`/dashboard` lost its occasion filter and sort row.** W-B1 has neither.
   `CommandPalette` still offers occasion jumps, but `?occasion=` / `?sort=` are
   no longer honoured by the page. Deliberate; flagged rather than hidden.
6. **No axe run.** Landmarks, `aria-current`, labels, focus ring and reduced
   motion were each checked by hand in the browser. Automated sweep is Phase 7.
7. **`src/components/ui/skeleton.tsx` still carries retired hexes** (`#F0E5D8`,
   `#D4CBC3`) and is still used elsewhere. The dashboard no longer uses it.
   Pre-existing, untouched, flagged.
8. **Two tsc errors and one eslint error appeared mid-phase from Phase 4's
   in-flight wizard rewrite** (`src/app/create/page.tsx`,
   `src/components/create/ContributorsPanel.tsx`). They were theirs and were
   gone by the final gate run — but this phase's numbers were taken from a tree
   two agents are writing to.

### Trap for the next session

The server on **4611 is a dev server, but Turbopack does not always recompile
`globals.css` promptly** — a whole appended block was missing from
`/_next/static/chunks/src_app_globals_*.css` for several minutes and the grid
rendered as a single column, which looks exactly like a broken CSS rule. `touch
src/app/globals.css`, wait, and re-fetch the chunk before debugging the
stylesheet. Also: `next dev` refuses a second server for the same directory, so
there is no "start a clean one on another port" escape hatch.

## Phase 6 — reactions SHIPPED (orchestrator)

W-F2's "❤️ 24 😂 9 😢 3 🔥 11". Backend was live, rate-limited and PIN-aware the
whole time with **zero callers**. This is the first one.

- `src/lib/reactions.ts` + 21 tests — tokens (`heart|laugh|cry|fire`, never raw
  emoji: the glyph is presentation, the token is the datum), optimistic
  bump/unbump, count formatting that collapses past 999 so the bar cannot reflow
  over a photo, and a words-only accessible summary.
- `src/app/api/invite/[slug]/reactions/route.ts` — GET counts + POST. Visitor
  token hashed before it reaches the DB, same as RSVP. `rate_limited` -> 429,
  `pin_required` -> 401, closed -> 410; the client rolls back its optimistic
  bump on all three.
- `src/components/surprise/ReactionBar.tsx`, wired into `SkyHero` above the
  scroll hint (deliberately OUTSIDE the `pointer-events-none` hint wrapper —
  it is interactive).

**Shape bug caught by probing, not by types.** `get_reaction_counts` is
`RETURNS TABLE(emoji text, count bigint)` — PostgREST returns ROWS
(`[{emoji:"fire",count:1}]`), not the object I assumed. The POST answered
`{"ok":true}` and the bar stayed at zero: a write that lands and a read that
silently returns nothing. `normalizeCounts` now accepts both shapes.

Live proof on `/surprise/contrib-verify`:
```
rendered: ❤️ 2 | 😂 1 | 😢 | 🔥      aria: "Reactions. Love 2, Funny 1"
after tap on fire:                    aria: "Reactions. Love 2, Funny 1, Fire 1"
DB confirmed the row, then removed it (back to 4 pre-existing reactions)
```

**Non-regression noted:** `/surprise/demo` renders "doesn't exist" — it was
soft-deleted on 2026-08-16, before this build. An earlier `curl` showing `200`
was the status of the not-found PAGE, which renders at 200. Measuring a status
code is not measuring content.

Gates: tsc 0 · eslint 0 errors / 12 warnings · **90 files / 1462 tests**

---

## Phase 4 — The six-step wizard with live preview  [DONE for the wizard; one gap, disclosed]

Frames worked from: W-C1..W-C7, W-H3, W-H4. Scope was the create wizard only —
`dashboard/**`, `themes/**`, `components/dashboard/**` and `components/landing/**`
were untouched (Phase 3 owned them concurrently).

### Gates — pasted verbatim, none regressed

```
tsc --noEmit  -> exit 0
eslint src    -> 12 problems (0 errors, 12 warnings)   [baseline 0 errors / 12 warnings]
vitest run    -> Test Files 91 passed (91) / Tests 1481 passed (1481)
```

Entry-to-Phase-4 measurement was **87 files / 1397 tests** with 3 failures, not the
69/968 in the plan header — Phase 3's agent was adding files at the same time. Two of
those three failures were mine (parity, below) and one was theirs
(`shell/states.seams.test.ts`, mid-edit at 18:57); all three are green now.

**This phase added 10 test files / 305 tests**, all of them real unit tests over pure
modules plus one seam file:

| File | Tests | What it pins |
|---|---|---|
| `lib/wizard-steps.test.ts` | 42 | step machine, kicker, progress, the three gates |
| `lib/autosave.test.ts` | 27 | debounce with fake timers, status machine |
| `lib/wizard-draft.test.ts` | 30 | draft round trip, hostile-input coercion, **the PIN is never written** |
| `lib/invite-pin.test.ts` | 45 | digits, boxes, hint-leak detection |
| `lib/ics.test.ts` | 33 | RFC 5545 escaping, CRLF, octet folding |
| `lib/wizard-schedule.test.ts` | 55 | month grid, time/zone plumbing |
| `lib/wizard-preview.test.ts` | 27 | preview variant + caption per step |
| `lib/wizard-invites.test.ts` | 21 | email-list parsing, moderation counts |
| `lib/publish-invite.test.ts` | 15 | the three-phase publish, failure by failure |
| `components/create/wizard.seams.test.ts` | 32 | wiring: the UI uses the tested rules |

### What was built

**Chrome and shell.** `src/app/create/layout.tsx` no longer renders
`DashboardNavServer` — the wizard is a full-screen takeover, which is the point of
W-C1..W-C7. `WizardChrome.tsx` carries ✕/‹, `STEP n OF 6 · LABEL`, the autosave
indicator, SAVE & CLOSE, and the 6-segment coral progress bar.

**Six steps**, each in its own component under `components/create/steps/`:
C1 occasion (2-up grid + AI), C2 content (title, message + AI draft, photo strip,
page-wide drop zone), C3 contributors (question, contribute link + COPY + QR + email
invites + inline approve/reject queue), C4 reveal style (four tiles, theme row with
CHANGE), C5 schedule & lock (real calendar, time, time zone, .ics, 4-digit PIN),
C6 review (five summary rows, card-payment paywall, PUBLISH & GET THE LINK).
C7 published is a full-ink screen with a 224px QR.

**Permanent live preview** (`PreviewPane.tsx`) with a PHONE/BROWSER toggle, four
scene variants chosen by a tested rule, and the reflow the frames specify.

**Autosave**, 500ms-debounced, to `localStorage` — with `flush()` bound to `pagehide`
and `visibilitychange` so a tab closed inside the window does not eat the last
sentence.

**Backend, all new and all real:** `actions/wizard.ts` — `setInvitePin`,
`listContributions`, `moderateContribution`, `emailContributorInvites`,
`emailCalendarFile`; `lib/ics.ts` for the calendar file; `sendEmail` gained optional
attachments; two new email templates. Every action re-authenticates, re-authorises
from the row, re-validates and rate-limits.

**No migration was needed.** `set_invite_pin`, `get_owner_contributions` and
`moderate_contribution` already existed on the live database, correctly owner-scoped,
with `search_path = public, extensions` so `crypt()` works as anon over PostgREST.
Probed before writing a line of client code.

### Verified in a browser myself, at all three widths

Screenshots in `tadaaaa/design-handoff/verify/`: `p4-c1-1440.png`, `p4-c2-{1440,1024,768}.png`,
`p4-c2-768-peek.png`, `p4-c3-1440.png`, `p4-c4-{1440,1024}.png`, `p4-c5-1440.png`,
`p4-c6-1440.png`, `p4-c3-edit-{live,pending,approved}-1440.png`,
`p4-draft-restored-1440.png`, `p4-c5-pin-edit-1440.png`.

```
C1  kicker "STEP 1 OF 6 · OCCASION" · segments [coral, mist×5] · rail:false · overflow:none
C2  indicator "Saving…" @150ms -> "Saved" @1s · localStorage draft written
    draft key tadaaaa.createDraft.v2 · has `pin` field: false
C2  Continue with no photo -> blocked, toast "Please add at least one photo"
C4  letters tile aria-disabled="true"
C5  calendar gridcells: 42 · "Recommended — it opens at their 7:00 PM, not yours."
    PIN boxes: 4 · leak warning fires when the hint spells the PIN
C6  rows Reveal/Delivery/Contributors/Lock/Link lasts · "Everything autosaved…" · App Store: false
selected-card border, all three families: 2px rgb(212, 88, 71)
reflow  1440 preview 634px · 1024 preview 340px (never hidden) · 768 preview none, PEEK 121×49
        peek open -> aria-expanded=true, device toggle inside the sheet
horizontal overflow at 1440 / 1024 / 768: none · console errors: none at any step
```

**Contributor flow, end to end against the live DB:**
```
POST /api/invite/contrib-verify/contribute (no account)  -> 200 {"ok":true}
queue before: "1 PENDING · 2 APPROVED"
click APPROVE ->
queue after:  "0 PENDING · 3 APPROVED"
preview pane picks up the new line: "Remember the night bus to Goa?…" — From P4 Verifier
```

**PIN round trip against the live DB** (set through the wizard, then cleared through it):
```
after save:  has_pin true · pin_hash "$2a$06$…" · pin_hint "The year we met, backwards."
after clear: has_pin false · pin_hint null
```
The hash never leaves Postgres; the wizard never sees it.

**Draft survives a killed tab:**
```
typed on step 2, tab closed outright, new tab opened on /create
-> step "STEP 2 OF 6 · CONTENT" · title "Killed-tab proof" · message restored
```

### Five real bugs the browser caught that the tests did not

1. **The autosave indicator never said "Saved".** `nextSaveStatus(s,"ok")` is a
   deliberate no-op from `pending`, and the debounced callback never ran the `flush`
   leg — so it read "Saving…" forever. Fixed by composing `flush` then the outcome in
   one updater.
2. **The reveal-date gate fired on step 2, where the date field no longer is.**
   Editing a scroll story with no date showed "Please set the date this story counts
   down to" on a screen with no date control and no way forward. `validateContent` was
   split; `validateReveal` now gates step 4.
3. **A finale date typed on step 4 was dropped on save.** `revealDate` read
   `scheduleMode === "scheduled" ? openAt : ""`, but a countdown/story date is the
   same column whether or not the surprise is *scheduled*.
4. **Selected cards drew a 2px MIST border, not coral.** `SELECTABLE` and
   `SELECTABLE_ON` both set a border colour at equal specificity, and CSS source order
   picked mist. Measured `borderTopColor rgb(232,228,224)` on a selected card. Now
   `!border-coral`, measured `rgb(212, 88, 71)`. This was pre-existing and affected
   every selectable card in the wizard.
5. **An edit could silently clear a PIN.** `getInviteForEdit` did not report whether a
   lock existed, so the toggle always loaded off and a save cleared it. It now returns
   `hasPin`/`pinHint`, and a lock is only written when the creator actually touched it.

Plus one found while reading: the **cookie banner sat across the live preview** at
1440, the same overlap Phase 1 fixed on the reveal. `/create` joins the suppressed
list, and the matcher now compares whole path segments so `/create` cannot swallow a
future `/creator-…` route.

### STUBS — drawn, and labelled on screen as not built

- **Record a video message · up to 60s.** No backend exists. `invites.video_status`
  drives the Remotion render of the finished surprise, not a creator's own clip. The
  row renders disabled and says "Not built yet — nothing on the web records or stores it."
- **Background music.** No music table, bucket or player. Switch disabled, row says so.
- **Open-when letters (W-C4's fourth tile).** Drawn because the frame draws it,
  `aria-disabled`, labelled "Not on the web yet". `createInviteSchema.revealType`
  accepts three values and there is no letters editor; a tile that saved an empty
  open-when reveal would be worse than one that says it cannot.
- **The PIN is set but not enforced on the web.** It really is stored and really is
  bcrypt-hashed, and the phone app asks for it — the web reveal page does not check it
  yet (that gate is W-F1, Phase 6). The wizard says this in a bordered note under the
  PIN rather than letting a creator believe a link is private. **This is the single
  most important line in this report.**
- **C3's link, QR, email invites and queue need a published surprise.** They hang off
  `invites.id`, and no row exists until publish. In create mode the panel says so
  plainly; in edit mode every control is live and was verified above.

### Known gaps & risks

1. **The full create → publish → C7 path was NOT completed end to end.** The test
   account is on the free plan and has 6 active invites this month against a limit of
   2, so `createInviteShell` refuses before inserting. That is the real tier gate
   working correctly — verified by the response, and covered by a unit test — but
   **W-C7 has never been rendered from a real publish**, only from its own component.
   The `.ics` email and the post-publish `setInvitePin` call are on that same
   unreached branch. SQL to unblock it is under "Waiting on the user" below.
2. **`StepIndicator.tsx`, `LivePreview.tsx` and `PreviewPublish.tsx` are now unused by
   the app.** All three are still read by `cross-platform-parity.test.ts` (and
   `invite-qr.test.ts`), which would fail on `readFileSync` if they were deleted, so
   they were left in place. Phase 7's alias-deletion sweep should retire them and the
   assertions together.
3. **`cross-platform-parity.test.ts` was edited**, one assertion, documented in place:
   web's reveal tiles now carry W-C4's blurbs ("Short and punchy") where mobile keeps
   its own ("One tap. Everything at once."). The test still requires both platforms to
   name the same three mechanics and to describe every one of them.
4. **The occasion grid shows 7 occasions, not the frame's 6.** `themes.ts` has no
   "anniversary" and the parity test asserts an exact-equal blurb map against mobile,
   so adding one on web alone would break mobile's suite. The frame's Anniversary tile
   is therefore absent and Mother's/Father's Day are present. Reconciling the two lists
   is a product decision, not a copy fix.
5. **W-C5's third pill, "Opens on a date", is not drawn.** Two pills are: Right away /
   Schedule it. The third duplicates the reveal mechanic chosen on step 4, and drawing
   both would let a creator set them to disagree.
6. **`page.tsx` is 932 lines**, over the ≤800 standard, after extracting the publish
   pipeline into `lib/publish-invite.ts`. The remainder is wizard state and its
   handlers; splitting further wants a reducer, which is a refactor rather than a trim.
7. **`contrib-verify` (a test fixture) now has `countdown_date = 2027-09-20`**, set
   while proving the edit path. It was NULL, which made a `scroll_story` invite that
   could not be saved. The PIN set during testing was cleared again; both states are
   pasted above.
8. **No axe run, no keyboard sweep.** Landmarks, `aria-live`, `role="radiogroup"`,
   `aria-checked`, `aria-disabled`, `role="progressbar"` and the PIN's per-box labels
   were all written deliberately and spot-checked, but the automated a11y gate is
   Phase 7's.
9. **The `.ics` email is unverified end to end.** `buildIcs` has 33 unit tests and
   `sendEmail` gained attachment support, but no message has actually been sent —
   `RESEND_API_KEY` is absent locally, so `sendEmail` short-circuits with
   "Email not configured". Same for the contributor email invites.
10. **`emailContributorInvites` sends one message per address in a loop.** Capped at 20
    with a 3-batch/5-minute rate limit, but it is a sequential loop inside a server
    action; a slow provider makes the action slow.

## Waiting on the user — Phase 4 addition

3. **Raise the test account's plan so the publish path can be proved end to end.**
   Data, not schema, and on the test account only. Nothing was run.
   ```sql
   -- Lets tada.tester publish past the 2-per-month free limit so W-C7 and the
   -- post-publish PIN + .ics calls can be exercised. Revert after verifying.
   update public.profiles
      set subscription_tier = 'unlimited',
          subscription_expires_at = now() + interval '1 day'
    where id = (select id from auth.users where email = 'tada.tester@example.com');

   -- Revert:
   -- update public.profiles set subscription_tier = 'free', subscription_expires_at = null
   --  where id = (select id from auth.users where email = 'tada.tester@example.com');
   ```

---

## Phase 6 — Reveals, contributor, entry  [PARTIAL; the PIN gate is DONE and proved]

Frames worked from: W-F1, W-F2/F7, W-F3/F8, W-F4/F9, W-F6, W-E1, W-E2, W-A1.
Ran concurrently with Phase 5. Nothing under `src/app/dashboard/**`,
`src/app/activity/**`, `src/app/account/**`, `src/components/dashboard/**` or
`src/app/api/stripe/**` was touched.

### Gates — pasted verbatim

```
tsc --noEmit  -> exit 0
eslint src    -> 12 problems (0 errors, 12 warnings)   [baseline 0 errors / 12 warnings]
vitest run    -> Test Files 103 passed (103) / Tests 1752 passed (1752)
```

Entry baseline for this phase was 91 files / 1481 tests. This phase added 6
test files / 98 tests (`pin-gate-session` 23, `pin-gate-copy` 22,
`pin-gate.seams` 12, `countdown` 26, `contribute-copy` 15); the rest of the
delta is Phase 5's, running alongside.

Mid-run, `src/components/activity/activity.seams.test.ts` failed intermittently
while the Phase 5 agent edited `src/app/activity/page.tsx` underneath it — both
their files, both outside this phase's scope. It is green in the final run
above. Numbers here were taken from a tree two agents are writing to.

`npm run build` was NOT run — a dev server is up on 4611 and the plan forbids
building underneath it.

---

### PRIORITY 1 — W-F1, the PIN gate. Was a broken promise; is now a real lock.

**What was wrong.** A creator could set a PIN in the wizard; it was stored,
bcrypt-hashed, and the phone app asked for it. Nothing in `src/app/surprise/**`
or `src/components/surprise/**` read `pin_hash` except the letters branch. A
PIN-locked surprise therefore opened to anyone holding the link, while its
creator had been told it was locked.

**Built:**
- `src/lib/pin-gate-copy.ts` (+22 tests) — keypad grid, kicker, hint line,
  failure copy, progress announcements. Client-safe: no `node:crypto`.
- `src/lib/pin-gate-session.ts` (+23 tests) — sign/verify the session cookie.
- `src/lib/pin-gate-server.ts` — recovers the verified PIN server-side for the
  three RPCs that need the plaintext.
- `src/components/surprise/PinGate.tsx` — W-F1's keypad, physical keyboard
  support, `role="alert"` failure line, reserved height so a wrong try does not
  shift the keys.
- `src/app/api/invite/[slug]/pin/route.ts` — verify + mint cookie.
- `src/app/surprise/[slug]/page.tsx` — the gate itself, plus spoiler-safe
  metadata; `src/app/surprise/[slug]/opengraph-image.tsx` — spoiler-safe card.
- `src/lib/pin-gate.seams.test.ts` (+12 tests) — fails loudly if the gate is
  ever downgraded to a hidden div, if the PIN reaches a client component, or if
  a route goes back to reading a PIN out of a request body.

**Design decisions, so they are not re-litigated.**

1. **The gate is a SERVER gate and it returns.** It sits above every line that
   computes photos, questions, contributions or the message. Not `hidden`, not
   mounted-then-unmounted — never fetched into the payload.
2. **The cookie carries the four digits.** `get_invite_letters(p_slug, p_pin)`,
   `open_invite_letter(uuid, text)` and `record_reaction(…, p_pin)` need the
   plaintext and bcrypt is one-way. It is `httpOnly`, `sameSite=lax`, `secure`
   off localhost, scoped per slug, 12h.
3. **The HMAC key is the invite's own `pin_hash`.** No new env var; different
   per invite, so a cookie cannot be replayed at another surprise; and it
   changes when the creator changes the PIN, which silently kills every
   outstanding session at exactly the right moment.
4. **The browser is never given the PIN.** The reactions and letters routes
   read it from the cookie server-side. Handing it to the client so the client
   could send it back would have thrown away the `httpOnly` flag.
5. **The creator is not exempt.** A preview that skipped the lock would not be
   a preview of what the recipient sees.

**SECURITY EVIDENCE — measured, not asserted.**

Probe fixture: `pin-verify`, temporarily given the title
`ZQXSPOILERTITLE Amara turns twenty-five` and the message
`ZQXSPOILERBODY the night bus to Goa…`, PIN set to `2509`. Both restored after.

Content absent from the network response before verification:
```
GET /surprise/pin-verify (no cookie)      -> 200, 32,454 bytes
ZQXSPOILERTITLE              0
ZQXSPOILERBODY               0
night bus                    0
twenty-five                  0
supabase.co/storage          0
sign/moment-photos           0
Four digits first            1
The year we met, backwards   2
```
The link preview is gated too:
```
<title>A surprise — TaDaaaa</title>
<meta property="og:title" content="Someone made you something"/>
```
(Before: the title went in `<title>` and in `og:title`, and the first photo was
the `og:image` — so pasting a locked link into a group chat spoiled it.)

Verify endpoint:
```
POST pin 0000  -> 401 {"ok":false,"code":"wrong"}     Set-Cookie count: 0
POST pin "12"  -> 400 {"ok":false,"code":"malformed"} (refused before the RPC)
POST pin 2509  -> 200 {"ok":true}  cookie tada_pin_pin-verify=v1.<exp>.2509.<64-hex>
```

Cookie forgery, live:
```
valid cookie            -> content renders, gate absent   (ZQXSPOILERTITLE 1, gate 0)
pin swapped in place    -> gate returns                   (grep "Four digits first" = 1)
expiry forged forward   -> gate returns                   (grep "Four digits first" = 1)
```

Brute force, live, 14 wrong tries in a row against one slug:
```
try  1..10 -> 401 {"code":"wrong"}
try 11..14 -> 429 {"code":"rate_limited"}
```
That is `verify_invite_pin`'s Postgres-backed budget: 10 tries / 10 minutes /
slug, which survives across serverless instances. 10,000 combinations at that
rate is roughly seven days. The route adds 12/min per IP on top so one script
cannot burn a real recipient's slug budget in a single burst.

Browser, real keypad, both widths:
```
gate 390 / 1440: imgs 0 · overflow false · dots 4 · keys 0-9 + "Delete the last digit"
                 "FROM TADA TESTER" / "Four digits first." / "Tada Tester's hint: …"
network bodies contain spoiler? [{ZQXSPOILERTITLE:false, ZQXSPOILERBODY:false}]
after 1111  -> role=alert "That's not it. Check the hint and try again."
after 2509  -> gate gone, reveal rendered
```
Screens: `verify/p6-pin-gate-{390,1440}.png`, `p6-pin-gate-wrong-*.png`,
`p6-pin-unlocked-*.png`.

**Differences from W-F1, and why:**
- The frame's kicker is "FOR AMARA, FROM PRIYA". There is no `recipient_name`
  column, and the only field that could stand in for it — `title` — is the
  thing the lock exists to hide. So the gate renders "From <creator>" only, and
  "Someone made you something" when even that is unknown.
- The frame's backdrop is a blurred photograph of the surprise. Photos are the
  spoiler; the theme's gradient stands in, blurred 36px and darkened. A theme
  is a mood, not content.

---

### W-F6 — RSVP ask. The retired palette is gone from the reveal.

`QuestionScreen` was the last place in the reveal still wearing the retired
rose/green: a full-bleed `theme.colors.background` (candy pink on the warm
themes) carrying `#C4686D → #9B3D42` on NO and `#5aaa69 → #3d8a4a` on YES.
Now ink ground + theme wash, W-F6's "ONE QUESTION" kicker, serif white heading.
Measured live at 390 and 1440:
```
ground rgb(26, 26, 26)
NO   bg rgba(0,0,0,0)   border rgb(204,172,159)  color rgb(204,172,159)  110x49
YES  bg rgb(184,65,47)  color rgb(255,255,255)                           110x49
backgroundImage on both: none          (no gradients anywhere)
```
`RSVPButton`'s dodge — untouched by Phase 1 — kept its own
`(Math.random()-0.5)*220` and **never gave up**. It now uses the shared
`src/lib/dodge.ts` geometry and W-F6's four-dodge cap. Live:
```
dodge 1 "It keeps running away (3 left)"   overlapsYes false
dodge 2 "…(2 left)"                        overlapsYes false
dodge 3 "…(1 left)"                        overlapsYes false
dodge 4 "Fine, it'll stay still now."      overlapsYes false
dodge 5,6: no movement
```
Once frozen, No does something rather than swallowing taps — and does not
invent a confirmation: "Nothing was sent. They'll only hear from you if you tap
Count me in." There is no "no" to record on this endpoint and the copy says so.
Screens: `verify/p6-f6-question-{390,1440}.png`, `p6-f6-dodged-*.png`.

---

### W-F4 / W-F9 — countdown. Also a spoiler leak, now closed.

`src/lib/countdown.ts` (+26 tests) + `CountdownWaitingRoom.tsx`, and two new
routes: `/api/invite/[slug]/notify` (wires the live but never-called
`record_notify_request`) and `/api/invite/[slug]/calendar` (.ics).

**The leak.** The old waiting room rendered `For {title}` and the creator's
whole `message` above the clock. W-C5 says "opening early shows the waiting
room — never the content". Removing them from the component was not enough:
`CountdownReveal` still received both as props for its later beats, so they sat
in the RSC payload and anyone with devtools could read the surprise days early.
The page now gates a pending countdown on the SERVER, exactly like the PIN, and
the client asks the server again when the clock hits zero. Measured:
```
before the page-level gate:  leaks title? true   leaks message? true
after:                       leaks title? false  leaks message? false
```
The link preview for a pending countdown is generic for the same reason.

Live at both widths:
```
"SOMETHING IS COMING | 38 | HOURS | : | 11 | MINS | : | 55 | SECS"
digit font-size   390: 46.8px    1440: 96px      (W-F9 asks for 96)
subline "Opens August 19, 2026 at 8:38 PM (GMT+5:30). Don't make plans."
timer (sr-only, per-minute): "38 hours, 11 minutes, 0 seconds to go"
NOTIFY ME BY EMAIL -> "Done. We'll email you the moment it opens."
DB: notify_requests row written for warm-embrace-lcggc7h04p  (probe row deleted after)
```
The .ics is deliberately spoiler-free — a calendar entry syncs to lock screens
and shared displays:
```
SUMMARY:A surprise opens
DESCRIPTION:Someone made you something. It opens at this time.
```
Digit grouping rule, so it is not re-derived: hours ACCUMULATE (36 hours reads
"36 HOURS", not "1 day 12 hours") until 100 hours, at which point three
two-digit groups stop fitting and the display switches to DAYS/HOURS/MINS.
Screens: `verify/p6-f4-countdown-{390,1440}.png`, `p6-f4-notified-*.png`.

---

### W-F3 / W-F8 — tap to reveal

Kicker moved above the card (the frame reads it first), and it now carries the
sender: "For <title>, from <creator>". The verb follows the INPUT DEVICE, not
the viewport — a touchscreen laptop at 1440 is still tapped:
```
390 (hasTouch)      visible verb: "Tap to unwrap it."
1440 (fine pointer) visible verb: "Click to unwrap it."
```
Screens: `verify/p6-f3-tap-{390,1440}.png`.

---

### W-F2 / W-F7 — scroll story at desktop

Reactions were already built and wired into `SkyHero`; not rebuilt. What
changed is the column: `PolaroidScene` was `max-w-4xl` (896px) with a free
`flex-wrap`, so 1440 packed three polaroids per line and the story column
disagreed with itself between scenes. Every scene is now 720, and the photo
scene pairs. Measured on an 8-photo story:
```
1440  inner column 720   grid-template-columns "344px 344px"   (2-up pairs)
 390  inner column 342   grid-template-columns "342px"         (1-up)
horizontal overflow at either width: none
reactions aria: "Reactions. Love 2, Funny 1"
```
Screens: `verify/p6-f7-hero-{390,1440}.png`, `p6-f7-photos-*.png`.

---

### W-E1 / W-E2 — contributor

`src/lib/contribute-copy.ts` (+15 tests), rewritten page + form.
```
1440  column 560px, centred, does not widen · overflow none
 390  column full-width · overflow none
h1    "Tada Tester is making something for “Maya turns thirty”."
counter 0 / 300 (W-E1's number; the server still allows 500)
tiles  PHOTO 249px · VIDEO · 30S 249px aria-disabled="true", same row
submit "ADD MY MESSAGE"
reassurance directly above submit, as the frame places it
```
W-E2 verified by a real submission through the live API:
```
"That's in, Jonah." | "They'll see it September 19, 2027 at 7:00 PM, along with
everyone else's. Tada Tester approves it first." | "Got someone's big day
coming?" | MAKE YOUR OWN
```
Screens: `verify/p6-e1-contribute-{390,1440}.png`, `p6-e2-submitted-*.png`.

---

### W-A1 — sign-in split panel

Form left, fixed ink welcome panel right ("Everyone piles on."), panel leaves
the flow below 1024 rather than stacking under the form. Apple button drawn per
the frame and labelled as a stub.
```
1440  aside display:block · overflow none
 390  aside display:none  · overflow none
```
Screens: `verify/p6-a1-signin-{390,1440}.png`.

---

## STUBS — drawn, and labelled on screen as not built

- **Guest video (W-E1's "+ VIDEO · 30S").** `invite_contributions` has
  `photo_url` and no video column, `contribute/upload` allowlists exactly
  `image/jpeg|png|webp`, and no reveal plays a guest clip. The tile is drawn
  because the frame draws it and reads "Not built yet — photos only for now."
  SQL it would need is under "Waiting on the user" below.
- **Apple sign-in (W-A1).** No Apple provider on this Supabase project and no
  `signInWithApple` action. Button drawn, disabled, "Apple — not set up yet".
- **The notify email is never SENT.** `/api/invite/[slug]/notify` writes a real
  `notify_requests` row and the recipient is told we will email them — but no
  job dispatches it. The row is the promise; the sender does not exist.

## NOT DONE in Phase 6

- **W-A0 landing page** — not started. The existing landing page is untouched.
- **W-A2 onboarding (`/welcome`)** — **the route does not exist at all.** Not
  built, not started.
- **W-F2's hero copy** — `SkyHero` still reads eyebrow / recipient /
  occasion-line. W-F2 draws kicker / serif title / message paragraph /
  "SCROLL SLOWLY ↓". Only the column geometry and the pairing were done.
- **W-F5/F10 letters** — left alone as instructed; the PIN work touched only
  the reader's `p_pin` argument.
- **Google OAuth** — the button is live and surfaces failures as a toast, but
  whether it completes depends on a Supabase redirect allow-list only the user
  can set. Not verified end to end in this session.

## Known gaps & risks

1. **The per-slug PIN limiter is a lockout vector.** `verify_invite_pin` checks
   its budget BEFORE comparing, so ten wrong guesses from anyone lock the real
   recipient out of their own surprise for up to ten minutes. That is the
   existing DB design and changing it needs a migration; not touched.
2. **A gated page still signs the photos.** `getInviteBySlug` does the whole
   read (including storage signing) before the gate decides. The URLs never
   reach the client — proved above — but the work is wasted and a locked page
   is slower than it needs to be. Fixing it means a narrow pre-read plus a
   second gate in `generateMetadata`; deliberately not done for a perf win.
3. **`pin-verify`'s PIN is now `2509`.** The original bcrypt hash was replaced
   to get a known value; the original plaintext was unknown to anyone, so
   nothing recoverable was lost. Its title and message were restored exactly.
4. **`warm-embrace-lcggc7h04p` and `warm-embrace-k69tyvcpua`** were flipped to
   `countdown` / `scroll_story` to exercise those paths and **restored** to
   `tap` with `countdown_date` and `display_timezone` back to NULL. Verified by
   re-reading the rows.
5. **The contributor message cap dropped 500 → 300** on the client to match
   W-E1's counter. The server still accepts 500, so this is the client binding
   first, not a validation mismatch — but it is a product change.
6. **W-E1's email field was KEPT**, though the frame lists only name + message.
   Dropping a working field that feeds the creator's thank-you to match a
   picture seemed the wrong trade. Flagged rather than done silently.
7. **W-E2 still shows the page header above the thank-you.** The frame's E2 is
   a clean page; `done` lives in the client form and the h1 is server-rendered,
   so hiding it needs state lifted out. Not done.
8. **The cookie banner appears on `/contribute/*`.** Phase 1 suppressed it on
   `/surprise/*` and Phase 4 on `/create`; the contributor page is a stranger's
   front door and W-E1 does not draw it. Left alone — it is a consent control,
   not decoration, and removing it is a legal call, not a design one.
9. **No axe run, no full keyboard sweep.** Landmarks, `role="alert"`,
   `role="timer"`, `aria-disabled`, per-key labels and focus rings were each
   written deliberately and spot-checked in the browser. Phase 7 owns the
   automated gate.
10. **The PIN gate has not been exercised on a letters or scroll-story
    invite.** No PIN-locked invite of either type exists; the code path is the
    same branch for all reveal types, and the letters reader was handed
    `verifiedPin` rather than `null`, but that combination has not been run.

## Trap for the next session (cost ~20 minutes here)

**Never write a Tailwind arbitrary media-query variant with an unspaced `and`,
and never paste one into a file Tailwind scans — including this one.**

Written as `[@media(hover:hover)` + `and(pointer:fine)]:inline` (joined, no
space before `and`), the variant compiles to a media query with no whitespace
around `and`. That is invalid CSS, and because `globals.css` is imported by the
root layout it **500s every route in the app**.

Two things make it much worse than a typo:

- The bad candidate survives in Tailwind's scan cache after you delete the
  class from source. `touch`ing files does not clear it; only a real content
  change to `globals.css` forces the rebuild.
- **Tailwind v4 scans this markdown file too.** Writing the offending class
  literally in a note — exactly as the first version of this note did — put the
  candidate back and 500ed the whole app a second time, minutes after the code
  fix. That is why the string above is deliberately split across a `+`.

Use `_` where the spaces go, or write the rule by hand in `globals.css` (which
is what `.ed-verb-tap` / `.ed-verb-click` do).

Related, and confirming the Phase 3 note: **Turbopack will serve a stale
`src_app_globals_*.css` chunk indefinitely.** A hand-written block appended to
`globals.css` was absent from the served chunk across several `touch`es and
several minutes. Appending a throwaway rule (a real content change) forced the
rebuild; removing it again kept the new content. Verify with
`curl <chunk-url> | grep <your-class>` before concluding your CSS is wrong.

## Waiting on the user — Phase 6 addition

4. **Guest video contributions (W-E1's "+ VIDEO · 30S").** Not run, not
   applied. Schema only — the upload route, a moderation path and reveal
   playback are all still to build on top of it.
   ```sql
   -- Lets a guest attach a clip alongside (or instead of) a photo.
   alter table public.invite_contributions
     add column if not exists video_url text,
     add column if not exists video_duration_ms integer;

   -- Revert:
   -- alter table public.invite_contributions
   --   drop column if exists video_url,
   --   drop column if exists video_duration_ms;
   ```

## Orchestrator verification of Phase 6 — 2026-08-18

Re-measured the PIN gate myself. The agent's claims hold.

```
gates: tsc 0 · eslint 0 errors / 12 warnings · 103 files / 1752 tests

LOCKED (no cookie), raw HTML of /surprise/pin-verify — 32,454 bytes
  "Four digits"                 1
  message text                  0
  supabase.co/storage           0
  invite_photos                 0
  aria-label="Unwrap the surprise"   0      <- the reveal is not in the payload
  <title>                       "A surprise — TaDaaaa"   (neutral)

POST /api/invite/pin-verify/pin
  {"pin":"12"}    -> 400 {"ok":false,"code":"malformed"}   (refused before the RPC)
  {"pin":"0000"}  -> 401 {"ok":false,"code":"wrong"}       set-cookie count 0
  {"pin":"2509"}  -> 200 {"ok":true}                       set-cookie count 1
  cookie: tada_pin_pin-verify=…; Path=/; Max-Age=43200; HttpOnly; SameSite=lax

brute force, 14 tries -> 401 x13 then 429

UNLOCKED (valid cookie)
  "Four digits"                     0       <- gate gone
  aria-label="Unwrap the surprise"  1       <- real reveal renders
```

Decisive pair: reveal controls are **0 when locked, 1 when unlocked**. Content is
absent from the response, not hidden in it — which is what makes this a fix rather
than a curtain.

### Found while probing — Phase 7 item

`src/app/not-found.tsx` still ships the RETIRED rose/gold palette: `#C4686D`,
`#9B3D42`, `#2D2926`, `#FFF8F0` appear in the 404 markup (gradient button, heading,
ground). Every other surface has moved to the editorial tokens. Not touched here —
Phase 6's agent did not own it and Phase 5's is mid-flight.

---

## Phase 5 — Detail + analytics, moderation, account  [DONE; browser- and DB-verified]

Frames worked from: W-D1, W-D2, W-D3. Ran concurrently with Phase 6 (reveals,
contributor, landing/sign-in). Nothing under `src/components/surprise/**`,
`src/app/surprise/**`, `src/app/contribute/**`, `src/app/auth/**` or
`src/app/page.tsx` was touched.

### Gates — pasted verbatim, none regressed

```
tsc --noEmit  -> exit 0
eslint src    -> 12 problems (0 errors, 12 warnings)   [baseline 0 errors / 12 warnings]
vitest run    -> Test Files 103 passed (103) / Tests 1752 passed (1752)
```

Entry baseline measured at the start of this phase was **92 files / 1486 tests**,
not the 91 / 1481 in the brief — Phase 6's agent had already landed a file.
+11 files / +266 tests from this phase.

**`npm run build` was NOT run** — a dev server was live on 4611 and the plan
forbids building underneath it.

### What was built

Rules first, in node-testable modules; the components only paint what they return.

- `src/lib/surprise-detail.ts` (+ 41 tests) — `parseEventSummary` (the RPC's
  jsonb, where every aggregate can legitimately be null), `detailHeader`,
  `needsYouBanner`, `detailStats`, `analyticsAccess`, `linkPanel`,
  `buildViewsChart`, `detailPanels`, `detailActions`, `detailToggles`.
  **The analytics maths is NOT re-derived**: the funnel, the dwell format and
  the country rows come from `invite-events.ts`, the 7-day buckets from
  `analytics-data.ts`. This module only normalises and labels.
- `src/lib/moderation-queue.ts` (+ 59 tests) — the queue, `parseShortcut`
  (A/R/J/K, refusing modified chords and anything typed into a field),
  `moveSelection`, `selectAfterDecision`, `groupFeed`, `buildNotices`,
  `positionLabel`, and the read marker.
- `src/lib/account-plans.ts` (+ 31 tests) — `notifyToggles`, `planCardModel`,
  `purchaseOptions`/`checkoutRequest` (one place decides the words AND the
  money), `stripeMode`, `isDeleteConfirmed`.
- `src/lib/owner-contributions.ts` — see "the RLS finding" below.
- `src/actions/surprise-detail.ts` — `setAcceptingContributions`,
  `removeInvitePin`, `duplicateInvite`. Reopen, extend and delete are NOT
  reimplemented; the page calls the existing actions.
- `src/app/dashboard/surprise/[id]/page.tsx` + `components/dashboard/detail/`
  (`DetailSidebar`, `DetailHeaderActions`).
- `src/app/activity/page.tsx` rewritten + `components/activity/ActivityTriage.tsx`.
- `src/app/account/page.tsx` rewritten + `components/account/`
  (`NotifyPanel`, `PaymentPanel`), `DeleteAccountButton` rewritten.
- `src/app/api/stripe/intent/route.ts`, `src/app/api/stripe/portal/route.ts`.
- `globals.css`: `.ed-d1-* / .ed-d2-* / .ed-acct-*`. Every colour resolves
  through `var()` or `color-mix()` — `app-shell.seams.test.ts` enforces it for
  everything after the shell block and caught four raw rgba()s.
- 3 seam-test files (+ 36 tests).

### Route choice, stated because it diverges from the frame

W-D1's URL is `app.tadaaaa.com/surprise/amara-25`, but `/surprise/[slug]` is
already the PUBLIC reveal. The management view is at
**`/dashboard/surprise/[id]`**, where the shell and the auth gate already live,
and the dashboard card's ANALYTICS action now points there. `/dashboard/
analytics` survives as the across-all-surprises view and is linked from the new
page ("Compare with your other surprises"), so it is not orphaned.

### THE RLS FINDING — why the moderation queue was empty

`invite_contributions` carries two SELECT policies:

```
public-read-approved                 PERMISSIVE   (approved = true)
invite_contributions_select_restrict RESTRICTIVE  (you own the invite)
```

Postgres ANDs a restrictive policy onto the permissive one, so the effective
rule for anon and authenticated is **"approved = true AND you own it"**. A
pending or rejected contribution is invisible over PostgREST **to the creator who
has to moderate it**. That is why `get_owner_contributions` exists as SECURITY
DEFINER — and it is why Phase 2's Activity badge "was painted, not lived": its
`.eq("approved", false)` count could only ever return zero.

Two bugs followed from it, both fixed:

1. **The shell's Activity badge and the dashboard's PENDING tile were dead.**
   They now read through `owner-contributions.ts`, which resolves the invite ids
   under the caller's OWN session (`creator_id = user.id`) and then constrains a
   service-role read to exactly that list — the same pattern, and the same
   reasoning, as `logInviteViewBySlug`.
2. **`approved = false` is not "pending".** Every `approved = false` row in the
   live table was `moderation_status = 'rejected'`. A creator who rejected a
   message would have kept a coral badge no action could clear. The predicate is
   now the moderation status, with legacy NULLs treated as pending.

Proved live, with two pending fixture rows inserted and then deleted:

```
before fix: badge null · dashboard "Pending 0" · NEEDS YOU banner absent
after fix:  badge "1"  · dashboard "Pending 1" · "1 message waiting on you"
```

### Verified in a browser myself, at all three widths

Screenshots in `tadaaaa/design-handoff/verify/`, signed in as `tada.tester`:
`p5-d1-unlocked-{1440,1024,768}.png`, `p5-d1-locked-{1440,1024,768}.png`,
`p5-d1-needsyou-1440.png`, `p5-d1-pin-confirm-1440.png`,
`p5-d2-{1440,1024,768}.png`, `p5-d2-after-approve-1440.png`,
`p5-d3-{1440,1024,768}.png`, `p5-d3-premium-1440.png`,
`p5-d3-delete-gate-1440.png`. Raw probe output in `p5-d1-log.txt`,
`p5-d2-log.txt`, `p5-d3-log.txt`, `p5-mut-log.txt`, `p5-shots-log.txt`.

**W-D1**
```
kicker "Birthday · Scroll story"   status "Live · expires in 29 days" / "Scheduled · opens Sep 19"
link note "PIN required · link closes Sep 15"   chart labels Tue…Mon, peak coral / runner-up sand
free tier: 2 lock overlays, blur(7px), AVG TIME "—", geography empty,
           Delete data-blocked with "Free surprises can be deleted once they expire."
paid tier: no overlay, real numbers, honest no-telemetry note instead of a funnel of zeroes
another creator's invite id -> "This page doesn't exist"     non-uuid id -> not found
h1s 1 · landmarks header+nav[aria-label=Main]+main · horizontal overflow at 1440/1024/768: none
```

Every mutating control exercised against the live DB and then restored:
```
Accepting contributions  true -> false   toast "Contributions are closed."
Extend the link                          toast "Link extended until Oct 7."
Duplicate                                REFUSED by the real tier gate:
                                         "You've made 2 surprises this month…"
PIN lock off   confirmation shown -> "Keep the lock" backs out with no write
               -> "Remove it" clears it; link note loses "PIN required";
               the switch becomes a "Set a PIN" link to the editor
Delete (free, live)                      refused with the reason on screen
DB restored afterwards: pin_hash, pin_hint, expires_at, accept_contributions all back
```

**W-D2**
```
groups  "Needs you · 2" / "Today" / "Earlier"      split 380px | 756px
detail  "Needs you · 1 of 2" · For <title> · the full message · byline · REJECT/APPROVE
        legend  A approve   R reject   J/K next / previous
J -> "Needs you · 2 of 2"      K -> back to 1 of 2
R with an <input> focused  -> position unchanged (the typing guard holds)
Ctrl+R                     -> position unchanged (modified chords are refused)
A -> real approval through moderate_contribution; queue 2 -> 1; DB row approved=true
role=listbox "Messages waiting on you" · aria-selected true on exactly one option
horizontal overflow at 1440 / 1024 / 768: none
```

**W-D3**
```
plan card  CURRENT PLAN / Free / "2 surprises a month · 3 themes · 8 photos ·
           7-day links · watermark" / GO UNLIMITED   background rgb(26,26,26)
toggles    "Someone opens a surprise" off · "A contribution arrives" on ·
           "An occasion is two weeks out" on            (the frame's exact words)
purchase   PREMIUM SURPRISE $4.99 one-time · UNLIMITED $1.99 / month (selected, coral)
payment    "Card payments aren't configured in this environment…"  (see gap 1)
           inputs inside the payment panel: 0 · iframes: 0 · no field named card/cvc/exp
typed-DELETE gate — "Delete forever" disabled for every one of:
           "" · "delete" · "Delete" · "DELET" · "DELETE ME" · "DELETEE" · "D E L E T E"
           enabled only for "DELETE" and "  DELETE  "
           clicking it with "delete" typed does nothing; still on /account
horizontal overflow at 1440 / 1024 / 768: none
```

### Bugs found and fixed beyond the frames

1. **`deleteAccount` had no server-side confirmation.** The typed-DELETE check
   lived only in the button (`value !== "DELETE"` in a client component). A
   server action is a public endpoint, so the confirmation was decorative.
   `deleteAccount(confirmation)` now requires the word, using the same
   `isDeleteConfirmed` the button uses, and is rate-limited 5/hour.
2. **The pricing page's monthly toggle charged yearly.** `PricingTiers` has
   always SENT `cadence: "monthly"` and `/api/stripe/checkout` ignored it: a
   reader who chose "$1.99 / month" was charged $19.99 for a year. The cadence
   now decides the charge; the default stays yearly so `PricingCTA`, which sends
   none, is unaffected. A seam test pins the monthly price in the route to
   `UNLIMITED_MONTHLY_CENTS`.
3. **A `"use server"` file may export only async functions.** `export const
   DUPLICATE_PHOTO_NOTE` in `actions/surprise-detail.ts` typechecked clean and
   then broke the entire module at request time. Moved to `lib/`. Same class of
   trap as the Turbopack `in`-operator note above: **tsc passing is not evidence
   the bundler can load it.**
4. **A CSS blur is not a paywall.** The first cut rendered the real funnel and
   geography behind `filter: blur(7px)` — readable from devtools. The locked
   reader is now never sent the numbers at all; a fixed `LOCKED_PLACEHOLDER`
   shape sits behind the blur and AVG TIME is nulled server-side.
5. **"EXPORT PDF" downloads a PNG.** `/api/invite/[slug]/collage` sets
   `filename="<slug>-collage.png"`. The link says "Export keepsake · PNG"
   rather than naming a format it does not produce.

### Differences from the frames, and why

1. **Route** — `/dashboard/surprise/[id]`, not `/surprise/amara-25`. Above.
2. **The hero shows no photograph.** `getDashboardCovers` returns "Object not
   found" for every live invite's stored path — the Phase 3 gap, unchanged. The
   hero falls back to ink + the theme gradient rather than a broken image.
3. **"EXPORT PDF" reads "Export keepsake · PNG".** Bug 5 above.
4. **The funnel is not drawn when there is no telemetry.** Four 0% bars beside a
   "RSVPS 9" tile read as a contradiction; the honest sentence is shown instead.
   With telemetry the four bars render exactly as the frame draws them.
5. **The queue is oldest-first**, so W-D2's two messages appear in the opposite
   order to the frame. The person who has waited longest is answered first.
6. **View notices are aggregated per surprise per hour (recent) or per day
   (older)** — "3 people opened “Maya turns thirty”." The frame does the same
   ("14 people viewed … in the last hour"); without it the live account rendered
   forty identical "Someone peeked" rows.
7. **W-D3 keeps a PASSWORD panel and a Sign out link** that the frame does not
   draw. Both are working features that live nowhere else.
8. **The inline card form covers the ONE-TIME purchase only.** A subscription
   through Elements needs a Stripe Price object; UNLIMITED goes through the
   already-proven hosted Checkout and the panel says so.
9. **"Secured by Stripe · cancel anytime from this page"** is only printed when
   the account actually has a bound `stripe_customer_id`, because only then can
   the Billing Portal open. Otherwise it reads "· your card details never reach
   TaDaaaa".

### STUBS

None. Every control on all three screens reaches a real backend. The two
honestly-degraded states are labelled on screen: the payment panel when Stripe
is unconfigured, and the analytics panels when there is no telemetry yet.

### Known gaps & risks

1. **NO STRIPE PAYMENT WAS EVER MADE. The 4242 card was never charged.**
   `.env.local` carries the literal placeholders `STRIPE_SECRET_KEY=sk_test_...`
   and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`. `stripeMode()` detects
   that and the panel renders its unconfigured state, which is what the
   screenshots show. **The PaymentElement mount, the PaymentIntent route, the
   Billing Portal route and the subscription hand-off are all UNEXERCISED.** They
   are written and typechecked and their shapes are pinned by seam tests; none
   has met a real Stripe key. This is the single most important line in this
   report.
2. **The funnel, AVG TIME and geography have no data anywhere.** Nothing fires
   the `/api/invite/events` beacons yet — that wiring is Phase 6. Every one of
   those panels currently renders its honest empty state. The maths reproduces
   the frame's 100/84/71/46 and "1:42" in `invite-events.test.ts`, but **no
   number on this page has come from a real reveal.**
3. **VIEWS (the tile) and the chart read different sources.** The tile is
   `invites.view_count`; the chart counts `invite_views` rows. On `contrib-verify`
   they disagree 7 vs 49 — almost certainly fixture rows inserted directly by
   earlier verification sessions rather than a product bug, but the two numbers
   can visibly contradict each other. Inherited from `analytics-data.ts`, which
   documents the same divergence.
4. **`getShellCounts` now makes three queries per authenticated render**, one of
   them through the service-role client. Memoized per render, not benchmarked. A
   single RPC returning a creator's pending count would replace it; see "Waiting
   on the user".
5. **`duplicateInvite` does not copy photos**, and says so in the toast.
   `invite_photos` rows point at real storage objects; two invites sharing a
   `storage_path` would mean the purge cron deleting one silently blanking the
   other. Copying the bytes is a storage pipeline, not a row insert.
6. **The duplicate path itself was refused, not completed.** The test account is
   at its free monthly limit, so the browser run proved the tier gate and not the
   insert. `duplicateInvite`'s happy path is untested end to end.
7. **`markAllRead` is per browser, not per account.** It writes a localStorage
   marker. Signing in elsewhere shows everything as unread again. Deliberate —
   it must never be mistaken for a moderation decision, and a seam test asserts
   it cannot call `moderateContribution`.
8. **No axe run, no full keyboard sweep of D1 and D3.** D2's keyboard contract
   was driven start to finish with no mouse. Landmarks, `role="listbox"`,
   `aria-selected`, `role="alertdialog"`, `aria-live` and the chart's words-only
   `aria-label` were written deliberately and spot-checked. The automated a11y
   gate is Phase 7's.
9. **Two parity assertions were rewritten**, each documented in place in
   `cross-platform-parity.test.ts`: the activity screen (web now matches D2's
   short header, so the old web-only subline is gone — the cap notice, the
   self-preview line and "Mark all read" are still asserted on both platforms)
   and the notification preferences (web takes W-D3's three bare labels; mobile
   keeps B6's labels with subs — both platforms are still asserted to cover the
   same three `profiles` columns).
10. **Phase 6's in-flight edits broke the build twice during verification.** An
    arbitrary Tailwind variant in `src/components/surprise/TapToReveal.tsx`
    (`[@media(hover:hover)_and_(pointer:fine)]:inline`) compiles to
    `@media (hover:hover)and(pointer:fine)`, which Turbopack's CSS parser
    rejects — taking `globals.css` down and 500ing **every page in the app**.
    It cleared on its own both times. Not mine, not fixed by me, flagged here
    because it is a whole-app outage from one class name.

## Waiting on the user — Phase 5 additions

4. **A pending-contribution count for the shell badge, as one call.**
   `owner-contributions.ts` currently resolves the creator's invite ids and then
   runs a service-role count, on every authenticated page render. A SECURITY
   DEFINER function would make it one round trip and would remove the
   service-role client from the hot path entirely. Nothing was run.
   ```sql
   create or replace function public.get_pending_contribution_count()
   returns integer
   language sql
   security definer
   set search_path = public, extensions
   stable
   as $$
     select count(*)::int
     from public.invite_contributions c
     join public.invites i on i.id = c.invite_id
     where i.creator_id = auth.uid()
       and i.deleted_at is null
       and coalesce(c.moderation_status, 'pending') = 'pending';
   $$;

   revoke all on function public.get_pending_contribution_count() from public;
   revoke all on function public.get_pending_contribution_count() from anon;
   grant execute on function public.get_pending_contribution_count() to authenticated;
   ```
   (Remember the Supabase grant trap recorded above: `revoke from public` alone
   does not remove anon's EXECUTE — it must be revoked from `anon` by name.)

5. **Real Stripe test keys, so the card path can actually be proved.** No
   migration and no code change — `.env.local` needs
   `STRIPE_SECRET_KEY=sk_test_<real>` and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<real>` (and
   `STRIPE_WEBHOOK_SECRET` for the webhook). Until then gap 1 above stands:
   the whole payment surface is unexercised.

## Session-limit interruption — 2026-08-18, orchestrator recovery

Three Phase 7 agents died mid-flight on an API session limit. They left partial
work in the tree. Recovered to green:

```
BEFORE recovery: 1 failed / 1854 passed · eslint 1 error
AFTER  recovery: tsc 0 · eslint 0 errors / 12 warnings · 108 files / 1855 tests
```

Two things were broken and are fixed:
1. `retired-palette.test.ts` — the guard shipped, the removals did not. Finished
   `CraftingIntro.tsx` (cream ground -> `var(--paper)`, two rose accents -> `coral`).
2. `onboarding-occasions.test.ts` assigned to a variable named `module`, which
   trips `@next/next/no-assign-module-variable`. Renamed to `source`.

**Two exemptions added deliberately, not to silence the test:**
- `app-shell.seams.test.ts` — another guard that has to NAME the hexes it bans.
- `src/lib/themes.ts` — **a product decision, deferred to the user.** Its two hits
  are `midnight-romance.colors.accentLight = "#C4686D"` and a sunset theme's
  `backgroundSecondary = "#FFF8F0"`. Those are THEME palettes — the colours a
  creator picks for their own surprise, rendered inside the reveal, never in the
  shell. The retired-palette rule exists to stop TaDaaaa's own identity
  regressing; it has no claim on what a romance theme looks like. Rewriting them
  would silently restyle two themes nobody asked to change. Flagged, not actioned.

### Telemetry — VERIFIED WORKING despite the interruption

The agent got the wiring in before it died. Proved from a real reveal, not a curl:
```
/surprise/warm-embrace-k69tyvcpua (tap, 8 photos)
beacons fired: POST opened | POST scrolled | POST saw_photos
DB after:      opened 2 sessions · scrolled 1 · saw_photos 1
```
`useRevealMark` is wired into all four reveal types (tap, countdown, scroll story,
letters). Probe rows deleted; `invite_events` back to 0.

### Still not done (the interruption cost these)

- **W-A0 landing** — not rebuilt. `/welcome` (W-A2) — route still does not exist;
  `src/lib/onboarding-occasions.ts` landed but nothing renders it.
- **No axe / Lighthouse run** in this entire build.
- **VIEWS-tile vs chart disagreement** (`view_count` 7 vs `invite_views` 49) unfixed.

## W-A2 /welcome + W-A0 landing — orchestrator, 2026-08-18

Done directly rather than waiting for the agent limit to reset.

```
tsc 0 · eslint 0 errors / 12 warnings · 109 files / 1863 tests
next build -> Compiled successfully in 11.9s ·  └ ƒ /welcome
```

### /welcome (W-A2) — BUILT

`src/app/welcome/{page,WelcomeCard}.tsx` + `src/actions/onboarding.ts` + 8 tests.
Six chips, SKIP, two progress bars, the frame's copy from `WELCOME_COPY`.
No migration: `profiles.occasions text[]` already exists and the phone writes it,
so web and phone share one vocabulary.

**The answer is not decorative** — `orderThemesByOccasionPreference` reads it and
`/themes` is revalidated on save. A preference that changed nothing would be a lie
told in a nice card.

**Soft-redirect trap, third occurrence this build.** The page's own `redirect()`
answered **200 with a full document**, not a 307 — a signed-out visitor was served
the onboarding markup before anything turned them away. Fixed by adding
`/welcome` to the middleware's `protectedPaths`; the page guard stays as defence
in depth. Verified:
```
/welcome -> 307 -> /auth/signin?next=%2Fwelcome
```
`welcome-route.test.ts` now fails if any authenticated surface drops out of that
list.

### W-A0 landing — ALIGNED, not rebuilt

The existing landing already matched the frame's structure (same nav, hero,
device preview, sections), so a from-scratch rebuild would have thrown away
working, tested components to arrive at the same shape. Closed the two real gaps:

1. **Hero copy -> the frame's words, verbatim.** Was "The surprise app designed to
   be opened." — which sells an APP. The frame deliberately sells what the
   recipient receives, because nobody downloads anything to open one. Added the
   sub-paragraph, "Start a surprise — it's free", "See a live example →" (now
   pointing at a real live invite), and the reassurance line the frame carries:
   "No app needed to open one. About three minutes to make one."
2. **Pricing was missing from the landing entirely** — the one number a visitor
   most wants was a click away. New `PricingTeaser.tsx`, reading
   `src/lib/pricing.ts` rather than retyping the numbers: a landing page quoting
   its own hardcoded price is how a site advertises one price and charges another.

Verified at 1440 and 768, no horizontal overflow at either:
```
A surprise designed to be opened. | Write one honest paragraph…
FREE $0 | PREMIUM SURPRISE $4.99 one-time | UNLIMITED $1.99 / month
```

**Not done, disclosed:** the frame's "STEP 01 / 02 / 03" numbered block and its
"Four ways to open it · TRY THEM LIVE →" heading. The existing `HowItWorks` and
`RevealStyles` sections cover the same ground in different words. That is a copy
pass, not a structural gap.

**Could not screenshot the /welcome card itself** — it is behind auth and I do not
type passwords. Gate, action, and copy are verified; the rendered card is not.

## Accessibility gate — axe + Lighthouse, 2026-08-18

First a11y run of the entire build, against a PRODUCTION build (dev numbers would
mislead Lighthouse).

### axe-core, WCAG 2.0/2.1 A + AA — 12 routes x {1440, 390}

```
BEFORE: 24/24 scans · 15 violation types
AFTER:  24/24 scans · 0 violations        <- clean
```

Three root causes, all real:

1. **White on raw `--coral` is 3.97:1** — under AA's 4.5 for the 11-13px text on
   those buttons. Hit the landing (x3), themes, pricing, and the gift CTA.
   `globals.css`'s `.ed-btn-coral` had ALREADY moved to `--coral-deep` (5.43:1);
   four other places never got the memo, which is why the same button passed in
   one file and failed in another. Fixed in `landing/editorial.ts`,
   `pricing/PricingTiers.tsx`, `pricing/GiftCTA.tsx`, plus two on auth-gated
   pages axe cannot reach but which are demonstrably the same bug
   (`DesignerArtButton`, `InviteCard`'s count badge).
2. **`--coral` links on paper, 3.94:1**, and `link-in-text-block`: the link
   colour was only 1.57:1 against surrounding text, so colour alone signalled
   the link. Privacy and Terms now use `--coral-deep` WITH a persistent
   underline.
3. **`text-paper/45` resolves to #818180 on ink — 4.46:1**, just under. My own
   code in `LettersReveal` (locked label and the desktop hint). Now /60.

### Lighthouse accessibility — 8 routes, desktop

```
landing 1.00 · themes 1.00 · pricing 1.00 · signin 1.00
contributor 1.00 · reveal-scroll 1.00 · reveal-letters 1.00 · reveal-pin 1.00
```
Target was >= 0.96. **1.00 on every route.**

Two routes initially failed `label-content-name-mismatch` — an audit Lighthouse
weights at ZERO, so the score was already 1.00 and it would have been easy to
ignore. It is a genuine voice-control break: the accessible name must CONTAIN the
visible text, or "click see what's included" matches nothing. Both were mine:
- `PricingTeaser` had `aria-label="See what Free includes"` over visible text
  "See what's included". Now the visible text is the name, with the tier appended
  in an `sr-only` span so four identical links stay distinguishable in a screen
  reader's link list.
- `LettersReveal`'s row `aria-label` REPLACED the visible text. Removed; the
  visible text already reads completely, and "Locked." is added `sr-only` where
  the lock glyph carries the meaning visually.

Gates after: tsc 0 · eslint 0 errors / 12 warnings · 109 files / 1863 tests ·
`next build` compiled successfully.
