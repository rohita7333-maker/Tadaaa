/**
 * AI drafter feedback, verbatim from web's `AIDraftButton.tsx`.
 *
 * Both platforms hit routes that return the same status set — 429 rate-limited,
 * 422 unsuitable input, 503 provider down, anything else generic
 * (`src/app/api/ai/draft-invite/route.ts` and its `/api/mobile` twin). Mobile
 * previously showed one generic alert for all four, because `post()` threw a
 * bare Error and the status was lost. It now throws `ApiError` with `status`,
 * so the user is told WHICH thing went wrong — same as on web.
 *
 * Kept as pure data + a pure function so the mapping is unit-testable without a
 * native runtime, and so the parity suite can diff the strings against web.
 */

export const AI_DRAFT_RATE_LIMITED = "You've used 10 AI drafts this hour. Try again later.";
export const AI_DRAFT_REFUSED = "Input wasn't suitable for a surprise invite.";
export const AI_DRAFT_UNAVAILABLE =
  "AI drafting is taking a breather. Write your message by hand for now.";
export const AI_DRAFT_GENERIC = "Draft hit a snag. Give it another go.";
export const AI_DRAFT_SUCCESS = "Draft ready. Tweak anything you like.";

/**
 * Web branches on the raw response status; mobile branches on `ApiError.status`.
 * `status` is undefined when the failure never reached the server (no backend
 * configured, offline), which falls through to the generic line — the same
 * thing web shows for a non-ok response it cannot classify.
 */
export function aiDraftErrorMessage(status: number | undefined): string {
  switch (status) {
    case 429:
      return AI_DRAFT_RATE_LIMITED;
    case 422:
      return AI_DRAFT_REFUSED;
    case 503:
      return AI_DRAFT_UNAVAILABLE;
    default:
      return AI_DRAFT_GENERIC;
  }
}
