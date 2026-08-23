/**
 * Create wizard — the shape of the six steps, and every rule that decides
 * whether Continue is allowed to move.
 *
 * The pre-handoff wizard was four steps with its validation inlined in a 500-line
 * `goNext()`. The handoff specifies six, so the rules move here where they can
 * be tested: a validation branch that never fires is indistinguishable from one
 * that does not exist, and the wizard is the only place in the app that writes
 * a row nothing else can repair.
 *
 * State stays in the screen. This module is pure.
 */
import { REVEAL_STYLE_MAP, toRevealStyle, type RevealStyle } from "./schema-adapter";
import { toOccasionId } from "./occasions";
import { getTemplate } from "./templates";
import { themes } from "./themes";
import type { Tier } from "./tier";

export const TOTAL_STEPS = 6;

/** Handoff validation table: message ≤ 500, caption ≤ 200. */
export const MESSAGE_MAX = 500;
export const CAPTION_MAX = 200;

/** Photos: ≤ 8 free, ≤ 20 premium. */
const PHOTO_LIMIT_FREE = 8;
const PHOTO_LIMIT_PAID = 20;

export function photoLimit(tier: Tier): number {
  return tier === "free" ? PHOTO_LIMIT_FREE : PHOTO_LIMIT_PAID;
}

export interface WizardStep {
  name: string;
  /** 28-30px serif question at the top of the step body. */
  heading: string;
  /** 15px stone line under it. Null where the frame shows the heading alone. */
  sub: string | null;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    name: "Occasion",
    heading: "What's the occasion?",
    sub: "One choice. It shapes the tone of everything after.",
  },
  { name: "Content", heading: "Add your words.", sub: null },
  { name: "Contributors", heading: "Ask them something.", sub: null },
  {
    name: "Reveal style",
    heading: "Pick how it opens.",
    sub: "Four ways. Tap a tile to watch it.",
  },
  {
    name: "Schedule & lock",
    heading: "When should they see it?",
    sub: "Their time zone. Not yours.",
  },
  { name: "Preview & publish", heading: "See it as she will.", sub: null },
] as const;

export function stepLabel(step: number): string {
  const clamped = Math.min(TOTAL_STEPS, Math.max(1, step));
  return `Step ${clamped} of ${TOTAL_STEPS}`;
}

/** Six 3px bars, 4px apart: completed coral, remaining mist. */
export function progressSegments(step: number): boolean[] {
  const clamped = Math.min(TOTAL_STEPS, Math.max(1, step));
  return Array.from({ length: TOTAL_STEPS }, (_, i) => i < clamped);
}

/**
 * Frame C1–C6 header: "Save" on step 1, a "Peek" pill on 2–3, nothing after.
 * Peek shows a mini reveal, which is only meaningful once there is content —
 * hence 2 and 3, not 1.
 */
export function rightSlot(step: number): "save" | "peek" | null {
  if (step === 1) return "save";
  if (step === 2 || step === 3) return "peek";
  return null;
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export interface WizardPhoto {
  uri: string;
  caption: string;
  ext: string;
  mimeType: string;
  rotationDeg: number;
}

export type ScheduleMode = "now" | "schedule" | "opens_on";

export interface WizardDraft {
  occasion: string;
  /**
   * C1: what "Custom" actually means, in the creator's own words.
   *
   * Only meaningful while `occasion === "custom"`. It becomes the published
   * `occasion_type` via `publishOccasionType`, so the reveal eyebrow reads
   * "Graduation" rather than the literal word "Custom".
   */
  customOccasion: string;
  title: string;
  message: string;
  photos: WizardPhoto[];
  themeId: string;
  /** C3 */
  question: string;
  dodgingNo: boolean;
  contributionsOpen: boolean;
  /** C4 — null until chosen, so step 4 can genuinely block. */
  revealStyle: RevealStyle | null;
  /** C5 */
  scheduleMode: ScheduleMode;
  scheduledAt: string | null;
  timezone: string | null;
  addToCalendar: boolean;
  pinEnabled: boolean;
  pin: string;
  pinHint: string;
}

export function emptyWizardDraft(): WizardDraft {
  return {
    occasion: "",
    customOccasion: "",
    title: "",
    message: "",
    photos: [],
    themeId: "warm-embrace",
    question: "",
    dodgingNo: true,
    contributionsOpen: false,
    revealStyle: null,
    scheduleMode: "now",
    scheduledAt: null,
    // "Theirs" — recipient-local is the handoff's recommended default.
    timezone: null,
    addToCalendar: false,
    pinEnabled: false,
    pin: "",
    pinHint: "",
  };
}

/**
 * C4's "Change" — swap the theme and NOTHING else.
 *
 * The control used to navigate to the themes tab, whose "Use this theme"
 * applies a TEMPLATE. A template carries `occasionId` and `revealType` next to
 * `themeId`, so changing the theme silently rewrote the occasion chosen at C1
 * and the reveal style chosen at C4 — neither of which the card claims to
 * touch. This is a named function, not an inline `patch({ themeId })`, so the
 * rule is testable and survives someone re-adding template semantics.
 *
 * An unknown id is refused: `getThemeById` falls back to `themes[0]` at render
 * time, so an unrecognised theme would show one thing and publish another.
 */
export function selectTheme(draft: WizardDraft, themeId: string): WizardDraft {
  if (!themes.some((t) => t.id === themeId)) return draft;
  if (draft.themeId === themeId) return draft;
  return { ...draft, themeId };
}

/**
 * The `occasion_type` this draft should publish as.
 *
 * `invites.occasion_type` is TEXT with no CHECK, and `occasionLabel()` already
 * humanises unrecognised ids, so a named custom occasion needs no migration —
 * it simply travels as its own id. Falls back to the literal "custom" when the
 * name has nothing sluggable in it, which validation already refuses to let
 * through the wizard.
 */
export function publishOccasionType(draft: WizardDraft): string {
  if (draft.occasion !== "custom") return draft.occasion;
  return toOccasionId(draft.customOccasion) || "custom";
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

/**
 * The stored draft, seen structurally.
 *
 * Deliberately NOT `StoredDraft` from `draft.ts`: that module pulls in
 * AsyncStorage, and this one is pure so it can be tested without a native mock.
 */
export interface StoredWizardRecord {
  step: number;
  payload: Record<string, unknown>;
}

export interface HydrateWizardInput {
  stored: StoredWizardRecord | null;
  params: { template?: string; occasion?: string; reveal?: string; theme?: string };
  /** Used only when the stored record has no usable slug of its own. */
  newSlug: string;
}

export interface HydrateWizardResult {
  step: number;
  draft: WizardDraft;
  slug: string;
  /** True when a stored draft contributed anything — drives the resume notice. */
  resumed: boolean;
  /** True when the stored record carried photos that had to be discarded. */
  photosDropped: boolean;
}

const REVEAL_TYPES = new Set<string>(Object.values(REVEAL_STYLE_MAP));

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function nullableStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Rebuild a draft from an opaque stored payload, field by field.
 *
 * A spread would be shorter and wrong: the payload is JSON written by an older
 * build, so every field is genuinely `unknown` and one junk value must not
 * poison the whole wizard. Photos are always dropped — file:// URIs point into
 * an iOS container that is reaped between launches, so a persisted photo
 * resurrects as a broken reference. `draft.ts` says photos are not stored; the
 * wizard was passing them anyway.
 */
function draftFromPayload(payload: Record<string, unknown>): WizardDraft {
  const base = emptyWizardDraft();
  const revealStyle = payload.revealStyle;
  return {
    occasion: str(payload.occasion, base.occasion),
    customOccasion: str(payload.customOccasion, base.customOccasion),
    title: str(payload.title, base.title),
    message: str(payload.message, base.message),
    photos: [],
    themeId: str(payload.themeId, base.themeId),
    question: str(payload.question, base.question),
    dodgingNo: bool(payload.dodgingNo, base.dodgingNo),
    contributionsOpen: bool(payload.contributionsOpen, base.contributionsOpen),
    revealStyle:
      typeof revealStyle === "string" && revealStyle in REVEAL_STYLE_MAP
        ? (revealStyle as RevealStyle)
        : null,
    scheduleMode:
      payload.scheduleMode === "schedule" || payload.scheduleMode === "opens_on"
        ? payload.scheduleMode
        : "now",
    scheduledAt: nullableStr(payload.scheduledAt),
    timezone: nullableStr(payload.timezone),
    addToCalendar: bool(payload.addToCalendar, base.addToCalendar),
    pinEnabled: bool(payload.pinEnabled, base.pinEnabled),
    pin: str(payload.pin, base.pin),
    pinHint: str(payload.pinHint, base.pinHint),
  };
}

/**
 * The highest step at or below `want` whose every predecessor validates.
 *
 * Resuming at 6 with no reveal style renders an empty body over a Publish
 * button, because step 6 is gated on `draft.revealStyle`. Walking back is the
 * only honest answer: it puts the user on the step that still needs them.
 */
function safeStep(want: number, draft: WizardDraft): number {
  const clamped = Math.min(TOTAL_STEPS, Math.max(1, Math.floor(want) || 1));
  for (let s = 1; s < clamped; s++) {
    if (!validateStep(s, draft).ok) return s;
  }
  return clamped;
}

/**
 * What the wizard opens with.
 *
 * Order matters and is the whole point: the stored draft is the FLOOR and the
 * URL params are layered ON TOP. `theme/[id]` → "Use this theme" pushes a
 * SECOND `/create`, so a params-only hydration is exactly how the C4 "Change"
 * round trip used to throw away everything already typed.
 */
export function hydrateWizard({
  stored,
  params,
  newSlug,
}: HydrateWizardInput): HydrateWizardResult {
  const payload = stored?.payload ?? {};
  const hasStored = stored !== null;

  const draft = hasStored ? draftFromPayload(payload) : emptyWizardDraft();
  const photosDropped = Array.isArray(payload.photos) && payload.photos.length > 0;

  const template = params.template ? getTemplate(params.template) : undefined;
  if (template) {
    draft.occasion = template.occasionId;
    draft.themeId = template.themeId;
    draft.revealStyle = toRevealStyle(String(template.revealType));
  } else {
    if (params.occasion) draft.occasion = params.occasion;
    // "own" is the themes tab's "use one of your own photos" row, not a theme.
    if (params.theme && params.theme !== "own") draft.themeId = params.theme;
    // A bare `reveal` used to be accepted as a param and then dropped on the
    // floor; `toRevealStyle` alone would silently turn any junk into "tap".
    if (params.reveal && REVEAL_TYPES.has(params.reveal)) {
      draft.revealStyle = toRevealStyle(params.reveal);
    }
  }

  const storedSlug = payload.slug;
  const slug = typeof storedSlug === "string" && storedSlug.length > 0 ? storedSlug : newSlug;

  return {
    step: hasStored ? safeStep(stored.step, draft) : 1,
    draft,
    slug,
    resumed: hasStored,
    photosDropped,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type StepValidation =
  | { ok: true }
  | { ok: false; field: string; message: string };

const OK: StepValidation = { ok: true };

function fail(field: string, message: string): StepValidation {
  return { ok: false, field, message };
}

export interface ValidateOptions {
  /**
   * True while editing a surprise that already has a PIN.
   *
   * The hash cannot be reversed, so the field comes back empty and empty means
   * "leave it alone". Without this, editing a PIN-locked surprise would be
   * blocked on step 5 forever by a PIN the creator never intended to change.
   */
  hasExistingPin?: boolean;
}

export function validateStep(
  step: number,
  draft: WizardDraft,
  options: ValidateOptions = {}
): StepValidation {
  switch (step) {
    case 1:
      if (draft.occasion.trim() === "") return fail("occasion", "Pick an occasion first.");
      // "Custom" on its own publishes `occasion_type = 'custom'` and prints the
      // literal word "Custom" to the recipient. Naming it is the whole point of
      // the row.
      if (draft.occasion === "custom" && toOccasionId(draft.customOccasion) === "") {
        return fail("customOccasion", "Name the occasion first.");
      }
      return OK;

    case 2: {
      if (draft.title.trim() === "") return fail("title", "Give it a title first.");
      if (draft.message.trim().length > MESSAGE_MAX) {
        return fail("message", `Keep the message under ${MESSAGE_MAX} characters.`);
      }
      // Name the offending photo: "a caption is too long" in a strip of eight
      // is a hunt, not a hint.
      const over = draft.photos.findIndex((p) => p.caption.trim().length > CAPTION_MAX);
      if (over !== -1) {
        return fail("photos", `Photo ${over + 1}'s caption is over ${CAPTION_MAX} characters.`);
      }
      return OK;
    }

    case 3:
      // Contributors is entirely optional — the handoff never requires a
      // question or an open door.
      return OK;

    case 4:
      if (!draft.revealStyle) return fail("revealStyle", "Pick how it opens.");
      return OK;

    case 5: {
      /**
       * Two reveal styles are a countdown and cannot open "right away".
       *
       * Seen in a browser: picking Countdown at C4 and Right away here
       * produced a C6 summary saying "Reveal: Countdown · Delivery: Right
       * away" and would have written `countdown_date = null`. The reveal
       * screen gates on `reveal_type === "countdown" && !!countdown_date`, so
       * the recipient would have got a TAP reveal — the creator chose one
       * thing and silently shipped another. Web validates this; mobile did
       * not, anywhere.
       */
      const countsDown =
        draft.revealStyle === "countdown" || draft.revealStyle === "scroll";
      if (countsDown && draft.scheduleMode === "now") {
        return fail("scheduledAt", "Pick the date this counts down to.");
      }

      if (draft.scheduleMode !== "now") {
        if (!draft.scheduledAt) return fail("scheduledAt", "Pick the date and time.");
        if (new Date(draft.scheduledAt).getTime() <= Date.now()) {
          return fail("scheduledAt", "That moment has already passed — pick a later one.");
        }
      }
      // A stale half-typed PIN behind a toggle that is now off must not trap
      // anyone on this step. An empty field on a surprise that ALREADY has a
      // PIN means "keep it" — the hash cannot be read back to prefill.
      const keepingExistingPin = options.hasExistingPin === true && draft.pin === "";
      if (draft.pinEnabled && !keepingExistingPin && !/^[0-9]{4}$/.test(draft.pin)) {
        return fail("pin", "A PIN is four digits.");
      }
      return OK;
    }

    default:
      return OK;
  }
}
