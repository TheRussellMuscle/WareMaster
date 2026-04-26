import { describe, expect, it } from 'vitest';
import { classifyOutcome, rollDice } from './roll';
import { createRng } from './rng';

describe('rollDice', () => {
  it('returns auto-rolled dice in [1, faces]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const r = rollDice({ dice: 1, faces: 10, baseAttribute: 0 }, rng);
      expect(r.diceRolled).toHaveLength(1);
      expect(r.diceRolled[0]).toBeGreaterThanOrEqual(1);
      expect(r.diceRolled[0]).toBeLessThanOrEqual(10);
    }
  });

  it('sums dice + baseAttribute + skillLevel + modifier', () => {
    const r = rollDice({
      dice: 1,
      faces: 10,
      baseAttribute: 3,
      skillLevel: 2,
      modifier: 1,
      manual: [4],
    });
    expect(r.diceRolled).toEqual([4]);
    expect(r.total).toBe(4 + 3 + 2 + 1);
  });

  it('substitutes manual dice exactly', () => {
    const r = rollDice({
      dice: 3,
      faces: 10,
      baseAttribute: 0,
      manual: [10, 5, 2],
    });
    expect(r.diceRolled).toEqual([10, 5, 2]);
    expect(r.total).toBe(17);
  });

  it('throws when manual length disagrees with dice count', () => {
    expect(() =>
      rollDice({ dice: 2, faces: 10, baseAttribute: 0, manual: [1] }),
    ).toThrow(/count mismatch/);
  });

  it('throws when a manual value is out of range', () => {
    expect(() =>
      rollDice({ dice: 1, faces: 10, baseAttribute: 0, manual: [11] }),
    ).toThrow(/out of range/);
    expect(() =>
      rollDice({ dice: 1, faces: 10, baseAttribute: 0, manual: [0] }),
    ).toThrow(/out of range/);
  });

  it('rejects non-positive dice counts', () => {
    expect(() => rollDice({ dice: 0, faces: 10, baseAttribute: 0 })).toThrow();
    expect(() => rollDice({ dice: -1, faces: 10, baseAttribute: 0 })).toThrow();
  });
});

describe('classifyOutcome', () => {
  it('flags total-failure when every die is 1', () => {
    expect(classifyOutcome([1, 1], 9, 10, 5)).toBe('total-failure');
  });

  it('flags perfect-success only when all-max AND total ≥ difficulty', () => {
    expect(classifyOutcome([10, 10], 24, 10, 20)).toBe('perfect-success');
    // All 10s but total below difficulty: still a regular success since total >= diff fails.
    // Total = 10+10+modifiers; if total < difficulty, classify as failure.
    expect(classifyOutcome([10, 10], 10, 10, 30)).toBe('failure');
  });

  it('flags success on total ≥ difficulty without max dice', () => {
    expect(classifyOutcome([7, 8], 18, 10, 15)).toBe('success');
  });

  it('flags failure on total < difficulty', () => {
    expect(classifyOutcome([3, 4], 9, 10, 15)).toBe('failure');
  });

  it('returns success when no difficulty is given (open roll)', () => {
    expect(classifyOutcome([5], 8, 10, undefined)).toBe('success');
  });

  it('returns total-failure even when no difficulty is given', () => {
    expect(classifyOutcome([1], 1, 10, undefined)).toBe('total-failure');
  });
});
