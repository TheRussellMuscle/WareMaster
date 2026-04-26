/**
 * Seedable RNG for the dice engine. Pure: no IO, no React.
 *
 * `mulberry32` is a small, fast, well-distributed 32-bit PRNG. A seed of
 * `undefined` falls back to `Math.random()` for ad-hoc rolls; a numeric seed
 * gives deterministic replay (combat sessions persist their seed → undo/redo
 * replays identically — see PLAN.md §G).
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [1, faces]. */
  nextInt(faces: number): number;
}

/**
 * mulberry32 — adapted from the public-domain reference implementation.
 * Stateless across calls because the closure mutates `state`.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed?: number): Rng {
  const next = seed === undefined ? Math.random : mulberry32(seed);
  return {
    next,
    nextInt(faces: number): number {
      if (faces < 1 || !Number.isInteger(faces)) {
        throw new Error(`faces must be a positive integer, got ${faces}`);
      }
      return Math.floor(next() * faces) + 1;
    },
  };
}
