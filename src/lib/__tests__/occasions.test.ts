import {
  AI_VIBES,
  HANDOFF_OCCASIONS,
  getHandoffOccasion,
  occasionLabel,
  occasionsForVibe,
} from "../occasions";

describe("HANDOFF_OCCASIONS", () => {
  it("offers exactly the six rows frame C1 shows, in frame order", () => {
    expect(HANDOFF_OCCASIONS.map((o) => o.label)).toEqual([
      "Birthday",
      "Anniversary",
      "Date invite",
      "Festival",
      "Apology",
      "Custom",
    ]);
  });

  it("carries the handoff descriptions verbatim", () => {
    expect(HANDOFF_OCCASIONS.map((o) => o.description)).toEqual([
      "Cake, candles, everyone in on it.",
      "Years of you two, in one page.",
      "Make the ask impossible to refuse.",
      "Lights, family, the whole crew.",
      "Say it properly this time.",
      "Any moment worth a reveal.",
    ]);
  });

  it("uses ids that already exist in production rows", () => {
    // `date`, not `date_invite` — an invite created before this list shipped
    // must keep resolving to a label.
    expect(HANDOFF_OCCASIONS.map((o) => o.id)).toEqual([
      "birthday",
      "anniversary",
      "date",
      "festival",
      "apology",
      "custom",
    ]);
  });
});

describe("occasionLabel", () => {
  it("resolves an offered occasion", () => {
    expect(occasionLabel("birthday")).toBe("Birthday");
  });

  it("resolves legacy ids C1 no longer offers", () => {
    expect(occasionLabel("mothers_day")).toBe("Mother's Day");
    expect(occasionLabel("fathers_day")).toBe("Father's Day");
  });

  it("humanises an id it has never seen rather than printing the column value", () => {
    expect(occasionLabel("graduation_party")).toBe("Graduation party");
  });

  it("returns an empty string for null so callers can drop the segment", () => {
    expect(occasionLabel(null)).toBe("");
    expect(occasionLabel(undefined)).toBe("");
    expect(occasionLabel("")).toBe("");
  });
});

describe("getHandoffOccasion", () => {
  it("finds an offered occasion and misses an unoffered one", () => {
    expect(getHandoffOccasion("anniversary")?.label).toBe("Anniversary");
    expect(getHandoffOccasion("mothers_day")).toBeUndefined();
  });
});

describe("occasionsForVibe", () => {
  it("names the four vibes the handoff specifies", () => {
    expect(AI_VIBES.map((v) => v.label)).toEqual([
      "Warm & cosy",
      "Romantic",
      "Fun & loud",
      "Elegant",
    ]);
  });

  it("reorders without dropping anything — the user still sees all six", () => {
    const ordered = occasionsForVibe("romantic");
    expect(ordered).toHaveLength(HANDOFF_OCCASIONS.length);
    expect(new Set(ordered.map((o) => o.id))).toEqual(
      new Set(HANDOFF_OCCASIONS.map((o) => o.id))
    );
  });

  it("puts the vibe's picks first", () => {
    expect(occasionsForVibe("romantic").slice(0, 3).map((o) => o.id)).toEqual([
      "anniversary",
      "date",
      "custom",
    ]);
  });

  it("does not mutate the source list", () => {
    const before = HANDOFF_OCCASIONS.map((o) => o.id);
    occasionsForVibe("fun");
    expect(HANDOFF_OCCASIONS.map((o) => o.id)).toEqual(before);
  });
});
