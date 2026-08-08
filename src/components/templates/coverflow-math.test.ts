import { describe, expect, it } from "vitest";
import { fanSlot, wrapOffset, MAX_VISIBLE_OFFSET } from "./coverflow-math";

const WIDE_TRACK = 1200; // 1200 / 5.6 ≈ 214 → x-step capped at 150
const NARROW_TRACK = 560; // 560 / 5.6 = 100 → x-step 100

describe("fanSlot", () => {
  it("returns identity for the center card", () => {
    // Arrange / Act
    const slot = fanSlot(0, WIDE_TRACK);

    // Assert
    expect(slot.x).toBe(0);
    expect(slot.z).toBe(0);
    expect(slot.rotY).toBe(0);
    expect(slot.scale).toBe(1);
    expect(slot.brightness).toBe(1);
    expect(slot.zIndex).toBe(50);
    expect(slot.visible).toBe(true);
  });

  it("mirrors x and rotY for symmetric offsets, keeping depth values equal", () => {
    const right = fanSlot(1, WIDE_TRACK);
    const left = fanSlot(-1, WIDE_TRACK);

    expect(right.x).toBe(-left.x);
    expect(right.rotY).toBe(-left.rotY);
    expect(right.z).toBe(left.z);
    expect(right.scale).toBe(left.scale);
    expect(right.brightness).toBe(left.brightness);
    expect(right.zIndex).toBe(left.zIndex);
  });

  it("caps the x step at 150px on wide tracks and uses trackWidth/5.6 on narrow ones", () => {
    expect(fanSlot(1, WIDE_TRACK).x).toBe(150);
    expect(fanSlot(2, WIDE_TRACK).x).toBe(300);
    expect(fanSlot(1, NARROW_TRACK).x).toBe(100);
    expect(fanSlot(-2, NARROW_TRACK).x).toBe(-200);
  });

  it("clamps rotY magnitude to 52 degrees", () => {
    // offset 3 → 3 × -26 = -78 raw → clamped
    expect(fanSlot(3, WIDE_TRACK).rotY).toBe(-52);
    expect(fanSlot(-3, WIDE_TRACK).rotY).toBe(52);
    // offset 2 → 52 exactly at the boundary, unclipped
    expect(fanSlot(2, WIDE_TRACK).rotY).toBe(-52);
    expect(fanSlot(1, WIDE_TRACK).rotY).toBe(-26);
  });

  it("floors scale at 0.62", () => {
    expect(fanSlot(1, WIDE_TRACK).scale).toBeCloseTo(0.87, 10);
    expect(fanSlot(2, WIDE_TRACK).scale).toBeCloseTo(0.74, 10);
    expect(fanSlot(3, WIDE_TRACK).scale).toBe(0.62); // 1 - 0.39 = 0.61 → floored
    expect(fanSlot(5, WIDE_TRACK).scale).toBe(0.62);
  });

  it("dims brightness and lowers zIndex with distance", () => {
    expect(fanSlot(2, WIDE_TRACK).brightness).toBeCloseTo(0.82, 10);
    expect(fanSlot(2, WIDE_TRACK).zIndex).toBe(48);
    expect(fanSlot(-2, WIDE_TRACK).zIndex).toBe(48);
  });

  it("hides cards beyond |offset| > 3", () => {
    expect(fanSlot(MAX_VISIBLE_OFFSET, WIDE_TRACK).visible).toBe(true);
    expect(fanSlot(-MAX_VISIBLE_OFFSET, WIDE_TRACK).visible).toBe(true);
    expect(fanSlot(4, WIDE_TRACK).visible).toBe(false);
    expect(fanSlot(-4, WIDE_TRACK).visible).toBe(false);
  });
});

describe("wrapOffset", () => {
  it("wraps the last card to sit one step left of a center at 0 (n=7)", () => {
    expect(wrapOffset(6, 0, 7)).toBe(-1);
  });

  it("wraps the first card to sit one step right of a center at the end (n=7)", () => {
    expect(wrapOffset(0, 6, 7)).toBe(1);
  });

  it("keeps offsets within (-n/2, n/2]", () => {
    expect(wrapOffset(3, 0, 7)).toBe(3);
    expect(wrapOffset(4, 0, 7)).toBe(-3);
    expect(wrapOffset(5, 0, 7)).toBe(-2);
  });

  it("returns 0 when index equals center", () => {
    expect(wrapOffset(2, 2, 7)).toBe(0);
  });
});
