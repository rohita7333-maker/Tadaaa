import { describe, it, expect } from "vitest";
import {
  hashString,
  mulberry32,
  particleLayout,
  PARTICLE_BOUNDS,
} from "./seeded";

describe("hashString", () => {
  it("returns the same value for the same input", () => {
    // Arrange
    const input = "demo";

    // Act
    const first = hashString(input);
    const second = hashString(input);

    // Assert
    expect(first).toBe(second);
  });

  it("returns a 32-bit unsigned integer", () => {
    const h = hashString("tadaaaa-scroll-story");

    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it("returns different values for different inputs", () => {
    expect(hashString("demo")).not.toBe(hashString("demo-2"));
    expect(hashString("")).not.toBe(hashString("a"));
  });
});

describe("mulberry32", () => {
  it("produces an identical sequence for the same seed", () => {
    // Arrange
    const randA = mulberry32(1234);
    const randB = mulberry32(1234);

    // Act
    const seqA = Array.from({ length: 20 }, () => randA());
    const seqB = Array.from({ length: 20 }, () => randB());

    // Assert
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const randA = mulberry32(1);
    const randB = mulberry32(2);

    const seqA = Array.from({ length: 10 }, () => randA());
    const seqB = Array.from({ length: 10 }, () => randB());

    expect(seqA).not.toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rand = mulberry32(hashString("bounds-check"));

    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("particleLayout", () => {
  it("returns identical arrays for the same slug (deep equal across two calls)", () => {
    // Arrange + Act
    const a = particleLayout("demo", 30);
    const b = particleLayout("demo", 30);

    // Assert
    expect(a).toEqual(b);
  });

  it("returns different layouts for different slugs", () => {
    const a = particleLayout("demo", 30);
    const b = particleLayout("another-slug", 30);

    expect(a).not.toEqual(b);
  });

  it("respects the requested count", () => {
    expect(particleLayout("demo", 0)).toHaveLength(0);
    expect(particleLayout("demo", 1)).toHaveLength(1);
    expect(particleLayout("demo", 40)).toHaveLength(40);
  });

  it("keeps x/y within default bounds (0-100)", () => {
    const particles = particleLayout("demo", 200);

    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("keeps x/y within custom bounds", () => {
    const particles = particleLayout("demo", 200, {
      minX: 10,
      maxX: 20,
      minY: 40,
      maxY: 60,
    });

    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(10);
      expect(p.x).toBeLessThanOrEqual(20);
      expect(p.y).toBeGreaterThanOrEqual(40);
      expect(p.y).toBeLessThanOrEqual(60);
    }
  });

  it("keeps scale/delay/duration within published bounds", () => {
    const particles = particleLayout("demo", 200);

    for (const p of particles) {
      expect(p.scale).toBeGreaterThanOrEqual(PARTICLE_BOUNDS.scaleMin);
      expect(p.scale).toBeLessThanOrEqual(PARTICLE_BOUNDS.scaleMax);
      expect(p.delay).toBeGreaterThanOrEqual(0);
      expect(p.delay).toBeLessThanOrEqual(PARTICLE_BOUNDS.delayMax);
      expect(p.duration).toBeGreaterThanOrEqual(PARTICLE_BOUNDS.durationMin);
      expect(p.duration).toBeLessThanOrEqual(PARTICLE_BOUNDS.durationMax);
    }
  });
});
