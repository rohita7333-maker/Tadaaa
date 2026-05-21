---
name: TaDaaaa MomentAsk Merge — What Was Built
description: Full record of features merged from MomentAsk into TaDaaaa (surprise-invite), DB schema changes, and project structure
type: project
---

Decision: merged MomentAsk features INTO TaDaaaa (`tadaaaa/surprise-invite/`). MomentAsk (`moment-ask/`) remains as reference but TaDaaaa is the live project.

**Why:** User didn't want to maintain two projects. TaDaaaa has unique features (6 themes with particles, Stripe, landing page, expiry, countdown) worth keeping; MomentAsk had better UX features (polaroid captions, occasions, dodge button, canvas-confetti, custom yes/no labels).

**How to apply:** When user asks about the project, TaDaaaa is the primary one. MomentAsk is dead — do not suggest changes there.

---

## DB Changes (run on shared Supabase project)

```sql
alter table invites
  add column if not exists occasion_type text not null default 'custom',
  add column if not exists enable_dodge_no boolean default true,
  add column if not exists response_count int default 0;
alter table invite_photos
  add column if not exists caption text not null default '',
  add column if not exists rotation_deg float default 0
    constraint rotation_range check (rotation_deg between -8 and 8);
alter table invite_questions
  add column if not exists yes_label text not null default 'Yes',
  add column if not exists no_label text not null default 'No';
alter table invite_answers
  add column if not exists ip_hash text;
```

Storage: `invite-photos` bucket (existing, TaDaaaa). `moment-photos` is MomentAsk-only.

---

## Files Modified in TaDaaaa

### New Dependencies (already installed)
- `canvas-confetti` + `@types/canvas-confetti`
- Caveat font via `next/font/google`

### `src/app/layout.tsx`
- Added Caveat font import + CSS variable `--font-caveat`

### `src/app/globals.css`
- Added: `.polaroid-frame`, `.polaroid-caption`, `.dodge-btn`, `.pop-in`, `pulse-glow`
- `--font-caveat` in `@theme`

### `src/lib/utils.ts`
- Added `randomRotation()` — returns float -6 to +6

### `src/lib/themes.ts`
- Added `Occasion` interface + `occasions` array (6 types: birthday, anniversary, date-invite, congrats, thank-you, custom) each with emoji + prompt suggestions

### `src/components/create/OccasionSelector.tsx` (NEW)
- 3-column grid of occasion buttons + prompt quick-fill suggestions

### `src/components/create/StepIndicator.tsx` (REWRITTEN)
- 4 steps: Occasion / Photos & Message / Question / Publish
- Progress bar + numbered circles

### `src/components/create/PhotoUploader.tsx`
- `PhotoFile` type now has `caption: string` + `rotation_deg: number`
- Polaroid thumbnail preview per photo
- Caption textarea using Caveat font
- Drag reorder support

### `src/components/create/QuestionBuilder.tsx`
- `Question` type: `{text, yesLabel, noLabel, requireAnswer, enableDodge}`
- yes/no label inputs
- `enableDodge` Switch (dodge No button toggle)
- `requireAnswer` Switch

### `src/app/create/page.tsx` (REWRITTEN)
- 4-step wizard with AnimatePresence slide transitions
- Step 1: OccasionSelector + ThemeSelector
- Step 2: PhotoUploader + MessageEditor + RevealSettings
- Step 3: QuestionBuilder
- Step 4: PreviewPublish
- FormData now includes: `photo_caption_N`, `photo_rotation_N`, `occasionType`, `questions` JSON with yesLabel/noLabel/enableDodge

### `src/actions/invite.ts`
- Saves `caption`, `rotation_deg` per photo
- Saves `occasion_type` on invite
- Saves `enable_dodge_no` from first question (invite-level flag)
- Saves `yes_label`, `no_label` per question
- `getInviteBySlug` already selects `yes_label, no_label` from invite_questions

### `src/components/surprise/QuestionScreen.tsx` (REWRITTEN)
- Props: added `enableDodge?: boolean`
- Full dodge logic: `noPos {x,y}`, `dodgeCount`, `noBtnRef`, `containerRef`
- `dodge()` via `useCallback` — random position within container, spring animate, vibrate, increment count
- `noFrozen = !enableDodge || dodgeCount >= MAX_DODGES` (MAX_DODGES = 3)
- onMouseEnter + onTouchStart(preventDefault) to trigger dodge
- Custom `yesLabel`/`noLabel` from question data
- Dodge hints: "Try clicking No... 😏" / "It keeps running away 😂 (N left)" / "Fine, it'll stay still now 😄"

### `src/components/surprise/RSVPButton.tsx` (REWRITTEN)
- Replaced CSS confetti with `canvas-confetti` dynamic import
- Center burst (120 particles) + side cannons (60 each, 200ms delay)
- AnimatePresence for before/after tap states
- `firedRef` to prevent double-fire

### `src/components/surprise/TapToReveal.tsx`
- Question type updated: added `yes_label`, `no_label` fields
- Added `enableDodge?: boolean` prop, forwarded to QuestionScreen

### `src/components/surprise/CountdownReveal.tsx`
- Same question type + `enableDodge` updates as TapToReveal

### `src/app/surprise/[slug]/page.tsx`
- Extracts `enable_dodge_no` from invite (cast needed since type not updated)
- Passes `enableDodge` to both TapToReveal and CountdownReveal
- Question objects now typed with `yes_label`, `no_label`

### `src/app/surprise/test/page.tsx`
- MOCK_QUESTIONS updated with `yes_label`/`no_label` fields

---

## PhotoCarousel Bug Fixed
- File: `src/components/surprise/PhotoCarousel.tsx`
- Bug: auto-advance timer never called onComplete on last photo
- Fix: added `else { onComplete(); }` after `if (current < photos.length - 1)`

---

## Build Status
`npm run build` passes clean (TypeScript OK, 14 pages). Only warning: middleware file convention deprecated (non-breaking).
