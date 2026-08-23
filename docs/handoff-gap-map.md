# TaDaaaa Mobile — handoff gap map

**Source:** Claude Design project `eaa96c7b-04c4-4e4a-bf4c-f238e5809fe9`, file
`TaDaaaa Mobile.dc.html` (29 frames, A1–F3) + its README spec.
Local copy: `tadaaaa/design-handoff/TaDaaaa-Mobile.dc.html`.

**Date:** 2026-08-15. Status of every frame against the app as it stands.

## Legend

- **DONE** — implemented and matches the handoff.
- **PARTIAL** — a screen exists and works, but does not yet match the frame.
- **MISSING** — no code exists.

---

## Foundation (handoff build-order step 1)

| Item | Status | Notes |
|---|---|---|
| Colour primitives | **DONE** | `ink/paper/stone/pebble/mist/coral/sand` already matched the handoff byte-for-byte before this session. |
| `sandInk` | **DONE** | Added both repos. Handoff specifies `#8A6F5C`; shipped `#836855` — see "Deviations". |
| Spacing scale 4/8/10/14/18/22/26/34/44 | **DONE** | New `space` export. `spacing` (4/8/12/16/20/28) kept for existing screens. |
| Radii sm6 / md12 / pill100 / **card18** | **DONE** | `card` added. |
| Touch targets (44 floor, 52 control, 38–44 chip, 72 PIN) | **DONE** | `touch` export. |
| Ink overlays + reveal scrim | **DONE** | `overlay`, `revealScrim`. |
| Type role scale (10 roles) | **DONE** | `type` export, all `em` resolved to absolute RN values. |
| FAB shadow (the only sanctioned shadow) | **DONE** | `shadows.fab`, coral-tinted. |
| Component kit (Button, Field, Chip, Card, Toggle, StatTile, StatusPill, SurpriseRow, ProgressBar, PhotoGrid, Sheet, Toast) | **PARTIAL** | `components/editorial/chrome.tsx` covers Pill/ListRow/Stat/Chip/SetRow/Switch/IconButton/Empty/Hairline. Missing as named primitives: Field, ProgressBar, PhotoGrid, Sheet, StatTile. |

## A — Auth & onboarding

| Frame | Status | Gap |
|---|---|---|
| A1 Welcome | **DONE** 2026-08-17 | `(auth)/welcome.tsx` — three swipeable panes, the frame's own 2-stop scrim, 22×4 active pager pill, and the auth buttons rendered ONCE below the pager so they cannot move between panes. Now the signed-out landing route. Apple button hidden (see Deviations); Google is the existing OAuth, still blocked on the Supabase redirect allow-list. |
| A2 Email sign-in / sign-up | **DONE** 2026-08-17 | The segmented pebble tray and the focus ring already existed in `AuthShell` / `EdField`; what was missing is now built. Added: the back-chevron + "ACCOUNT" header row · a 300ms ±5px error shake on `EdField`, fired on the TRANSITION into an error so a field does not shake every keystroke · `AuthExtras.tsx` — "Email me a magic link instead →", "Forgot password? Reset it" (`resetPassword` added to AuthProvider), the `or` divider and the Apple/Google pills SIDE BY SIDE, all now BELOW the primary button as the frame orders them · the second-launch Face ID sheet (`lib/face-id-offer.ts` +6 tests, `FaceIdOfferSheet.tsx`, mounted on the tab shell). The shipped screens had Google and the divider ABOVE the fields and a magic-link MODE TOGGLE; both are gone. |
| A3 Onboarding celebrate | **DONE** 2026-08-17 | `(onboarding)/celebrate.tsx` + `who.tsx` behind `OnboardingChrome` (26×3 bars, live Skip on every step). `lib/onboarding.ts` (+17 tests) owns the chips, the "All of it" shortcut and the mapping to `profiles.occasions[]` — the pseudo-id is never persisted. Both steps write in ONE update on step 2, so abandoning between them cannot half-save. |
| A4 Notification pre-permission | **DONE** 2026-08-17 | `(onboarding)/notifications.tsx` — pebble ground, 64px mark, the three-type paper card with coral/sand dots. The OS dialog is inside the coral handler and nowhere earlier. `welcomed_at` is stamped on BOTH paths, including "Not now" — declining the ask is not the same as not having been onboarded. |

## B — Shell

| Frame | Status | Gap |
|---|---|---|
| B1 Home | **PARTIAL** | This row was STALE: the resume-draft card and pull-to-refresh both shipped, and skeleton rows landed with F3 on 2026-08-17. Genuinely still missing: swipe-left row actions and FlashList. |
| B2 Surprise detail | **DONE** 2026-08-17 | Rebuilt to frame: 290px `PhotoHeader`, 48px `CircleAction` row (QR / preview / edit), `ModerationCard`, 3-up `StatTile`, 46×26 `Toggle` settings, `···` ActionSheet (Duplicate / Extend / Export keepsake / Copy / Delete). Header art falls back to the creator's first photo then the theme gradient — theme licensing is still unanswered. |
| B3 Themes | **DONE** 2026-08-17 | New `(tabs)/themes.tsx` to frame: pebble search field, single chip row, result count, 2-up grid at a 14px gutter, PREMIUM pill, dashed "+ Your own photo" last cell. `/templates` kept as the deep-link marketplace. Preview at `app/theme/[id].tsx` — shows the reveal's OPENING FRAME, not the running reveal (gap). Cards use theme gradients; no licensed art. |
| B4 Activity + moderation | **DONE** 2026-08-17 | Rebuilt to frame: title + coral "Mark all read", the coral-bordered moderation card at the TOP wired to `moderate_contribution`, Today/Earlier grouping, 8px coral unread dots. Read state is LOCAL (`lib/activity-read.ts`, +17 tests) — no `read_at` exists and a column purely so a dot can grey out is a lot of schema for a dot. Push long-press actions still MISSING (F1). |
| B5 Analytics | **DONE** 2026-08-17 | `app/analytics/[id].tsx` + `components/handoff/AnalyticsPanels.tsx`, reached from B2's stat row. One owner-only SECURITY DEFINER aggregate, `get_invite_analytics`, because `invite_answers` has no `invite_id`, a client-side histogram would need every view row, and the tier gate must be server-side — a free caller never receives the panel data, so the blur covers empty placeholders. Deviations forced by the schema: tile 2 is "This week" not "Avg time" (no duration is recorded anywhere); panel 3 is "What they opened it on" not "Where from" (no IP/region/country column exists — web's own analytics page omits both for the same reason); the funnel is three rows not four ("Scrolled"/"Saw photos" need `reveal_events`, which does not exist). Header ↑ exports a real PDF via `expo-print` + `expo-sharing`. |
| B6 You | **DONE** 2026-08-17 | Rebuilt to frame: 60px avatar row + Edit pill, ink plan card (`plan-card.ts`), Notifications ×3 and Privacy groups on the 46×26 `Toggle`, Face ID via `lib/biometrics.ts` (probes hardware AND enrolment, authenticates BEFORE persisting), type-DELETE `DeleteAccountSheet` (a Sheet, not `Alert.prompt`, which is iOS-only), export to the share sheet. |

## C — Create wizard

| Frame | Status | Gap |
|---|---|---|
| C1 Occasion | **DONE** 2026-08-17 | `steps/OccasionPicker.tsx` — six rows, Lucide icons at 1.4px, descriptions verbatim, 2px coral selection with padding −1, AI vibe sheet that REORDERS (never auto-selects). |
| C2 Content | **DONE** 2026-08-17 | `steps/ContentStep.tsx` + `steps/PhotoStrip.tsx` — title/message with 500 counter, AI-draft tone sheet, 78×96 thumbs with 20px ✕, caption sheet, 1200px/q0.8 on-device resize, 60s front-camera video row. Reorder is Move left/right, not drag (see Deviations). Music row is DISABLED — licensing unanswered. |
| C3 Contributors | **DONE** 2026-08-17 | `steps/ContributorsStep.tsx` — question field, both toggles, pebble link block with Invite from contacts / Share / QR / Copy, pending cards with Reject/Approve wired to `moderate_contribution`. Contacts is real; the send opens ONE pre-filled system composer (no platform allows silent batch SMS). Pending list is empty during creation by definition — a draft has no contributions. |
| C4 Reveal style | **DONE** 2026-08-17 | `steps/RevealStyleStep.tsx` — all four tiles with ANIMATED ink previews (bobbing ↓, pulsing gift, a countdown ticking off a real absolute timestamp, letter bars), theme row with Change. Every animation stops under Reduce Motion. Full-screen demo per tile is NOT built (see Deviations). |
| C5 Schedule & lock | **DONE** 2026-08-17 | `steps/ScheduleLockStep.tsx` — three radios, a real native picker (iOS inline spinner, Android two-stage dialog), timezone sheet defaulting to Theirs, calendar toggle that requests permission AT THE TAP, four 62px PIN boxes with the weak-PIN warning and a hint field. Optional password field NOT built — `password_hash` exists but nothing hashes it. |
| C6 Preview & publish | **DONE** 2026-08-17 | `steps/PreviewPublishStep.tsx` — 112×200 mini reveal, Play full preview, the content line (`publish-summary.ts`), the four-row summary table, the paywall (premium theme + free tier only), determinate publish progress. |
| C7 Published | **DONE** 2026-08-17 | `app/create/published.tsx` — full ink screen, locally-generated 196px QR card, monospace sand URL, Share / Copy / Save QR / Done, one-shot confetti skipped under Reduce Motion. |
| Wizard chrome | **DONE** 2026-08-17 | `components/create/WizardChrome.tsx` — ✕/‹, STEP n OF 6, Save/Peek right slot, 6-segment progress, footer pinned above the keyboard, 500ms debounced autosave with the 1.2s "Saved" flash, ✕ action sheet (Save draft / Discard), Peek sheet. |

## D — Reveal

| Frame | Status | Gap |
|---|---|---|
| D1 PIN gate | **DONE** 2026-08-17 | Custom 72px keypad, 3-strike 30s cooldown, and — since the `pin_gates_reveal_content_server_side` migration — a PIN that actually gates content. The five reveal readers withhold a PIN-locked invite entirely; `get_invite_reveal(slug, pin)` serves the unlocked path in one round trip. Before that fix the gate was client-side only: one anon curl returned title, message, questions, photos and letters. |
| D2 Scroll story | **DONE** 2026-08-17 | Snap sections now use MEASURED scene offsets (`snapToOffsets` + `decelerationRate:"fast"` + `disableIntervalMomentum`) — `sceneBoundaries` is explicitly a haptic approximation, so snapping to it would have stopped mid-scene. Reaction bar built (`lib/reactions.ts` +13 tests, `ReactionBar.tsx`): scale 1.35 on press then a 170px/1.7s float, both dropped under Reduce Motion. **Music pill NOT built** — licensing unanswered and there is no `music_tracks` table, so a named track would be a fiction; the existing mute toggle stays. |
| D3 Tap to reveal | **DONE** | `TapClosed.tsx`; gradient bug already fixed. |
| D4 Countdown | **DONE** 2026-08-17 | Absolute-timestamp drive CONFIRMED — every tick recomputes from the target, nothing accumulates — plus an AppState listener so the digits re-derive the instant the app foregrounds instead of showing a stale second. Offer card built (`LiveActivityOffer.tsx`). **ActivityKit itself is blocked**: `expo-live-activity` is not installed and cannot run in Expo Go at all (it needs a dev build with a Widget Extension), so the card ships the handoff's own degrade path — email capture into `notify_requests` — and says so instead of offering a button that does nothing. |
| D5 Open-when letters | **DONE** | This row was STALE. The `letters` table exists, `lib/letters.ts` + `LettersReveal.tsx` ship, and all four row states were **seen rendered** on 2026-08-17 (two opened, one date-locked with its padlock, one unopened with its chevron). |
| D6 RSVP + dodging No | **DONE** 2026-08-17 | `lib/dodging-no.ts` (+16 tests) owns all four rules; `RevealOpen`'s QuestionBlock only animates what it returns. **The previous implementation made the No UN-DECLINABLE** — `onPress` recorded a No only when dodging was OFF, so with the toggle on the button never answered, forever. It also used `Math.random()` (could land in place), never clamped (could leave the row or sit on Yes), had no dodge limit and no screen-reader check. Now: `onPressIn` dodge, five deterministic offsets, clamped off Yes and inside the row, stops after four, and does not dodge at all under Reduce Motion or a screen reader. |
| D7 Waiting room | **DONE** | This row was STALE. `WaitingRoom.tsx` ships and was **seen rendered** on 2026-08-17 behind D1's PIN gate: live D/H/M countdown and the `notify_requests` email capture. |

## E — Contributor (web target)

| Frame | Status | Gap |
|---|---|---|
| E1 Contributor form | **DONE** 2026-08-17 | `app/add/[slug].tsx` — the handoff's own path, a web target first. Name required with the 300ms ±5px shake, 300-char message + counter, the moderation-promise line above the coral submit. New `get_contribute_meta(slug)` reader releases the title ONLY while the surprise is open and unlocked. No fake browser chrome (see Deviations). Photo/video tiles disabled — anonymous binary upload has no path. Web's `/contribute/[slug]` still exists; the two now overlap. |
| E2 Submitted | **DONE** 2026-08-17 | Same route, second state: confetti (skipped under Reduce Motion), 56px sand check circle, 28px serif italic "That's in, <name>.", then ONE install nudge in a pebble card — after the good feeling, never before. |

## F — Native surfaces & edge states

| Frame | Status | Gap |
|---|---|---|
| F1 Live Activity / push / widget | **PARTIAL** 2026-08-17 | BUILT: the five categories with the handoff's identifiers, Approve/Reject actions that resolve WITHOUT foregrounding the app, payload→route mapping that refuses a malformed id, and `SCHEDULED_LIVE` scheduled LOCALLY from the creator's own countdown dates so at least one category genuinely fires (`lib/push-categories.ts`, +18 tests). Also fixed: `claim_push_token` never existed, so mobile push-token registration had been dead the whole time while logging a warning about a migration that was already applied. NOT BUILDABLE HERE: the ActivityKit Live Activity and the medium widget both need a development build with a Widget Extension target and cannot run in Expo Go at all. NOT WIRED ANYWHERE: nothing on the backend SENDS the four remote categories — web notifies by email through its cron routes. |
| F2 Empty state | **DONE** 2026-08-17 | `FirstRunEmpty` in `components/handoff/EdgeStates.tsx`, rendered by B1 when the creator owns nothing. 150×190 dashed pebble card, 38px sand ring, "YOUR FIRST ONE", 28px serif "Who deserves a surprise?", the time-cost sentence verbatim, coral "Start one" and "Or browse themes first". The stat strip and list heading are dropped, as the frame drops them. **Seen rendered.** |
| F3 Loading / offline / failure / expired | **DONE** 2026-08-17 | All four. Offline banner is a flow sibling ABOVE the navigator so it pushes content down (verified in a browser: the wizard header moves 87px); it carries F3's full "your draft is saved on this phone" sentence only inside the wizard, where that is true, and a shorter true line elsewhere. Skeletons at real content dimensions, `opacity .5→1→.5` over 1.5s with a 120ms stagger, dropped under Reduce Motion — now on B1, B2 and B5, replacing two spinners and the word "Loading…". Failed-upload card + a real AsyncStorage queue (`lib/upload-queue.ts`, +7 tests): publish used to set a flag and DISCARD the resized file, so the toast asked the creator to redo work the app had thrown away. Expired keeps web's three distinct states rather than the frame's single "This surprise has closed" — see Deviations. |

---

## Deviations from the handoff — deliberate, with reasons

1. **`sandInk` ships as `#836855`, not the specified `#8A6F5C`.** Measured: the
   spec value is 4.62:1 on paper (passes) but **4.12:1 on pebble** (fails AA),
   and pebble is a primary ground — section fills, cards, search fields, muted
   rows. Darkened 7 per channel → 5.11:1 paper, 4.56:1 pebble. Same correction
   this repo already applied to `success` (#2E7D4F → #2C784C) for the same
   reason. This is the fourth time the design source has lost to contrast here.

2. **`spacing` was not repointed to the handoff scale.** The handoff scale
   (4/8/10/14/18/22/26/34/44) ships as a new `space` export. Repointing the
   existing `spacing` (4/8/12/16/20/28) would silently shift every screen
   already built against it — that is a re-layout, not a token change.

3. **Coral text ships as `derived.coralDeep` (#B8412F), not `#D45847`.** The
   frames set B2's "Review", B6's "Delete account" row and chevron, B3's price
   cell and the sheet's destructive label in plain coral at 11-16px. Measured on
   paper #FFFEFD, plain coral is **3.94:1** — below the 4.5:1 AA floor for
   normal text, and 12-16px bold is not WCAG "large text" (that starts at
   18.66px bold). `coralDeep` measures 5.43:1. Fifth time the design source has
   lost to contrast here.

4. **No theme photography anywhere.** B2's header, B3's cards and B3's preview
   all show licensed Unsplash images in the frames. Handoff open question #2 is
   unanswered, so: B2 uses the creator's own first photo when there is one and
   the theme gradient otherwise; B3 uses the theme gradient plus its glyph. When
   licensing lands only the image source changes, not the layout.

5. **B6's notification labels are the frame's, which diverges from web.** Web's
   settings page keeps its longer copy ("Someone views your surprise"); B6 ships
   "When someone views" as the frame specifies. `cross-platform-parity.test.ts`
   now asserts BOTH sets and that mobile still pairs every toggle with a sub —
   the defect it was originally written for.

6. **B3's theme preview shows the reveal's opening frame, not the reveal.** The
   frame note says it "plays the reveal style with sample content". Mounting the
   real renderers needs fixture photos and a fixture invite id, which is C-phase
   work.

7. **C2 requires no photo and sets no minimum message length.** Web's step 2
   demands at least one photo and ten characters; the handoff's validation table
   is "Title required; message ≤ 500; caption ≤ 200" and nothing else. Mobile now
   follows its own spec, so a surprise published from the phone can be a title
   and one line — something web cannot currently produce. This is a PRODUCT
   decision, not a copy drift, and `cross-platform-parity.test.ts` records it
   explicitly rather than asserting it away.

8. **C2 reorders photos with Move left / Move right, not a drag gesture.** The
   frame says "Drag to reorder". A drag-to-reorder strip needs its own
   gesture-handler + Reanimated rig, and drag is unusable under VoiceOver and
   Switch Control — the buttons would have had to exist regardless. The hint
   line says what actually works.

9. **C4's tiles do not open a full-screen demo.** The frame's note says tapping
   one "opens a full-screen demo with the user's own title and first photo
   already in it". Tapping selects the style and the tile preview animates in
   place; the demo needs the real reveal renderers mounted against a fixture
   invite id, which is D-phase work. `Peek` on C2-C3 and "Play full preview" on
   C6 open the mini preview instead.

10. **C5 has no optional password field.** `invites.password_hash` exists and
    nothing hashes it — there is no `set_invite_password` counterpart to
    `set_invite_pin`. Shipping a field that writes nowhere would be worse than
    the gap.

11. **C6's paywall says "Opens a secure Stripe checkout", not "Charged to your
    App Store account".** The handoff mandates StoreKit 2; production sells
    through Stripe Checkout in an in-app browser (`api.ts → createStripeCheckout`,
    commented "no Apple cut") and that decision predates this build. The card
    says what actually happens. **Apple is likely to reject this** — see Known
    Gaps.

12. **D2 has no music pill.** The frame shows "♪ First Light". Music licensing
    is open question #4, there is no `music_tracks` table, and no audio is
    licensed for distribution — a named track in the UI would be a fiction. The
    scroll story's existing mute/unmute toggle stays.

13. **D4 offers "Notify me", not a Live Activity.** ActivityKit needs
    `expo-live-activity` plus a development build with a Widget Extension;
    neither exists. `liveActivityAvailable()` returns false and the card falls
    back to the handoff's own documented degrade path. That function is the
    only thing that changes when it lands.

14. **B4 drops the per-surprise grouping and the filter chips.** The
    pre-handoff Activity grouped by surprise and offered views/RSVPs/answers
    chips; frame B4 is one recency list with a moderation card on top. Both are
    gone to match it. Per-surprise history is still reachable — every row
    deep-links, and B2 carries that surprise's own numbers.

15. **B4's read state is local to the device.** There is no `read_at` column and
    no notifications table. "Mark all read" stores one timestamp in
    AsyncStorage. Cost: read state does not follow you to a second phone.

16. **E1 draws no fake browser chrome.** The frame's 34px pebble URL bar exists
    to say "this is a web page". Drawing one would put a picture of a browser
    inside a browser; the real one supplies it.

17. **E1 accepts words only.** The frame offers Photo and Video tiles. Every
    signed-upload route on the BFF is bearer-authed and a contributor has no
    account by design, so there is no anonymous binary path.
    `submit_contribution` already accepts a `photo_url` for the day there is.

18. **E1 duplicates web's `/contribute/[slug]`.** The handoff routes the
    contributor form at `add/[slug]` in the Expo tree; web already ships its own
    at `/contribute/[slug]`. Both now exist and neither is wrong — which one is
    canonical is a product decision, not a build one.

19. **A1 hides "Continue with Apple".** Apple Sign In needs
    `expo-apple-authentication`, a paid Apple developer account and an
    entitlement, and cannot run in Expo Go at all. `appleSignInAvailable()`
    returns false and the button is not rendered — a sign-in button that cannot
    sign anyone in is worse than three-quarters of a frame. That function is the
    only thing that changes when the account exists.

20. **A1 uses theme gradients, not photography** — the same unanswered
    licensing question as B2/B3, under the frame's own scrim.

21. **A2 was NOT rebuilt.** It is the one A-frame still carrying its
    pre-handoff design.

22. **A2's Apple pill is disabled-with-a-reason, not hidden** — unlike A1,
    where it is omitted. The frame draws two pills side by side and one lonely
    Google pill at half width reads as a layout bug; a greyed pill that says why
    reads as a fact.

23. **The reset-password line is deliberately identical whether or not the
    address has an account.** A different message there is an
    account-existence oracle.

## Blocked on schema

`pin`, `password`, `letters`, `notify_requests`, `reveal_events`, `themes`,
`music_tracks`, `entitlements`, `push_tokens` do not exist. The handoff's data
model is substantially larger than the live database. Each needs a shown-SQL
confirm gate before anything depends on it.

## Not startable without product decisions

- Theme artwork licensing (prototypes use Unsplash placeholders).
- Music library licensing for in-app playback.
- Whether "AI draft it" / "AI pick a theme" are real, and behind which endpoint.
- Free-tier watermark design — absent from both prototypes.

These are the handoff's own open questions, restated because they block C2, C4
and B3 respectively.

---

## 2026-08-17 — close-out: the frames were finally SEEN

`xcrun simctl` is still missing on this Mac. The way round it is
**`npx expo export --platform web`** into a static bundle, served with a
SPA-fallback server and driven in a real browser. That works, and it is how
every screenshot below was taken. Anyone reviewing this app should do the same
rather than waiting for a simulator:

```bash
npx expo export --platform web --output-dir /tmp/expo-web && node spa-server.js
```

**Seen rendered — 28 of 29:** A1 A2 A3 A4 · B1 B2 B3 B4 B5 (full + free-tier)
B6 · C1 C2 C3 C4 C5 C6 C7 · D1 D2 D3 D4 D5 D6 D7 · E1 E2 · F2 F3 (skeletons,
offline banner, failed-upload card, unavailable card).
**Not seen:** F1 only — it is a Lock Screen and cannot render in any browser.

### What the second pass (C2–C7, D3, D4, D6, E2) added

Two more defects, and one thing that is NOT a defect:

7. **Frame D4 was unreachable.** `CountdownClosed` renders only when
   `state === "locked" && reveal_type === "countdown" && countdown_date`, but
   the D7 waiting-room branch above it intercepted ANY future
   `countdown_date` on a non-scroll_story invite. So a countdown reveal always
   showed the holding page, and `CountdownClosed` could only be reached with a
   target already in the past — which fires `onReachZero` on its first tick.
   D4 rendered for the first time ever after excluding `countdown` from D7.
8. **The wizard let you publish a countdown with nothing to count down to.**
   Pick Countdown at C4, "Right away" at C5, and C6 cheerfully summarised
   "Reveal: Countdown · Delivery: Right away". That writes
   `countdown_date = null`, and the reveal screen then falls through to a TAP
   reveal. The creator picks one thing and the recipient gets another. Web
   validates this; mobile had no check anywhere. Now blocked at C5 for both
   `countdown` and `scroll` (+4 tests).

9. **D4 had been built from the wrong drawing.** `CountdownClosed` was
   written against the editorial HTML mockup (`bCd`), not frame D4: one
   unbroken `DD:HH:MM:SS` run, NO unit labels, and a serif-italic
   "Something's coming" *under* the digits. Frame D4 is a sand
   "SOMETHING IS COMING" micro-label ABOVE, 62px digits, and
   **Hours / Mins / Secs beneath**. Rebuilt to the frame: one Text per group so
   each label sits under its own number (a single run with a separate label row
   cannot align — the groups are two glyphs and the separators one). A Days
   group appears, labelled, only when there is more than a day left; the frame
   is drawn for a target hours away and has no day field. `lib/countdown.ts`,
   +9 tests. Also carries the spoken form, so VoiceOver stops reading
   "zero two colon zero three colon". The frame's 26px serif paper headline
   between the clock and the message is wired too — `CountdownClosed` never
   received `title`, so that line had simply never existed. Required prop, not
   optional: there is one call site, and an optional prop nobody passes is how
   it went missing.

**NOT a defect — dodging No on the web target.** `react-native-web`'s
`AccessibilityInfo.isScreenReaderEnabled()` is hard-coded to `resolve(true)`,
so `shouldDodge` always returns false in a browser and the No is immediately
answerable. That is the spec-correct behaviour for a screen-reader user; it
just means **dodging-No cannot be verified from the web export at all** and
needs a device.

### Six bugs that only a rendered screen could have found

1. **Eleven call sites detached `supabase.rpc` from its receiver.** `rpc()` is
   `return this.rest.rpc(...)`, so `const call = supabase.rpc` throws
   `TypeError: Cannot read properties of undefined (reading 'rest')` on every
   call. Between them those eleven carried the whole reveal, the PIN gate, the
   letters, the reaction bar, the moderation queue and the contributor form.
   All dead, on both platforms. `tsc` could not see it (hidden behind
   `as unknown as`), jest could not (every suite here is pure logic), and the
   live PostgREST probes could not (curl never goes through the client).
   Fixed with `.bind(supabase)` + a gate: `lib/__tests__/rpc-receiver.test.ts`.
2. **The D1 PIN gate rendered "This surprise doesn't exist".** Its branch sat
   BELOW `if (state === "notfound" || !data)`, and the
   `pin_gates_reveal_content_server_side` migration is exactly what made `data`
   null while the keypad is up. Moved above the guard.
3. **The PIN could never be accepted.** `PinGate`'s submit effect called
   `setChecking(true)` and listed `checking` in its own dependency array, so the
   re-render ran the cleanup and discarded `verifyPin`'s answer every time. Four
   dots, then nothing, forever. The guard is a ref now.
4. **B2 hung on its loading state for the OS connect timeout** whenever
   `EXPO_PUBLIC_API_BASE_URL` was stale — which it is by design in development,
   because it is baked to a LAN IP. Every backend call is time-boxed now
   (8s GET / 30s POST) and the header photo loads in a second, un-awaited phase.
5. **B3's filter chips rendered clipped through their descenders** — the
   horizontal ScrollView had `flexGrow: 0` but not `flexShrink: 0`.
6. **Mobile never wrote `invite_views`**, so B5's chart would have been
   permanently empty for phone traffic, and it counted the creator's own
   previews, which web has always skipped. New `log_invite_open` does both
   correctly for every client.
