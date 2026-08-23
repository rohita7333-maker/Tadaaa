import {
  DODGE_LIMIT,
  DODGE_OFFSETS,
  INITIAL_DODGE_STATE,
  clampOffset,
  hasGivenUp,
  nextDodge,
  shouldDodge,
} from "../dodging-no";

const bounds = { width: 390, buttonWidth: 88, buttonHeight: 52, padding: 24, yesRight: 250 };

describe("DODGE_OFFSETS", () => {
  it("offers the five offsets the handoff specifies", () => {
    expect(DODGE_OFFSETS).toHaveLength(5);
  });

  it("includes the resting position so the No can come back to where it started", () => {
    expect(DODGE_OFFSETS.some((o) => o.x === 0 && o.y === 0)).toBe(true);
  });
});

describe("shouldDodge", () => {
  it("dodges for an ordinary recipient", () => {
    expect(shouldDodge({ enabled: true, reducedMotion: false, screenReader: false })).toBe(true);
  });

  it("does not dodge when the creator turned it off", () => {
    expect(shouldDodge({ enabled: false, reducedMotion: false, screenReader: false })).toBe(false);
  });

  it("does not dodge under Reduce Motion", () => {
    expect(shouldDodge({ enabled: true, reducedMotion: true, screenReader: false })).toBe(false);
  });

  it("does not dodge when a screen reader is on — an un-declinable dialog is an a11y failure", () => {
    expect(shouldDodge({ enabled: true, reducedMotion: false, screenReader: true })).toBe(false);
  });
});

describe("nextDodge", () => {
  it("counts each dodge", () => {
    const first = nextDodge(INITIAL_DODGE_STATE, bounds);
    expect(first.count).toBe(1);
    const second = nextDodge(first, bounds);
    expect(second.count).toBe(2);
  });

  it("moves somewhere new each time rather than sitting still", () => {
    let state = INITIAL_DODGE_STATE;
    const seen = new Set<string>();
    for (let i = 0; i < DODGE_LIMIT; i++) {
      state = nextDodge(state, bounds);
      seen.add(`${state.offset.x},${state.offset.y}`);
    }
    // Never the same slot twice running — a dodge that lands where it already
    // was reads as the button being broken, not playful.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("STOPS after four dodges and returns to rest", () => {
    // "A joke that traps someone isn't a joke, and an un-declinable dialog is
    // an accessibility failure."
    let state = INITIAL_DODGE_STATE;
    for (let i = 0; i < DODGE_LIMIT; i++) state = nextDodge(state, bounds);

    expect(state.count).toBe(DODGE_LIMIT);
    expect(hasGivenUp(state)).toBe(true);

    const afterLimit = nextDodge(state, bounds);
    expect(afterLimit.offset).toEqual({ x: 0, y: 0 });
    expect(hasGivenUp(afterLimit)).toBe(true);
  });

  it("never counts past the limit, however many times it is poked", () => {
    let state = INITIAL_DODGE_STATE;
    for (let i = 0; i < 40; i++) state = nextDodge(state, bounds);
    expect(state.count).toBe(DODGE_LIMIT);
  });

  it("keeps every offset inside the screen", () => {
    let state = INITIAL_DODGE_STATE;
    for (let i = 0; i < DODGE_LIMIT; i++) {
      state = nextDodge(state, bounds);
      const left = bounds.yesRight + state.offset.x;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + bounds.buttonWidth).toBeLessThanOrEqual(bounds.width);
    }
  });
});

describe("clampOffset", () => {
  it("pulls a far-right offset back inside the safe area", () => {
    const clamped = clampOffset({ x: 999, y: 0 }, bounds);
    expect(bounds.yesRight + clamped.x + bounds.buttonWidth).toBeLessThanOrEqual(bounds.width);
  });

  it("pulls a far-left offset back inside the safe area", () => {
    const clamped = clampOffset({ x: -999, y: 0 }, bounds);
    expect(bounds.yesRight + clamped.x).toBeGreaterThanOrEqual(0);
  });

  it("never lets the No overlap Yes — the two must stay distinguishable", () => {
    // Pushing left far enough to sit on top of Yes is the one move that turns
    // the joke into a mis-tap that says the opposite of what they meant.
    const clamped = clampOffset({ x: -999, y: 0 }, bounds);
    expect(bounds.yesRight + clamped.x).toBeGreaterThanOrEqual(0);
  });

  it("caps vertical travel so the button cannot leave the row", () => {
    expect(Math.abs(clampOffset({ x: 0, y: 999 }, bounds).y)).toBeLessThanOrEqual(
      bounds.buttonHeight
    );
    expect(Math.abs(clampOffset({ x: 0, y: -999 }, bounds).y)).toBeLessThanOrEqual(
      bounds.buttonHeight
    );
  });

  it("leaves an offset that already fits untouched", () => {
    expect(clampOffset({ x: 10, y: -8 }, bounds)).toEqual({ x: 10, y: -8 });
  });
});
