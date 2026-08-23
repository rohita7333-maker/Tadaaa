/**
 * Custom occasions.
 *
 * C1 offers a "Custom — Any moment worth a reveal." row and then never asks
 * what the custom occasion IS. Picking it published `occasion_type = 'custom'`,
 * so the reveal eyebrow read the bare word "Custom" and the row was, from the
 * user's side, a label that did nothing. Reported as "what's +Custom … I feel
 * everything looks the same once the user clicks on it".
 *
 * No migration is needed for this. `invites.occasion_type` is TEXT with no
 * CHECK constraint, and `occasionLabel()` already title-cases any id it does
 * not recognise — that path exists for pre-handoff rows. A custom occasion can
 * therefore travel as its own id and render correctly everywhere already.
 */
import { toOccasionId, occasionLabel } from "../occasions";
import { emptyWizardDraft, publishOccasionType, validateStep } from "../wizard";

describe("toOccasionId", () => {
  it("slugifies a plain label", () => {
    expect(toOccasionId("Graduation")).toBe("graduation");
  });

  it("joins words with underscores, matching the ids already in the column", () => {
    // Production rows use `mothers_day`, not `mothers-day`.
    expect(toOccasionId("Mothers Day")).toBe("mothers_day");
    expect(toOccasionId("New job")).toBe("new_job");
  });

  it("collapses runs of whitespace and punctuation", () => {
    expect(toOccasionId("  Passed   the   bar!  ")).toBe("passed_the_bar");
    expect(toOccasionId("Sorry — really")).toBe("sorry_really");
  });

  it("strips characters that would not survive a URL or a log line", () => {
    expect(toOccasionId("50% off?")).toBe("50_off");
    expect(toOccasionId("Ramadan/Eid")).toBe("ramadan_eid");
  });

  it("returns empty for input with nothing usable in it", () => {
    expect(toOccasionId("")).toBe("");
    expect(toOccasionId("   ")).toBe("");
    expect(toOccasionId("!!!")).toBe("");
  });

  it("never collides with a built-in occasion id by accident of casing", () => {
    expect(toOccasionId("Birthday")).toBe("birthday");
  });

  it("caps length so one pasted paragraph cannot become a column value", () => {
    const id = toOccasionId("a".repeat(200));
    expect(id.length).toBeLessThanOrEqual(60);
  });

  it("does not leave a trailing separator after truncation", () => {
    const id = toOccasionId(`${"word ".repeat(40)}`);
    expect(id.endsWith("_")).toBe(false);
  });
});

describe("round trip — a custom occasion renders as typed", () => {
  it("survives id conversion and comes back as a readable label", () => {
    expect(occasionLabel(toOccasionId("Graduation"))).toBe("Graduation");
    expect(occasionLabel(toOccasionId("New job"))).toBe("New job");
  });

  it("still resolves the handoff six by their own labels", () => {
    expect(occasionLabel("birthday")).toBe("Birthday");
    expect(occasionLabel("anniversary")).toBe("Anniversary");
  });

  it("still resolves legacy production ids", () => {
    expect(occasionLabel("mothers_day")).toBe("Mother's Day");
  });
});

describe("publishOccasionType — what actually reaches the column", () => {
  it("passes a built-in occasion straight through", () => {
    const d = { ...emptyWizardDraft(), occasion: "birthday" };
    expect(publishOccasionType(d)).toBe("birthday");
  });

  it("replaces 'custom' with the typed occasion's own id", () => {
    const d = { ...emptyWizardDraft(), occasion: "custom", customOccasion: "Graduation" };
    expect(publishOccasionType(d)).toBe("graduation");
  });

  it("ignores a custom name when a built-in occasion is selected", () => {
    // Switching away from Custom must not smuggle the old text into the row.
    const d = { ...emptyWizardDraft(), occasion: "apology", customOccasion: "Graduation" };
    expect(publishOccasionType(d)).toBe("apology");
  });

  it("falls back to 'custom' when the name slugifies to nothing", () => {
    const d = { ...emptyWizardDraft(), occasion: "custom", customOccasion: "!!!" };
    expect(publishOccasionType(d)).toBe("custom");
  });
});

describe("validateStep 1 — Custom has to be named", () => {
  it("blocks Continue when Custom is chosen and nothing is typed", () => {
    const d = { ...emptyWizardDraft(), occasion: "custom", customOccasion: "  " };
    const r = validateStep(1, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("customOccasion");
  });

  it("allows Continue once it is named", () => {
    const d = { ...emptyWizardDraft(), occasion: "custom", customOccasion: "Graduation" };
    expect(validateStep(1, d).ok).toBe(true);
  });

  it("blocks a name made only of punctuation, which would slugify to nothing", () => {
    const d = { ...emptyWizardDraft(), occasion: "custom", customOccasion: "???" };
    expect(validateStep(1, d).ok).toBe(false);
  });

  it("still blocks when no occasion at all is chosen", () => {
    expect(validateStep(1, emptyWizardDraft()).ok).toBe(false);
  });

  it("still passes a plain built-in occasion", () => {
    expect(validateStep(1, { ...emptyWizardDraft(), occasion: "festival" }).ok).toBe(true);
  });
});
