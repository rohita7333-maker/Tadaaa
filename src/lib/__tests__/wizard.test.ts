import {
  MESSAGE_MAX,
  CAPTION_MAX,
  TOTAL_STEPS,
  WIZARD_STEPS,
  emptyWizardDraft,
  photoLimit,
  progressSegments,
  rightSlot,
  stepLabel,
  validateStep,
  type WizardDraft,
} from "../wizard";

const draft = (over: Partial<WizardDraft> = {}): WizardDraft => ({
  ...emptyWizardDraft(),
  ...over,
});

describe("WIZARD_STEPS", () => {
  it("is the handoff's six steps, in frame order", () => {
    expect(WIZARD_STEPS.map((s) => s.name)).toEqual([
      "Occasion",
      "Content",
      "Contributors",
      "Reveal style",
      "Schedule & lock",
      "Preview & publish",
    ]);
    expect(TOTAL_STEPS).toBe(6);
  });

  it("carries every frame's heading verbatim", () => {
    expect(WIZARD_STEPS.map((s) => s.heading)).toEqual([
      "What's the occasion?",
      "Add your words.",
      "Ask them something.",
      "Pick how it opens.",
      "When should they see it?",
      "See it as she will.",
    ]);
  });

  it("carries a sub only where the frame shows one", () => {
    expect(WIZARD_STEPS[0].sub).toBe("One choice. It shapes the tone of everything after.");
    expect(WIZARD_STEPS[3].sub).toBe("Four ways. Tap a tile to watch it.");
    expect(WIZARD_STEPS[4].sub).toBe("Their time zone. Not yours.");
    // C2, C3 and C6 are heading-only in the frames.
    expect(WIZARD_STEPS[1].sub).toBeNull();
    expect(WIZARD_STEPS[2].sub).toBeNull();
    expect(WIZARD_STEPS[5].sub).toBeNull();
  });
});

describe("stepLabel", () => {
  it("reads as the frame's micro-label", () => {
    expect(stepLabel(1)).toBe("Step 1 of 6");
    expect(stepLabel(6)).toBe("Step 6 of 6");
  });

  it("clamps rather than printing Step 0 or Step 9", () => {
    expect(stepLabel(0)).toBe("Step 1 of 6");
    expect(stepLabel(99)).toBe("Step 6 of 6");
  });
});

describe("progressSegments", () => {
  it("fills one segment per completed step, including the current one", () => {
    expect(progressSegments(1)).toEqual([true, false, false, false, false, false]);
    expect(progressSegments(3)).toEqual([true, true, true, false, false, false]);
    expect(progressSegments(6)).toEqual([true, true, true, true, true, true]);
  });

  it("always returns six segments", () => {
    for (let s = 0; s <= 7; s++) expect(progressSegments(s)).toHaveLength(6);
  });
});

describe("rightSlot", () => {
  it("is Save on step 1 and Peek on 2 and 3 — the frame's header rule", () => {
    expect(rightSlot(1)).toBe("save");
    expect(rightSlot(2)).toBe("peek");
    expect(rightSlot(3)).toBe("peek");
  });

  it("is empty from step 4 on", () => {
    expect(rightSlot(4)).toBeNull();
    expect(rightSlot(5)).toBeNull();
    expect(rightSlot(6)).toBeNull();
  });
});

describe("photoLimit", () => {
  it("is 8 free and 20 once paid — the handoff's plans table", () => {
    expect(photoLimit("free")).toBe(8);
    expect(photoLimit("plus")).toBe(20);
    expect(photoLimit("unlimited")).toBe(20);
  });
});

describe("validateStep — C1 occasion", () => {
  it("blocks Continue until an occasion is picked", () => {
    expect(validateStep(1, draft({ occasion: "" }))).toEqual({
      ok: false,
      field: "occasion",
      message: "Pick an occasion first.",
    });
  });

  it("passes once one is picked", () => {
    expect(validateStep(1, draft({ occasion: "birthday" }))).toEqual({ ok: true });
  });
});

describe("validateStep — C2 content", () => {
  it("requires a title, with frame C2's wording", () => {
    expect(validateStep(2, draft({ title: "   " }))).toEqual({
      ok: false,
      field: "title",
      message: "Give it a title first.",
    });
  });

  it("caps the message at 500", () => {
    expect(validateStep(2, draft({ title: "Maya", message: "x".repeat(MESSAGE_MAX) })).ok).toBe(
      true
    );
    expect(validateStep(2, draft({ title: "Maya", message: "x".repeat(MESSAGE_MAX + 1) }))).toEqual({
      ok: false,
      field: "message",
      message: `Keep the message under ${MESSAGE_MAX} characters.`,
    });
  });

  it("caps a photo caption at 200 and names which photo", () => {
    const photos = [
      { uri: "a", caption: "", ext: "jpg", mimeType: "image/jpeg", rotationDeg: 0 },
      {
        uri: "b",
        caption: "x".repeat(CAPTION_MAX + 1),
        ext: "jpg",
        mimeType: "image/jpeg",
        rotationDeg: 0,
      },
    ];
    expect(validateStep(2, draft({ title: "Maya", photos }))).toEqual({
      ok: false,
      field: "photos",
      message: `Photo 2's caption is over ${CAPTION_MAX} characters.`,
    });
  });

  it("does NOT require a photo — the handoff never makes one mandatory", () => {
    expect(validateStep(2, draft({ title: "Maya", photos: [] })).ok).toBe(true);
  });
});

describe("validateStep — C4 reveal style", () => {
  it("requires a style", () => {
    expect(validateStep(4, draft({ revealStyle: null })).ok).toBe(false);
  });

  it("accepts all four, letters included", () => {
    for (const style of ["scroll", "tap", "countdown", "letters"] as const) {
      expect(validateStep(4, draft({ revealStyle: style })).ok).toBe(true);
    }
  });
});

describe("validateStep — a countdown needs something to count down to", () => {
  /**
   * Found by walking C4 → C5 → C6 in a browser. Picking "Countdown" and then
   * "Right away" produced a C6 summary reading "Reveal: Countdown · Delivery:
   * Right away" and would have published `countdown_date = null`. The reveal
   * screen gates on `reveal_type === "countdown" && !!countdown_date`, so the
   * recipient got a TAP reveal instead. The creator chose a countdown and
   * silently got something else. Web validates this ("Please set a countdown
   * date"); mobile had no check anywhere.
   */
  const base = { ...emptyWizardDraft(), occasion: "birthday", title: "T" };

  it("blocks a countdown reveal that opens right away", () => {
    const draft = { ...base, revealStyle: "countdown" as const, scheduleMode: "now" as const };
    expect(validateStep(5, draft)).toEqual({
      ok: false,
      field: "scheduledAt",
      message: "Pick the date this counts down to.",
    });
  });

  it("blocks a scroll story that opens right away, for the same reason", () => {
    // Its finale scene is a countdown; with no target it has nothing to show.
    const draft = { ...base, revealStyle: "scroll" as const, scheduleMode: "now" as const };
    expect(validateStep(5, draft).ok).toBe(false);
  });

  it("allows it once a future date is set", () => {
    const draft = {
      ...base,
      revealStyle: "countdown" as const,
      scheduleMode: "opens_on" as const,
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    expect(validateStep(5, draft)).toEqual({ ok: true });
  });

  it("leaves tap and letters alone — neither counts down", () => {
    for (const style of ["tap", "letters"] as const) {
      const draft = { ...base, revealStyle: style, scheduleMode: "now" as const };
      expect(validateStep(5, draft)).toEqual({ ok: true });
    }
  });
});

describe("validateStep — C5 schedule & lock", () => {
  it("needs a date once a scheduled mode is chosen", () => {
    expect(validateStep(5, draft({ scheduleMode: "schedule", scheduledAt: null })).ok).toBe(false);
    expect(
      validateStep(5, draft({ scheduleMode: "schedule", scheduledAt: "2030-01-01T00:00:00.000Z" }))
        .ok
    ).toBe(true);
  });

  it("rejects a scheduled date in the past", () => {
    expect(
      validateStep(5, draft({ scheduleMode: "schedule", scheduledAt: "2000-01-01T00:00:00.000Z" }))
    ).toEqual({
      ok: false,
      field: "scheduledAt",
      message: "That moment has already passed — pick a later one.",
    });
  });

  it("needs exactly four digits when the PIN is on", () => {
    expect(validateStep(5, draft({ pinEnabled: true, pin: "12" })).ok).toBe(false);
    expect(validateStep(5, draft({ pinEnabled: true, pin: "12a4" })).ok).toBe(false);
    expect(validateStep(5, draft({ pinEnabled: true, pin: "1234" })).ok).toBe(true);
  });

  it("ignores a stale PIN once the toggle is off", () => {
    // Turning the lock off must not strand the user behind a half-typed PIN.
    expect(validateStep(5, draft({ pinEnabled: false, pin: "12" })).ok).toBe(true);
  });

  it("passes Right away with no date at all", () => {
    expect(validateStep(5, draft({ scheduleMode: "now", scheduledAt: null })).ok).toBe(true);
  });
});

describe("validateStep — steps with nothing required", () => {
  it("lets C3 and C6 through untouched", () => {
    expect(validateStep(3, draft()).ok).toBe(true);
    expect(validateStep(6, draft()).ok).toBe(true);
  });
});
