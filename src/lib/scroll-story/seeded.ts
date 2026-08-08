/**
 * seeded.ts — Deterministic pseudo-random layout for the Scroll Story reveal.
 *
 * Every value is derived ONLY from the invite slug so server render and
 * client hydration produce byte-identical markup (never Math.random —
 * SSR hydration safety).
 */

const TWO_POW_32 = 4294967296; // 2^32

/** Published bounds for particleLayout output — also asserted in tests. */
export const PARTICLE_BOUNDS = {
  scaleMin: 0.6,
  scaleMax: 1.4,
  delayMax: 4,
  durationMin: 2,
  durationMax: 6,
} as const;

/**
 * FNV-1a 32-bit string hash. Deterministic across platforms.
 * Returns an unsigned 32-bit integer.
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. Given the same seed, yields the same sequence of
 * floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
  };
}

export interface ParticleLayoutOptions {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface Particle {
  x: number;
  y: number;
  scale: number;
  delay: number;
  duration: number;
}

/**
 * Deterministic particle layout seeded by slug. x/y are percentages by
 * default (0–100) unless custom bounds are given; scale/delay/duration
 * stay within PARTICLE_BOUNDS.
 */
export function particleLayout(
  slug: string,
  count: number,
  opts: ParticleLayoutOptions = {}
): Particle[] {
  const { minX = 0, maxX = 100, minY = 0, maxY = 100 } = opts;
  const rand = mulberry32(hashString(slug));
  return Array.from({ length: count }, () => ({
    x: minX + rand() * (maxX - minX),
    y: minY + rand() * (maxY - minY),
    scale:
      PARTICLE_BOUNDS.scaleMin +
      rand() * (PARTICLE_BOUNDS.scaleMax - PARTICLE_BOUNDS.scaleMin),
    delay: rand() * PARTICLE_BOUNDS.delayMax,
    duration:
      PARTICLE_BOUNDS.durationMin +
      rand() * (PARTICLE_BOUNDS.durationMax - PARTICLE_BOUNDS.durationMin),
  }));
}
