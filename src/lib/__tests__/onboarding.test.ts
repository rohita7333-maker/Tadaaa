import {
  CELEBRATE_CHIPS,
  ONBOARDING_STEPS,
  ALL_OF_IT,
  onboardingProgress,
  toggleChip,
  toOccasionIds,
  welcomePane,
  WELCOME_PANES,
} from "../onboarding";

describe("WELCOME_PANES", () => {
  it("is A1's three panes, copy verbatim", () => {
    expect(WELCOME_PANES.map((p) => p.headline)).toEqual([
      "A surprise designed to be opened.",
      "Everyone piles on.",
      "They open it. You watch.",
    ]);
  });

  it("gives every pane a body — the frame's 17px line is never blank", () => {
    for (const p of WELCOME_PANES) expect(p.body.length).toBeGreaterThan(0);
  });
});

describe("welcomePane", () => {
  it("returns the pane at an index", () => {
    expect(welcomePane(1).headline).toBe("Everyone piles on.");
  });

  it("clamps rather than returning undefined at either end", () => {
    // A swipe that overshoots must not blank the headline.
    expect(welcomePane(-1)).toBe(WELCOME_PANES[0]);
    expect(welcomePane(99)).toBe(WELCOME_PANES[WELCOME_PANES.length - 1]);
  });
});

describe("CELEBRATE_CHIPS", () => {
  it("is A3's six chips, in frame order", () => {
    expect(CELEBRATE_CHIPS.map((c) => c.label)).toEqual([
      "Birthdays",
      "Anniversaries",
      "Festivals",
      "Date nights",
      "Apologies",
      "All of it",
    ]);
  });
});

describe("toggleChip", () => {
  it("adds and removes", () => {
    expect(toggleChip([], "birthday")).toEqual(["birthday"]);
    expect(toggleChip(["birthday"], "birthday")).toEqual([]);
  });

  it("is multi-select — the frame shows two chips lit at once", () => {
    expect(toggleChip(["birthday"], "festival").sort()).toEqual(["birthday", "festival"]);
  });

  it("All of it selects every other chip, and nothing is left unlit", () => {
    const out = toggleChip([], ALL_OF_IT);
    for (const chip of CELEBRATE_CHIPS) {
      if (chip.id !== ALL_OF_IT) expect(out).toContain(chip.id);
    }
  });

  it("All of it a second time clears everything", () => {
    const all = toggleChip([], ALL_OF_IT);
    expect(toggleChip(all, ALL_OF_IT)).toEqual([]);
  });

  it("never stores the All of it pseudo-id itself", () => {
    // It is a shortcut, not an occasion. Persisting it would put a value in
    // `profiles.occasions[]` that no template can ever match.
    expect(toggleChip([], ALL_OF_IT)).not.toContain(ALL_OF_IT);
  });

  it("does not mutate the array it was given", () => {
    const before = ["birthday"];
    toggleChip(before, "festival");
    expect(before).toEqual(["birthday"]);
  });
});

describe("toOccasionIds", () => {
  it("maps chip ids straight through — they ARE occasion ids", () => {
    expect(toOccasionIds(["birthday", "anniversary"])).toEqual(["birthday", "anniversary"]);
  });

  it("drops anything not a real occasion", () => {
    expect(toOccasionIds([ALL_OF_IT, "birthday"])).toEqual(["birthday"]);
  });

  it("de-duplicates", () => {
    expect(toOccasionIds(["birthday", "birthday"])).toEqual(["birthday"]);
  });
});

describe("onboardingProgress", () => {
  it("lights one of three bars per step", () => {
    expect(onboardingProgress(1)).toEqual([true, false, false]);
    expect(onboardingProgress(2)).toEqual([true, true, false]);
    expect(onboardingProgress(3)).toEqual([true, true, true]);
  });

  it("always returns three, whatever it is given", () => {
    expect(onboardingProgress(0)).toHaveLength(3);
    expect(onboardingProgress(9)).toHaveLength(3);
  });

  it("names three steps, and A4 is the last of them", () => {
    expect(ONBOARDING_STEPS).toHaveLength(3);
    expect(ONBOARDING_STEPS[2]).toBe("notifications");
  });
});
