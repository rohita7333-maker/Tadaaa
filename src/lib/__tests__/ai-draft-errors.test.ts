import {
  aiDraftErrorMessage,
  AI_DRAFT_GENERIC,
  AI_DRAFT_RATE_LIMITED,
  AI_DRAFT_REFUSED,
  AI_DRAFT_SUCCESS,
  AI_DRAFT_UNAVAILABLE,
} from "../ai-draft-errors";

/**
 * Web branches on the response status to tell the user which failure occurred.
 * Mobile can now do the same because `post()` throws `ApiError` with `status`.
 */
describe("aiDraftErrorMessage", () => {
  it("maps each status web distinguishes to its own message", () => {
    expect(aiDraftErrorMessage(429)).toBe(AI_DRAFT_RATE_LIMITED);
    expect(aiDraftErrorMessage(422)).toBe(AI_DRAFT_REFUSED);
    expect(aiDraftErrorMessage(503)).toBe(AI_DRAFT_UNAVAILABLE);
  });

  it("falls back to the generic line for any other status", () => {
    expect(aiDraftErrorMessage(500)).toBe(AI_DRAFT_GENERIC);
    expect(aiDraftErrorMessage(400)).toBe(AI_DRAFT_GENERIC);
    expect(aiDraftErrorMessage(401)).toBe(AI_DRAFT_GENERIC);
  });

  it("falls back to the generic line when the request never reached the server", () => {
    // Offline, or no backend configured — there is no status to classify.
    expect(aiDraftErrorMessage(undefined)).toBe(AI_DRAFT_GENERIC);
  });

  it("never returns the same string for two different failures", () => {
    const distinct = new Set([
      aiDraftErrorMessage(429),
      aiDraftErrorMessage(422),
      aiDraftErrorMessage(503),
      aiDraftErrorMessage(500),
    ]);
    expect(distinct.size).toBe(4);
  });

  it("carries web's success wording", () => {
    expect(AI_DRAFT_SUCCESS).toBe("Draft ready. Tweak anything you like.");
  });
});
