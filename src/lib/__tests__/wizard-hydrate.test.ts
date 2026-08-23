/**
 * `hydrateWizard` — the rule that decides what the create wizard opens with.
 *
 * This exists because the wizard had no rehydration at all. `readDraft()` was
 * written, tested by nothing, and imported by exactly one file — Home, to DRAW
 * the resume card. The wizard itself always booted `emptyWizardDraft()` at step
 * 1, and its mount autosave then overwrote the stored draft with that empty
 * record. Pressing "Resume" therefore destroyed the draft it claimed to resume.
 * Seen doing exactly that in a browser: a step-3 draft titled "Rohit device
 * repro" came back as `{"title":"","step":1,"occasion":""}`.
 *
 * The same gap is why "Change" on C4 loses the wizard: `theme/[id]` pushes a
 * SECOND `/create`, and a second component instance has no memory of the first.
 * Params must therefore LAYER ON TOP of the stored draft, not replace it.
 */
import {
  hydrateWizard,
  emptyWizardDraft,
  TOTAL_STEPS,
  type StoredWizardRecord,
} from "../wizard";

const SLUG = "freshslug01";

function stored(step: number, payload: Record<string, unknown>): StoredWizardRecord {
  return { step, payload };
}

/** A payload that would legitimately validate up to step 4. */
function goodPayload(extra: Record<string, unknown> = {}) {
  return {
    ...emptyWizardDraft(),
    occasion: "birthday",
    title: "Maya turns thirty",
    revealStyle: "tap",
    slug: "storedslug9",
    ...extra,
  };
}

describe("hydrateWizard — no stored draft", () => {
  it("opens an empty wizard at step 1", () => {
    const r = hydrateWizard({ stored: null, params: {}, newSlug: SLUG });
    expect(r.step).toBe(1);
    expect(r.draft).toEqual(emptyWizardDraft());
    expect(r.slug).toBe(SLUG);
    expect(r.resumed).toBe(false);
  });

  it("applies a template handoff", () => {
    const r = hydrateWizard({
      stored: null,
      params: { template: "golden-hour" },
      newSlug: SLUG,
    });
    expect(r.draft.occasion).toBe("birthday");
    expect(r.draft.themeId).toBe("golden-hour");
    expect(r.draft.revealStyle).toBe("scroll");
  });

  it("applies bare occasion and theme params", () => {
    const r = hydrateWizard({
      stored: null,
      params: { occasion: "apology", theme: "midnight-romance" },
      newSlug: SLUG,
    });
    expect(r.draft.occasion).toBe("apology");
    expect(r.draft.themeId).toBe("midnight-romance");
  });

  it("ignores theme=own, which means 'use my own photo'", () => {
    const r = hydrateWizard({ stored: null, params: { theme: "own" }, newSlug: SLUG });
    expect(r.draft.themeId).toBe(emptyWizardDraft().themeId);
  });

  it("maps a bare reveal param, which used to be dropped on the floor", () => {
    const r = hydrateWizard({
      stored: null,
      params: { reveal: "scroll_story" },
      newSlug: SLUG,
    });
    expect(r.draft.revealStyle).toBe("scroll");
  });
});

describe("hydrateWizard — resuming", () => {
  it("restores the step and the payload", () => {
    const r = hydrateWizard({
      stored: stored(3, goodPayload()),
      params: {},
      newSlug: SLUG,
    });
    expect(r.step).toBe(3);
    expect(r.draft.title).toBe("Maya turns thirty");
    expect(r.draft.occasion).toBe("birthday");
    expect(r.resumed).toBe(true);
  });

  it("reuses the stored slug, so a shared contribute link keeps working", () => {
    const r = hydrateWizard({
      stored: stored(3, goodPayload()),
      params: {},
      newSlug: SLUG,
    });
    expect(r.slug).toBe("storedslug9");
  });

  it("mints a new slug when the stored one is missing or junk", () => {
    expect(
      hydrateWizard({
        stored: stored(2, goodPayload({ slug: undefined })),
        params: {},
        newSlug: SLUG,
      }).slug
    ).toBe(SLUG);
    expect(
      hydrateWizard({
        stored: stored(2, goodPayload({ slug: 42 })),
        params: {},
        newSlug: SLUG,
      }).slug
    ).toBe(SLUG);
  });

  it("never resumes past a step whose prerequisites do not hold", () => {
    // Step 6 renders nothing without a revealStyle, so resuming there is a
    // blank screen with a Publish button.
    const r = hydrateWizard({
      stored: stored(6, goodPayload({ revealStyle: null })),
      params: {},
      newSlug: SLUG,
    });
    expect(r.step).toBe(4);
  });

  it("walks back only as far as the first failing step", () => {
    const r = hydrateWizard({
      stored: stored(5, goodPayload({ title: "" })),
      params: {},
      newSlug: SLUG,
    });
    expect(r.step).toBe(2);
  });

  it("clamps a corrupt step into range", () => {
    expect(
      hydrateWizard({ stored: stored(99, goodPayload()), params: {}, newSlug: SLUG }).step
    ).toBeLessThanOrEqual(TOTAL_STEPS);
    expect(
      hydrateWizard({ stored: stored(0, goodPayload()), params: {}, newSlug: SLUG }).step
    ).toBe(1);
  });

  it("drops persisted photos and says so", () => {
    // iOS reaps the container these file:// URIs point into, so a persisted
    // photo resurrects as a broken reference. draft.ts documents that photos
    // are not stored; the wizard was passing them anyway.
    const r = hydrateWizard({
      stored: stored(
        2,
        goodPayload({
          photos: [{ uri: "file:///gone.jpg", caption: "", ext: "jpg", mimeType: "image/jpeg", rotationDeg: 0 }],
        })
      ),
      params: {},
      newSlug: SLUG,
    });
    expect(r.draft.photos).toEqual([]);
    expect(r.photosDropped).toBe(true);
  });

  it("does not claim photos were dropped when there were none", () => {
    const r = hydrateWizard({
      stored: stored(2, goodPayload()),
      params: {},
      newSlug: SLUG,
    });
    expect(r.photosDropped).toBe(false);
  });

  it("survives a payload with junk types instead of throwing", () => {
    const r = hydrateWizard({
      stored: stored(3, { occasion: 7, title: null, photos: "nope", pinEnabled: "yes" }),
      params: {},
      newSlug: SLUG,
    });
    expect(r.draft.occasion).toBe(emptyWizardDraft().occasion);
    expect(r.draft.title).toBe("");
    expect(r.draft.photos).toEqual([]);
    expect(r.draft.pinEnabled).toBe(false);
  });
});

describe("hydrateWizard — params layered on a resumed draft (frame C4 'Change')", () => {
  it("keeps the work and applies only the new theme", () => {
    // The C4 → themes → theme/[id] → 'Use this theme' path pushes a SECOND
    // /create. Params must not wipe what the first instance had.
    const r = hydrateWizard({
      stored: stored(4, goodPayload()),
      params: { theme: "golden-hour", occasion: "birthday", reveal: "scroll_story" },
      newSlug: SLUG,
    });
    expect(r.draft.title).toBe("Maya turns thirty");
    expect(r.draft.themeId).toBe("golden-hour");
    expect(r.step).toBe(4);
  });

  it("returns the user to the step they left, not to step 1", () => {
    const r = hydrateWizard({
      stored: stored(4, goodPayload()),
      params: { theme: "midnight-romance" },
      newSlug: SLUG,
    });
    expect(r.step).toBe(4);
  });

  it("lets an explicit template override the stored occasion and theme", () => {
    const r = hydrateWizard({
      stored: stored(4, goodPayload()),
      params: { template: "golden-hour" },
      newSlug: SLUG,
    });
    expect(r.draft.themeId).toBe("golden-hour");
    expect(r.draft.title).toBe("Maya turns thirty");
  });
});
