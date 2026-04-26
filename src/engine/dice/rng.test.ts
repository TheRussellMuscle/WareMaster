import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('produces values in [1, faces] for nextInt', () => {
    const rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      const n = rng.nextInt(10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.nextInt(10));
    const seqB = Array.from({ length: 20 }, () => b.nextInt(10));
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 20 }, () => a.nextInt(10));
    const seqB = Array.from({ length: 20 }, () => b.nextInt(10));
    expect(seqA).not.toEqual(seqB);
  });

  it('falls back to Math.random when seed is undefined', () => {
    const rng = createRng();
    for (let i = 0; i < 50; i++) {
      const n = rng.nextInt(5);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('rejects non-positive or non-integer face counts', () => {
    const rng = createRng(0);
    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(-1)).toThrow();
    expect(() => rng.nextInt(2.5)).toThrow();
  });
});
