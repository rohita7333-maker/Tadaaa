/**
 * A `RevealData` built from an unpublished wizard draft.
 *
 * C6's "Play full preview" opened a bottom sheet listing the title, the words
 * "Your message will show here." and a photo count — a summary, not a reveal.
 * Frame C6 puts a "Play full preview" pill next to the mini reveal, and C4 says
 * outright that tapping a reveal tile "opens a full-screen demo with the user's
 * own title and first photo already in it". Neither existed: `onPlayPreview`
 * reused the C2/C3 Peek sheet and `onPreview` was `() => {}`.
 *
 * The reveal components all read a `RevealData`, so the honest way to show a
 * real reveal is to build one. The draft has no row, so `invite.id` is a
 * placeholder that must never reach the database — every consumer of this data
 * is rendered with `preview`, which skips the writes.
 */
import type { RevealData } from "./db";
import { toRevealType } from "./schema-adapter";
import { publishOccasionType, type WizardDraft } from "./wizard";

/**
 * Deliberately not a uuid. Anything that slipped past the `preview` flag and
 * reached PostgREST would fail loudly on the type rather than quietly writing
 * a row against a real invite.
 */
export const PREVIEW_INVITE_ID = "preview-not-a-real-invite";

/** Photo ids are positional; the map handed to `RevealOpen` uses the same keys. */
export function previewPhotoId(index: number): string {
  return `preview-photo-${index}`;
}

/**
 * Local file URIs keyed the way `RevealOpen` expects.
 *
 * A published reveal resolves signed URLs from the private bucket; a draft's
 * photos are still on the device, so they are handed straight through.
 */
export function previewPhotoUrls(draft: WizardDraft): Record<string, string> {
  return Object.fromEntries(draft.photos.map((p, i) => [previewPhotoId(i), p.uri]));
}

export function previewRevealData(draft: WizardDraft, slug: string): RevealData {
  const now = new Date().toISOString();
  return {
    invite: {
      id: PREVIEW_INVITE_ID,
      slug,
      title: draft.title.trim() || "Untitled",
      message: draft.message,
      theme: draft.themeId,
      occasion_type: publishOccasionType(draft),
      reveal_type: draft.revealStyle ? toRevealType(draft.revealStyle) : "tap",
      countdown_date: draft.scheduleMode === "now" ? null : draft.scheduledAt,
      expires_at: null,
      events: null,
      enable_dodge_no: draft.dodgingNo,
      accept_contributions: draft.contributionsOpen,
      is_paid: false,
      view_count: 0,
      response_count: 0,
      created_at: now,
    },
    // A question the creator typed is shown, so the preview matches what the
    // recipient will actually be asked. Its id is positional for the same
    // reason the photo ids are.
    questions: draft.question.trim()
      ? [
          {
            id: "preview-question-0",
            invite_id: PREVIEW_INVITE_ID,
            question_text: draft.question.trim(),
            yes_label: "Yes",
            no_label: "No",
            require_answer: false,
            attached_photo_index: null,
            sort_order: 0,
            created_at: now,
          } as RevealData["questions"][number],
        ]
      : [],
    photos: draft.photos.map(
      (p, i) =>
        ({
          id: previewPhotoId(i),
          invite_id: PREVIEW_INVITE_ID,
          storage_path: p.uri,
          caption: p.caption || null,
          rotation_deg: p.rotationDeg,
          sort_order: i,
          created_at: now,
        }) as RevealData["photos"][number]
    ),
    // Contributions belong to a published invite; a draft has none, and the
    // wizard says so on C3.
    contributions: [],
  };
}
