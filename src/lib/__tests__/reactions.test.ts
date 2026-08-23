import {
  REACTIONS,
  applyOptimistic,
  countsFromRows,
  formatReactionCount,
  isReactionKey,
} from "../reactions";

describe("REACTIONS", () => {
  it("is the handoff's four, in D2's order", () => {
    expect(REACTIONS.map((r) => r.glyph)).toEqual(["❤️", "😂", "😢", "🔥"]);
  });

  it("stores NAMES, never the glyph — the server's allowlist is heart/laugh/cry/fire", () => {
    // `record_reaction` rejects anything else with `invalid_emoji`, and a glyph
    // in a text column drifts the moment a platform re-renders it.
    expect(REACTIONS.map((r) => r.key)).toEqual(["heart", "laugh", "cry", "fire"]);
  });
});

describe("isReactionKey", () => {
  it("accepts the four the server allows and nothing else", () => {
    for (const k of ["heart", "laugh", "cry", "fire"]) expect(isReactionKey(k)).toBe(true);
    expect(isReactionKey("poop")).toBe(false);
    expect(isReactionKey("❤️")).toBe(false);
    expect(isReactionKey("")).toBe(false);
  });
});

describe("countsFromRows", () => {
  it("maps server rows onto every key, zero-filling the rest", () => {
    expect(countsFromRows([{ emoji: "heart", count: 12 }])).toEqual({
      heart: 12,
      laugh: 0,
      cry: 0,
      fire: 0,
    });
  });

  it("coerces a string count — PostgREST returns bigint as a string", () => {
    expect(countsFromRows([{ emoji: "fire", count: "7" as unknown as number }]).fire).toBe(7);
  });

  it("ignores a row whose emoji is not one of the four", () => {
    // A value written before the allowlist existed must not crash the bar or
    // render a fifth column.
    const out = countsFromRows([
      { emoji: "heart", count: 2 },
      { emoji: "sparkle", count: 99 },
    ]);
    expect(out).toEqual({ heart: 2, laugh: 0, cry: 0, fire: 0 });
  });

  it("survives null and an empty list", () => {
    expect(countsFromRows(null)).toEqual({ heart: 0, laugh: 0, cry: 0, fire: 0 });
    expect(countsFromRows([])).toEqual({ heart: 0, laugh: 0, cry: 0, fire: 0 });
  });
});

describe("applyOptimistic", () => {
  const base = { heart: 3, laugh: 0, cry: 0, fire: 1 };

  it("bumps only the tapped key", () => {
    expect(applyOptimistic(base, "heart")).toEqual({ heart: 4, laugh: 0, cry: 0, fire: 1 });
  });

  it("does not mutate the previous counts", () => {
    applyOptimistic(base, "fire");
    expect(base.fire).toBe(1);
  });

  it("allows repeat taps — the handoff floats an emoji each time", () => {
    let c = base;
    c = applyOptimistic(c, "laugh");
    c = applyOptimistic(c, "laugh");
    expect(c.laugh).toBe(2);
  });
});

describe("formatReactionCount", () => {
  it("hides a zero rather than printing it beside the emoji", () => {
    expect(formatReactionCount(0)).toBe("");
  });

  it("prints small counts plainly", () => {
    expect(formatReactionCount(1)).toBe("1");
    expect(formatReactionCount(999)).toBe("999");
  });

  it("abbreviates once the pill would stop fitting", () => {
    expect(formatReactionCount(1000)).toBe("1k");
    expect(formatReactionCount(1500)).toBe("1.5k");
    expect(formatReactionCount(12000)).toBe("12k");
  });
});
