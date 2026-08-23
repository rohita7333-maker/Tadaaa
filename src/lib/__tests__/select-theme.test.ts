/**
 * `selectTheme` — C4's "Change" must change ONLY the theme.
 *
 * This exists as a named, tested function rather than an inline
 * `patch({ themeId })` because the rule is not obvious from the call site and
 * has already been broken once.
 *
 * C4's card reads "Theme: Warm Embrace" and its control says CHANGE, but the
 * control used to navigate to the themes tab, whose "Use this theme" applies a
 * TEMPLATE — and a template carries `occasionId` and `revealType` alongside
 * `themeId`. Changing the theme therefore silently rewrote the occasion picked
 * at C1 and the reveal style picked at C4. Verified in a browser: a wizard
 * titled "Theme jump repro" came back with the theme applied, the title gone,
 * and `revealStyle` switched to "scroll" by the template.
 *
 * If someone re-adds template semantics here, these tests fail.
 */
import { emptyWizardDraft, selectTheme, type WizardDraft } from "../wizard";

function filled(): WizardDraft {
  return {
    ...emptyWizardDraft(),
    occasion: "custom",
    customOccasion: "Passed the bar",
    title: "Aisha did it",
    message: "Three years of night classes.",
    question: "Will you be there?",
    dodgingNo: false,
    contributionsOpen: true,
    revealStyle: "countdown",
    scheduleMode: "schedule",
    scheduledAt: "2030-06-01T18:00:00.000Z",
    timezone: "Europe/London",
    addToCalendar: true,
    pinEnabled: true,
    pin: "2718",
    pinHint: "The year we met",
    themeId: "warm-embrace",
  };
}

describe("selectTheme", () => {
  it("changes the theme", () => {
    expect(selectTheme(filled(), "golden-hour").themeId).toBe("golden-hour");
  });

  it("changes NOTHING else", () => {
    const before = filled();
    const after = selectTheme(before, "golden-hour");
    // Compared field by field via a single object diff: a new field added to
    // WizardDraft later is covered automatically.
    expect({ ...after, themeId: before.themeId }).toEqual(before);
  });

  it("leaves the occasion alone — the template path used to overwrite it", () => {
    const after = selectTheme(filled(), "midnight-romance");
    expect(after.occasion).toBe("custom");
    expect(after.customOccasion).toBe("Passed the bar");
  });

  it("leaves the reveal style alone — the template path used to overwrite it", () => {
    expect(selectTheme(filled(), "midnight-romance").revealStyle).toBe("countdown");
  });

  it("does not mutate the draft it was given", () => {
    const before = filled();
    selectTheme(before, "golden-hour");
    expect(before.themeId).toBe("warm-embrace");
  });

  it("refuses an unknown theme id rather than writing it", () => {
    // A themeId with no matching theme silently falls back to themes[0] at
    // render time, so the wizard would show one theme and publish another.
    const before = filled();
    expect(selectTheme(before, "not-a-theme")).toEqual(before);
    expect(selectTheme(before, "")).toEqual(before);
  });

  it("is a no-op when the theme is already selected", () => {
    const before = filled();
    expect(selectTheme(before, "warm-embrace")).toEqual(before);
  });
});
