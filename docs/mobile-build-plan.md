# TaDaaaa Mobile — build plan

**Source of truth:** `~/Downloads/design_handoff_tadaaaa_mobile/` — `CLAUDE_CODE_PROMPT.md`,
`README.md`, `TaDaaaa-Mobile-Design.html` (29 frame codes A1–F3), `tadaaaa-editorial.html`.
**Status:** plan only. No code written against it yet.

---

## 0. The finding that reshapes this plan

`CLAUDE_CODE_PROMPT.md` says, verbatim:

> the mobile spec's data model was derived from the web prototype's state object, not from
> the real production schema. If I give you access to the actual codebase, diff the two and
> tell me where they differ before you run any migration.

I have live DB access. Here is that diff. **The handoff's schema and production are not the
same product's schema — they barely overlap by name.**

### Entity renames (same concept, different name)

| Handoff | Production | Note |
|---|---|---|
| `surprises` | `invites` | The core entity. Different name, 27 columns live. |
| `surprises.owner` | `invites.creator_id` | |
| `surprises.occasion` | `invites.occasion_type` | |
| `surprises.reveal_style` | `invites.reveal_type` | **enum values differ**: handoff `'scroll'`, production `'scroll_story'` |
| `surprises.dodging_no` | `invites.enable_dodge_no` | |
| `surprises.contributions_open` | `invites.accept_contributions` | |
| `surprises.scheduled_at` | `invites.countdown_date` | |
| `surprises.timezone` | `invites.display_timezone` | added 2026-08-14 |
| `surprise_photos` | `invite_photos` | `position` → `sort_order`; production also has `rotation_deg` |
| `contributions` | `invite_contributions` | handoff `status` enum vs production `approved` boolean |
| `profiles.tier` | `profiles.subscription_tier` | |
| `profiles.onboarded` | `profiles.welcomed_at` | timestamp, not boolean |

### Structural mismatches — not renames, different shapes

- **`surprises.question` (one) vs `invite_questions` (many).** Production supports N questions
  with `yes_label`/`no_label`/`require_answer`/`attached_photo_index`. The handoff models a
  single question string. Production is richer; the design must bend, not the schema.
- **`reveal_events` (one table) vs four production tables** — `invite_views`, `invite_rsvps`,
  `invite_answers`, `invite_reactions`. Analytics (B5) must aggregate across four, not read one.
- **`surprise_videos` (1:N) vs `invites.video_*` columns (1:1).** Production has
  `video_status`/`video_storage_path`/`video_job_id` on the row, plus a real Remotion render
  pipeline the handoff doesn't know exists.
- **`themes` table vs `src/lib/themes.ts`.** Production themes are app-layer data, parity-locked
  byte-identical across web and mobile. No DB table, no `theme_id` FK.
- **`surprises.status` enum vs production's derived `status`.** Production computes lifecycle
  from `is_active` + `expires_at` + `deleted_at` via `deriveInviteStatus`, with a
  trigger-maintained `status` column nothing currently reads.

### Absent from production entirely

`pin` · `password` · `letters` · `notify_requests` · `themes` · `music_tracks` ·
`entitlements` · `push_tokens` · `recipient_name` · `from_name` · `published_at` ·
`profiles.occasions[]` · `profiles.biometric_lock`

### The decision this forces

Building "exactly as designed" against this database means one of:

- **A — Rename production to match the handoff.** Rejected. It breaks the live web app in
  ~60 files, and renaming/dropping violates the standing never-drop rule.
- **B — Adapter layer.** Mobile speaks the handoff's vocabulary; a mapping module translates
  to production tables. Additive migrations only, for the genuinely-absent things. **Recommended.**
- **C — Change the design to production's vocabulary.** Cheapest, but the prompt says don't
  redesign.

**B is the only option that satisfies "don't redesign" and "don't break current functionality"
simultaneously.** Everything below assumes B.

---

## Phases

Each phase ends with: gates green → runtime verification → Fable 5 adversarial pass → phase
report → **your go/no-go** → memory update. No commits at any point until you say so.

### Phase 0 — Reconcile (no UI)

- Write `src/lib/schema-adapter.ts`: the single place handoff names map to production tables.
  Nothing else in the app may reference a production column name directly.
- Answer the 5 open questions (below) — three of them block later phases.
- Draft every additive migration needed, in one confirm-gated batch.

**Gate:** adapter unit-tested both directions; zero production column names outside it.

### Phase 1 — Foundation ✅ PARTLY DONE

Tokens are done (2026-08-15): `sandInk`, `space`, `radii.card`, `touch`, `overlay`,
`revealScrim`, 10 `type` roles, `shadows.fab`. Verified against the handoff table.

Remaining: the component kit — Button, Field, Chip, Card, Toggle, StatusPill, ProgressBar,
StatTile, SurpriseRow, PhotoGrid, Sheet, Toast. Existing `components/editorial/chrome.tsx`
covers roughly half under different names; reconcile rather than duplicate.

**Checkpoint the prompt demands:** show the kit rendered on one screen before continuing.

### Phase 2 — Data layer + security boundary

- Additive migrations: `pin`, `password` (hashed), `letters`, `notify_requests`,
  `push_tokens`, `entitlements`, `profiles.occasions[]`, `profiles.biometric_lock`.
- `get-reveal` Edge Function — slug → payload, `status='live'`, `now() < expires_at`, PIN
  verify, approved contributions only.
- **Already done 2026-08-14:** the anon read lockdown. `invites`/`invite_questions`/
  `invite_photos`/`invite_contributions` are no longer readable by `anon`; five SECURITY
  DEFINER readers exist. The handoff's "never expose `surprises` to anon" requirement is
  already satisfied — `get-reveal` extends it rather than replacing it.

**Gate:** anon probe returns `[]` on every table; reveal works anonymously; PIN verified
server-side only.

### Phase 3 — Auth + onboarding (A1–A4)

A1 welcome carousel (buttons pinned, never move), A2 segmented sign-in/up with the 5-segment
strength meter, A3 two-step onboarding, A4 pre-permission screen.

**Blocked:** Google OAuth is broken until the Supabase redirect allow-list is fixed — dashboard-only.

**Gate:** all four render; permission dialog fires only after the affirmative tap.

### Phase 4 — Shell (B1, B2, B3, B6)

Tab bar + centre FAB (Create is not a tab), Home with stat strip / resume-draft card /
FlashList + skeletons, surprise detail, themes grid, You.

### Phase 5 — Wizard (C1–C7) — the heart, budget accordingly

Six steps, 6-segment progress, footer pinned above keyboard, 500ms debounced MMKV autosave,
Peek sheet. C7 published screen with a locally-generated QR.

**Checkpoint the prompt demands:** show the whole wizard flow before continuing.

### Phase 6 — Reveals (D1–D7)

D1 PIN gate (custom 72px keypad, 3-strike 30s cooldown) · D2 scroll story (snap sections,
reaction bar, music pill) · D3 tap · D4 countdown (**absolute timestamp, re-derived on
foreground**) · D5 letters · D6 RSVP + dodging No (**stops after 4 dodges**, off under Reduce
Motion / screen reader) · D7 waiting room.

Must render in a browser too — recipients have no app.

### Phase 7 — Contributor (E1, E2) + moderation (B4)

### Phase 8 — Native surfaces

Push (5 categories, Approve/Reject from long-press), share sheet, contacts batch SMS,
calendar, Face ID on second launch.

### Phase 9 — Purchases

StoreKit 2 / Play Billing. Receipts verified in an Edge Function, never client-trusted.
**Conflicts with production:** web currently sells through Stripe. Two payment systems on one
`is_paid` column needs a decision.

### Phase 10 — Analytics (B5) + F1 + F2 + F3

B5 must aggregate across the four production event tables. F1 Live Activity + widget is the
largest native lift and needs a dev client — it cannot run in Expo Go.

---

## Open questions — the prompt says flag, don't invent

1. **API in front of Supabase?** Production answer: *partly*. A Next.js BFF already owns
   secret-key routes (AI draft, Stripe, moderation, collage, video). Mobile talks direct for
   CRUD. Confirm this stays.
2. **Theme artwork licensing** — blocks B3 shipping real art.
3. **Is "AI draft it" real?** Production answer: *yes* — `ai_drafts` table + `ANTHROPIC_API_KEY`
   behind the BFF. Confirm mobile may call it.
4. **Music licensing** — blocks C2's music toggle and D2's music pill.
5. **Free-tier watermark design** — absent from both prototypes; blocks the tier gate.

Plus two I'm adding:

6. **Stripe vs StoreKit.** Apple will reject a card form; production sells via Stripe today.
   Does mobile use StoreKit with a server-side reconcile onto the same entitlement?
7. **`scroll` vs `scroll_story`.** The adapter can absorb it. Confirm production's value wins.

---

## What I will not claim

This is a 10-phase native app on top of a schema that doesn't match its spec. It is not a
one-session build, and I won't report it as done until each phase has passed its own gates
with pasted evidence. Partial delivery gets labelled as partial, every time.

## Standing constraints carried in

No commits until told · no migration without shown SQL and an explicit yes · evidence rule
· screenshot things myself · extend existing gates, never delete them · web + mobile parity
gate asserts exact token key-set equality across repos.
