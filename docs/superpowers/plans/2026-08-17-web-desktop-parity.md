# TaDaaaa Web — desktop parity build + 6 reported bugs

Authoritative plan. **If context resets, a fresh session reads this file first, then
`PROGRESS.md` beside it, and resumes at the first phase not marked DONE.**

Source of truth for design: `tadaaaa/design-handoff/web-frames/W-*.png` (33 frames,
captured at 1440@2x from `~/Downloads/TaDaaaa Web (standalone).html`).
Spec prose: `tadaaaa/design-handoff/web-spec.md`.

## Standing rules (from ~/.claude/CLAUDE.md + user, non-negotiable)

- **No git commits** until the user says go. Both repos stay uncommitted.
- **No DB migration** without the SQL written into this doc first.
- **Evidence rule**: "done/passing/verified" only with pasted output. Otherwise
  "changed, unverified".
- Gates in order per phase: build -> lint+typecheck -> tests -> security -> runtime
  (browser screenshot) -> adversarial review.
- Baselines never regress. Entry baseline: **web tsc 0 - 55 files / 768 vitest - eslint
  0 errors**. Mobile untouched this build.
- **Max 2 concurrent agents.** Dev agents Opus + caveman. Verification agents **Fable 5**.
- Screenshot every visual claim myself. Agent reports are not visual verification.
- No fake flows. Every button hits a real backend. Anything stubbed is labelled STUB in
  the delivery report.

## Traps already paid for — do not rediscover

- Dev server: use `http://localhost:<port>`, **never `127.0.0.1`** — Next 16 blocks
  cross-origin dev resources and the page silently never hydrates. Every button appears
  dead. Cost two false leads.
- Never `npm run build` under a running `next start` — invalidates chunks, CSS 500s.
- Web has **no generated Supabase types**. `tsc` passing is NOT evidence of schema
  correctness. Probe the live DB.
- `get_invite_by_slug`'s RETURNS TABLE is FROZEN — extend with a separate reader.
- Supabase installs pgcrypto in `extensions` schema: SECURITY DEFINER functions need
  `set search_path = public, extensions`.
- `cross-platform-parity.test.ts` asserts exact key-set equality on palette/derived — a
  token added to web alone breaks mobile's suite. Add to both or neither.
- Playwright: infinite-loop animations make elements "not stable"; click via
  `page.evaluate(el.click())`, not `locator.click()`.
- Trust the live DB, never the `sql/` files — they have drifted.

---

## Phase 0 — Baseline, spec extraction, safety net  [status: IN PROGRESS]

Skills: `superpowers:using-superpowers`, `superpowers:writing-plans`, `karpathy-guidelines`,
`graphify` (architecture map), `mem-search`.

1. Capture all 33 frames at 1440@2x. **DONE** -> `design-handoff/web-frames/`
2. Extract spec prose to `design-handoff/web-spec.md`.
3. Diff spec tokens vs `globals.css`. **DONE** — identical. `pebble` present, `--head`
   is Georgia. No token work required.
4. Record entry baseline (tsc, vitest, eslint, build).
5. Write route map: current -> target, with redirects so no existing URL 404s.

Gate: baseline numbers pasted into PROGRESS.md.

---

## Phase 1 — The six reported bugs  [status: TODO]

These come first. They break the core moment; nothing else matters if the reveal is
broken. Each is reproduced in a browser, fixed, then re-proved in a browser.

Skills: `superpowers:systematic-debugging`, `superpowers:test-driven-development`,
`diagnose`, `emil-design-eng` (reveal pacing/motion), `impeccable` (layering),
`review`, `security-review`.

### 1.1 Sequential photo reveal restored (user item 3)
`PolaroidCarousel.tsx` renders an all-at-once masonry; the one-at-a-time reveal with
per-photo captions was deleted in P3. `PhotoCarousel.tsx` still holds the old sequential
engine and is imported by nothing.
Fix: restore **pacing** (one photo, its caption, advance) under the **editorial styling**
(paper ground, mist hairlines, `.mcap` captions). Keep the lightbox. Keep the masonry
available for `scroll_story` only, where a scroll wall is intentional.
Test: RED test asserting photo N+1 is not in the DOM until photo N is advanced past.

### 1.2 Question screen made readable (user item 4)
YES/NO measurably render at every width — the screen around them is destroyed.
- Remove `FloatingPhotos` from `QuestionScreen.tsx:178` (P3 removed it from
  `MessageReveal` and `RSVPButton` for exactly this reason and skipped this file).
- Constrain the NO dodge to the button row, not `containerHeight * 0.4` of a full
  viewport (currently +/-169px on a phone, which flings NO off the question).
- Spec says the No **gives up after four dodges** (W-F6). Current `MAX_DODGES = 5`.
  Change to 4.
- Remove `e.preventDefault()` on `onTouchStart` blocking the real tap.
- Emoji-as-content banned by the editorial identity: `📡` (`:42`), `😏` (`:290`),
  `😂` (`:295`), `😄` (`:300`), `✅` (`ReportButton.tsx:62`).

### 1.3 Cookie banner off the reveal (found in pass, user item 4 symptom)
`CookieConsent` is `fixed bottom-4 z-50`; the reveal has no competing z-index, so the
banner covers the moment and buries the `z-40` watermark. Suppress the banner on
`/surprise/*` until the reveal reaches the CTA stage.

### 1.4 RevealChrome top-bar collision
Share/music pills overlap the "Made with TaDaaaa" link, leaving a garbled fragment at
narrow widths. Visible in every screenshot taken this session.

### 1.5 Creator preview must not record RSVP or answers (user item 5)
Views already skip the creator (`invite-view.ts:58`). RSVP and answers do not — neither
the routes nor the RPCs call `auth.uid()`.
- `/api/invite/rsvp` + `/api/invite/answer`: resolve the caller, compare to
  `creator_id`, short-circuit with `{ok:true, preview:true}`.
- Reveal UI reads `preview` and shows a "Preview - not recorded" chip.
- MIGRATION (needs explicit yes): drop the stale 3-arg `record_rsvp` overload; two
  same-named functions is how a route silently binds to the wrong one.
- DATA (needs explicit yes): purge existing self-preview rows. Live counts today are
  16 RSVPs / 30 answers across 13 invites, most of it self-preview.

### 1.6 Edit after publish (user item 5, second half — never built)
`src/actions/invite.ts` exports only create/finalize/delete/get. No update. No
`/invite/[id]` route. Spec W-C6 states "you can edit after publishing" and W-B1 gives
scheduled cards an EDIT action.
Build: `updateInvite` server action + wizard re-entry in edit mode + optimistic-lock on
`updated_at` so two tabs can't clobber each other.

### 1.7 Video — honest scoping (user item 1)
Not a repair. Findings: `video_status` is NULL on all 13 live invites — no render has
ever completed. Three structural blockers: `renderVideo()` is fire-and-forget after the
response returns (serverless freezes the instance); `bundle()` runs webpack at request
time against a source file absent from the serverless output; `@remotion/renderer` needs
Chromium + ffmpeg binaries Vercel's Node runtime doesn't have. No `maxDuration` set.
Decision: **make it work or make it honest.** Move the render to an explicitly
long-running path with `maxDuration`, `runtime = "nodejs"`, and a queue row; if the
render still cannot complete in this environment, the button reports "video is queued"
truthfully rather than spinning forever. Fix the dead `getPublicUrl`/`createSignedUrl`
mismatch either way.
**VidDay's actual feature — many guests each upload a video clip, stitched to a montage —
does not exist**: `contribute/upload` hard-rejects non-image MIME. Spec W-E1 asks for a
`+ VIDEO - 30S` tile, so guest video lands in Phase 6 as a real feature.

### 1.8 Collage — expose the templates (user item 2)
No Canva anywhere in the repo; collages are Satori-rendered. 12 templates exist
(`photos-1a`..`photos-9a` + `polaroid-scrapbook`) and the signature scrapbook renders
correctly when forced. Three real defects:
- `pickCollageTemplateForCount` uses `Math.random()`; both `photos-8a` and
  `polaroid-scrapbook` declare `photoCount: 8`, so the same invite yields a different
  collage per download. Proved: 4 identical requests -> 3,132,894 / 1,762,070 /
  1,762,070 / 1,762,070 bytes.
- `?template=` works on the route but **no UI sends it** — the user cannot pick the
  template they supplied.
- Free tier 403s into a locked tile that reads as dead.
Fix: deterministic default (prefer the signature template at its photo count), a template
picker in the UI, and a legible locked state.

Gate 1: browser screenshots of every one of 1.1-1.5 before/after at 390 and 1440;
full suite green; `record_rsvp` overload resolved; **Fable 5 adversarial review**.

---

## Phase 2 — App shell: top bar + left rail  [status: TODO]

Frames: W-B1, W-B2, W-D1, W-D2, W-D3, W-G1, W-H1, W-H2.
Skills: `hallmark` (structure first), `impeccable layout`, `ui-ux-pro-max`,
`frontend-design`, `a11y-architect`, `web-design-guidelines`.

- Top bar: wordmark left; activity bell with unread dot + avatar/name right.
- Left rail 280px: pinned coral **+ NEW SURPRISE** (the app's only shadow), then
  Dashboard / Themes / Activity(badge) / Account with coral-underline active state;
  plan card pinned to rail bottom.
- Reflow: 1024 -> 72px icon rail, grids drop a column. 768 -> rail folds into top bar
  behind a menu.
- Replace the existing `AppBar`; keep every current route reachable.
- Route map with redirects: `/templates` -> `/themes`, `/settings` -> `/account`,
  `/dashboard/analytics` -> `/surprise/[id]`. Old URLs 301, never 404.

Gate 2: shell screenshotted at 1440/1024/768 against W-B1/W-H1/W-H2; keyboard nav and
focus order verified; axe clean.

---

## Phase 3 — Dashboard, themes, states  [status: TODO]

Frames: W-B1, W-B2, W-G1, W-G2.
Skills: `hallmark`, `impeccable craft`, `taste-skill`, `emil-design-eng`, `tdd`.

- Dashboard: greeting + subline, 3 stat tiles (VIEWS/RSVPS/PENDING, pending in coral),
  resume-draft card with sand border, 3-up card grid with LIVE / OPENS SAT / EXPIRED
  chips, per-state action rows (SHARE·ANALYTICS·PREVIEW / EDIT·PREVIEW /
  REOPEN·EXPORT), dashed "+ NEW SURPRISE" tile, expired cards at .6.
- Themes browser: search, filter chips, 12 themes 4-up, Free/$4.99 pricing lines,
  PREMIUM badges, hover preview, "+ YOUR OWN PHOTO" tile.
  **Backend gap: there is no themes table with 12 rows and no per-theme pricing.**
  Build it — migration written into this doc before it runs.
- States (W-G2): skeletons at real content dimensions (pulse .5->1->.5 over 1.5s,
  stagger 100-300ms), offline banner that **pushes content down**, failed-upload queue
  with RETRY NOW, expired-link recipient page, first-run empty state.

Gate 3: every state forced and screenshotted; `REOPEN` / `EXTEND` actually mutate the DB.

---

## Phase 4 — The 6-step wizard with live preview  [status: TODO]

Frames: W-C1..W-C7, W-H3, W-H4. Biggest phase.
Skills: `superpowers:writing-plans`, `sp-test-driven-development`, `hallmark`,
`impeccable craft` + `typeset`, `taste-skill`, `emil-design-eng`, `backend-dev`,
`framer-motion`, `a11y-architect`.

Current wizard is 4 steps. Target is 6, full-screen takeover (no rail — you cannot tab
away mid-step), `STEP n OF 6`, 6-segment coral progress bar, 500ms-debounced autosave
with a "Saved" indicator, SAVE & CLOSE.

- **C1 Occasion** — 3x2 grid of six occasions with descriptions; "Not sure? Let AI pick".
- **C2 Content** — title, message with AI-draft + counter (156/500), photo strip with
  drag-reorder and click-to-caption, page-wide drop zone, video-message record (60s),
  background-music toggle.
- **C3 Contributors** — optional question with dodging-No note, contribute link + COPY +
  QR, **email invites**, inline approve/reject queue.
- **C4 Reveal style** — four styles play **in the preview pane** with the user's own
  title and photos; theme row with CHANGE.
- **C5 Schedule & lock** — Right away / Schedule it, real calendar, time, **timezone
  (theirs, recommended)**, **.ics email**, 4-digit PIN with hint.
- **C6 Review** — summary rows, paywall reworded for card payment (no "App Store"),
  "you can edit after publishing", PUBLISH & GET THE LINK.
- **C7 Published** — full-ink screen, link, COPY / EMAIL IT / DONE, large QR.
- **Live preview pane**: renders as you type, PHONE (default) / BROWSER toggle. At 1024
  it narrows; at 768 it collapses to the mobile "PEEK" pill.
- Draft persistence in localStorage as well as the DB, so an offline draft survives.

Backend: `updateInvite`, draft autosave endpoint, email-invite send, .ics generation,
PIN set/verify (hash, never plaintext), music asset handling, video-message upload.

Gate 4: all seven frames screenshotted side-by-side against W-C*; a full create ->
publish -> open runs end to end against the real DB; autosave proved by killing the tab
mid-step and resuming; **Fable 5** adversarial review of the paywall and PIN paths.

---

## Phase 5 — Detail + analytics, moderation, account  [status: TODO]

Frames: W-D1, W-D2, W-D3.
Skills: `backend-dev`, `hallmark`, `impeccable`, `data:build-dashboard`,
`security-review`, `a11y-architect`, `kw-data-statistical-analysis`.

- **D1** detail+analytics on one page: header with SHARE/QR/preview/edit, NEEDS YOU
  banner, 7-day views chart, funnel (Opened/Scrolled/Saw photos/RSVP'd), **geography**,
  EXPORT PDF, VIEWS/RSVPS/**AVG TIME** tiles, link panel with COPY, PIN lock toggle,
  accepting-contributions toggle, Duplicate / Extend / Export keepsake / Delete.
  Free tier sees two tiles and blurred panels behind "Unlock full analytics".
  **Backend gaps: scroll-depth events, dwell time, and country are not captured today.**
  Build the event pipeline; country from request geo, never from a stored IP.
- **D2** activity + moderation split view: queue left, full message right,
  **A approve / R reject / J,K next,prev** keyboard shortcuts, Mark all read, grouped
  NEEDS YOU / TODAY / EARLIER.
- **D3** account: profile, EMAIL ME WHEN toggles (3), privacy export JSON + delete with
  typed DELETE confirm, plan cards, **Stripe card form** (Elements — card data never
  touches our server), "Secured by Stripe - cancel anytime from this page".

Gate 5: analytics numbers recomputed from raw events and cross-checked against the DB by
hand; keyboard triage driven start-to-finish with no mouse; Stripe in test mode with a
real 4242 charge; **Fable 5** security review of payment + export + delete.

---

## Phase 6 — Reveals, contributor, entry  [status: TODO]

Frames: W-A0, W-A1, W-A2, W-E1, W-E2, W-F1..W-F10.
Skills: `hallmark`, `taste-skill`, `impeccable animate`, `emil-design-eng`,
`framer-motion`, `frontend-design`, `security-review`.

- **F1 PIN gate** — numeric keypad, hint line, rate-limited verify, spoiler-safe.
- **F2/F7 scroll story** — reactions bar (24/9/3/11), music pill; at 1440 the content
  column stays 720 and photo scenes pair side-by-side.
- **F3/F8 tap to reveal** — carries Phase 1's sequential photo reveal.
- **F4/F9 countdown** — 96px digits at desktop, NOTIFY ME BY EMAIL + ADD TO CALENDAR.
- **F5/F10 open-when letters** — **does not exist on web at all** (mobile has it).
  Sealed / Opened / time-locked states; desktop is list-beside-letter, letter the only
  light surface.
- **F6 RSVP** — No gives up after four dodges.
- **Reactions**: schema is live and rate-limit-verified but nothing calls it. Wire it.
- **E1/E2 contributor**: single narrow column at every width, name + message + photo +
  **video 30s** tiles, reassurance line above submit, then the submitted state with
  "MAKE YOUR OWN".
- **A0 landing / A1 sign-in split panel / A2 onboarding** — magic link, Apple, Google.
  Google OAuth is blocked on a Supabase redirect allow-list the user must set; the UI
  ships and reports the block honestly rather than failing silently.

Gate 6: all ten reveal frames screenshotted at 390 and at desktop; a real contributor
submission flows to a real moderation queue to a real reveal; PIN brute-force rate limit
proved by test.

---

## Phase 7 — Wire everything, harden, verify  [status: TODO]

Skills: `sp-verification-before-completion`, `security-review`,
`claude-code-security-review`, `webapp-testing`, `benchmark`, `qa`, `review`,
`simplify`, `impeccable audit`, `hallmark audit`, `gsd-code-review`, `codeburn`.

- Cron: expiry, purge, digest, monthly email all still fire. Nothing left disconnected.
- Every button hits a real endpoint. Grep sweep for dead handlers and orphan components.
- Alias-deletion sweep proving one source of truth.
- Full E2E: signup -> onboarding -> create 6 steps -> invite contributors -> moderate ->
  publish -> PIN -> reveal -> RSVP -> reactions -> analytics -> export -> expire -> reopen.
- Lighthouse a11y >= 0.96 on every route. CWV within the budget in `rules/ecc/web`.
- Adversarial self-review, then **Fable 5** final pass.
- `codeburn` for session cost.

Gate 7: full PES delivery report with a mandatory Known Gaps & Risks section.

---

## Migrations — REVISED after probing the live DB (do not trust the `sql/` files)

Probed `xrlmnlknymgakswsbawk` directly. **Three of the six originally-planned
migrations are unnecessary — the backend is already there and already has data.**
This materially shrinks Phase 6.

Already live, no migration needed:

| Table | Shape | Rows | RPCs |
|---|---|---|---|
| `letters` | id, invite_id, label, body, position, unlock_at, opened_at, created_at | 4 | `get_invite_letters`, `open_invite_letter` |
| `invite_reactions` | id, invite_id, emoji, created_at | 4 | `record_reaction`, `get_reaction_counts` |
| `notify_requests` | id, invite_id, email, created_at | 2 | `record_notify_request` |

`letters` carries exactly what W-F5/W-F10 draws: `unlock_at` gives "🔒 Unlocks 14 Oct",
`opened_at` gives "Opened 3 days ago", null-both gives "Sealed". `notify_requests` is
W-F4's "NOTIFY ME". **Open-when letters and reactions on web are UI-only work.**

Still genuinely needed (each needs an explicit yes):

1. Drop stale `record_rsvp(uuid, text, text)` 3-arg overload.
   ```sql
   drop function if exists public.record_rsvp(uuid, text, text);
   ```
2. ~~`themes` table~~ **WITHDRAWN.** 14 themes already live in `src/lib/themes.ts`, and
   `entitlements` already carries `theme_id text` + `kind`, so a per-theme purchase is
   already modelled. A `themes` table would be a second source of truth for static
   content. Decision: themes stay in code; extend the `Theme` type with
   `tier: "free" | "premium"`, `priceCents` and `occasion` for the W-B2 browser.
   Spec says "12 themes", code has 14 — reconcile in Phase 3 by tagging, not deleting.
3. `invite_events` for W-D1's funnel, dwell and geography. `invite_views` holds only
   `invite_id, viewed_at, user_agent` — no scroll depth, no dwell, no country, so
   "Scrolled 84% / Saw photos 71% / AVG TIME 1:42 / India 82 views" cannot be computed
   from anything we store today. Country must come from request geo at write time; do
   not store the IP.
4. Data, not schema: purge self-preview RSVP/answer rows.

5. **PIN + open-when letters is currently broken, found by reading the RPC.**
   `get_invite_letters(p_slug)` carries `and i.pin_hash is null` in its WHERE
   clause and has no PIN-aware sibling. A letters invite that is also PIN-locked
   therefore returns ZERO ROWS — the recipient sees an empty shelf, which reads
   as data loss, not as "enter the PIN". Every other reveal path has a PIN-aware
   variant (`open_invite_letter(uuid, text)`, `record_reaction(…, p_pin)`); this
   reader was missed.
   Needs a `get_invite_letters(p_slug, p_pin)` overload following the exact
   shape of the existing PIN checks (`v_hash <> crypt(p_pin, v_hash)` ->
   `pin_required`, `set search_path = public, extensions`).
   Until it lands, the web letters UI shows `PIN_LOCKED_LETTERS_GAP` — an honest
   "this one needs the PIN" — rather than an empty list. Verified in code, not
   yet reproduced live (no PIN-locked letters invite exists to test against).

   GOOD NEWS from the same read: the reader is **already spoiler-safe**. `body`
   comes back NULL while `unlock_at` is in the future, so a time-locked letter's
   text never reaches the browser and the lock cannot be picked from devtools.
   Do not "optimise" this by prefetching bodies.

### Overload audit — CORRECTED after reading the function bodies

Three RPCs exist as two same-named functions each. My first pass flagged all three as
split-brain from the name collision alone. **That was wrong** — two of them are
deliberate, correct wrappers, and dropping either half would have broken a working
feature. Bodies inspected 2026-08-17:

- `open_invite_letter(uuid)` — **KEEP.** Reads `invites.pin_hash`, returns
  `pin_required` when a PIN is set, otherwise delegates to `(uuid, text)` with a null
  pin. A PIN-locked letter cannot be opened through the short form.
- `record_reaction(text, text, text)` — **KEEP.** Delegates to the 4-arg form with a
  null pin; that form rejects `p_pin is null` whenever `pin_hash` is set. The gate is
  not bypassable.
- `record_rsvp(uuid, text, text)` — **genuinely stale**, superseded by the 4-arg form
  with `p_name`. This is the only drop.

Lesson for the rest of this build: a name collision is a prompt to read the body, not
evidence of a bug.

### Reaction vocabulary (learned from the live RPC, do not re-derive)

`record_reaction` accepts exactly `'heart' | 'laugh' | 'cry' | 'fire'` — tokens, not
raw emoji — is rate-limited to 60/hour per (slug, visitor), and is PIN-aware. Spec
W-F2 renders these as ❤️ 😂 😢 🔥 with counts. Phase 6 wires the existing RPC; it does
not invent a new one.

## Open decisions I am taking myself, per "use your own judgment"

- Old routes redirect rather than break. `/templates` and `/settings` keep working.
- Sequential photo reveal for `tap` and `countdown`; `scroll_story` keeps its wall.
- The signature collage template becomes the deterministic default at 8 photos.
- Video: fix the pipeline honestly; guest video upload is built as a new feature in
  Phase 6 rather than pretending the current renderer is VidDay.
- PINs hashed with pgcrypto (`search_path = public, extensions` — see traps).
- Stripe Elements, never raw card fields on our origin.
