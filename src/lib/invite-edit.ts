/**
 * Edit mode — the rules for turning a published invite back into a draft, and
 * a draft back into an UPDATE.
 *
 * `invite/[id].tsx` pushed `/create?editId=<id>` from the moment the detail
 * screen shipped, and nothing ever read the parameter. The wizard opened blank
 * and `publish()` always called `createInviteRow`, so the pencil created a
 * duplicate invite and spent another of the month's allowance.
 *
 * No migration was required. `invites` already carries a permissive UPDATE
 * policy `(auth.uid() = creator_id)` and `invite_questions` a creator-scoped
 * ALL policy — checked against the live database rather than the `sql/` files.
 */
import { occasionLabel, toOccasionId, getHandoffOccasion } from "./occasions";
import { toRevealStyle, toRevealType } from "./schema-adapter";
import { TOTAL_STEPS, emptyWizardDraft, validateStep, type WizardDraft } from "./wizard";

/** The columns edit reads. Deliberately narrower than the full `invites` row. */
export interface EditableInvite {
  id: string;
  slug: string;
  title: string;
  message: string | null;
  theme: string;
  occasion_type: string;
  reveal_type: string;
  countdown_date: string | null;
  display_timezone: string | null;
  accept_contributions: boolean | null;
  enable_dodge_no: boolean | null;
  pin_hash: string | null;
  pin_hint: string | null;
}

export interface EditableQuestion {
  id: string;
  question_text: string;
  sort_order: number | null;
}

/**
 * The highest step this draft could legitimately be dropped on.
 *
 * An edit starts at the end — everything is already filled in — but a row that
 * cannot satisfy an earlier step must not present a Save button over a form
 * that will refuse to submit.
 */
function landingStep(draft: WizardDraft): number {
  for (let s = 1; s < TOTAL_STEPS; s++) {
    if (!validateStep(s, draft, { hasExistingPin: draft.pinEnabled }).ok) return s;
  }
  return TOTAL_STEPS;
}

export function inviteToDraft(
  invite: EditableInvite,
  questions: EditableQuestion[]
): { draft: WizardDraft; step: number } {
  const base = emptyWizardDraft();

  // An occasion id the handoff does not know is a CUSTOM one — that is exactly
  // how `publishOccasionType` stores them. Reversing it here keeps the picker
  // honest instead of silently resetting the occasion to nothing.
  const known = getHandoffOccasion(invite.occasion_type);
  const isCustom = !known && invite.occasion_type !== "";

  const first = [...questions].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

  const draft: WizardDraft = {
    ...base,
    occasion: isCustom ? "custom" : invite.occasion_type,
    customOccasion: isCustom ? occasionLabel(invite.occasion_type) : "",
    title: invite.title,
    message: invite.message ?? "",
    // Photos live in the bucket and are edited from the surprise's own screen;
    // carrying them into the wizard would mean re-uploading what already exists.
    photos: [],
    themeId: invite.theme,
    question: first?.question_text ?? "",
    dodgingNo: invite.enable_dodge_no ?? base.dodgingNo,
    contributionsOpen: invite.accept_contributions ?? base.contributionsOpen,
    revealStyle: toRevealStyle(invite.reveal_type),
    scheduleMode: invite.countdown_date ? "schedule" : "now",
    scheduledAt: invite.countdown_date,
    timezone: invite.display_timezone,
    addToCalendar: false,
    // The hash cannot be reversed. The toggle tells the truth about whether a
    // PIN exists; an empty field means "leave it exactly as it is".
    pinEnabled: !!invite.pin_hash,
    pin: "",
    pinHint: invite.pin_hint ?? "",
  };

  return { draft, step: landingStep(draft) };
}

/** Exactly the columns the wizard owns. Everything else is owned elsewhere. */
export interface InviteUpdatePatch {
  title: string;
  message: string;
  theme: string;
  occasion_type: string;
  reveal_type: string;
  countdown_date: string | null;
  display_timezone: string | null;
  accept_contributions: boolean;
  enable_dodge_no: boolean;
}

export function inviteUpdatePatch(draft: WizardDraft): InviteUpdatePatch {
  const revealType = toRevealType(draft.revealStyle ?? "tap");
  const countsDown = revealType === "countdown" || revealType === "scroll_story";
  return {
    title: draft.title.trim(),
    message: draft.message.trim(),
    theme: draft.themeId,
    occasion_type:
      draft.occasion === "custom"
        ? toOccasionId(draft.customOccasion) || "custom"
        : draft.occasion,
    reveal_type: revealType,
    countdown_date: countsDown && draft.scheduleMode !== "now" ? draft.scheduledAt : null,
    display_timezone: draft.timezone,
    accept_contributions: draft.contributionsOpen,
    enable_dodge_no: draft.dodgingNo,
  };
  // Absent on purpose: `slug` (already shared), `expires_at` ("Extend link"),
  // `is_paid` (checkout), `is_active` (the pause control), `events` (the Scroll
  // Story plaques the wizard never collects — writing [] would erase them),
  // `creator_id`, the counters, and `pin_hash`.
}

export interface QuestionPlan {
  /** Text to insert as a new question, or null. */
  insert: string | null;
  /** Id of the question to rewrite in place, or null. */
  updateId: string | null;
  /** Ids to remove — a cleared field, or extras the wizard cannot represent. */
  deleteIds: string[];
}

/**
 * Reconcile C3's single question field against however many rows exist.
 *
 * Updating in place rather than delete-and-reinsert is deliberate: answers are
 * keyed to the question id and would cascade away with it.
 */
export function questionPlan(
  existing: EditableQuestion[],
  text: string
): QuestionPlan {
  const wanted = text.trim();
  const sorted = [...existing].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const [first, ...extras] = sorted;
  const deleteIds = extras.map((q) => q.id);

  if (!wanted) {
    return { insert: null, updateId: null, deleteIds: first ? [first.id, ...deleteIds] : deleteIds };
  }
  if (!first) return { insert: wanted, updateId: null, deleteIds };
  if (first.question_text === wanted) return { insert: null, updateId: null, deleteIds };
  return { insert: null, updateId: first.id, deleteIds };
}
