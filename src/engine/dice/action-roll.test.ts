import { describe, expect, it } from 'vitest';
import { actionRoll, applyReroll, ppGainForActionRoll } from './action-roll';
import { createRng } from './rng';

describe('actionRoll (Rule §07)', () => {
  it('classifies all-1s as total-failure even when total ≥ Difficulty', () => {
    // Single D10 manual=1, Base=20, Difficulty=10 ⇒ total 21 but all dice are 1.
    const result = actionRoll({
      baseAttribute: 20,
      difficulty: 10,
      manual: [1],
    });
    expect(result.outcome).toBe('total-failure');
    expect(result.total).toBe(21);
    expect(result.ppEligible).toBe(true);
  });

  it('classifies all-10s as perfect-success when total ≥ Difficulty', () => {
    const result = actionRoll({
      baseAttribute: 3,
      difficulty: 10,
      manual: [10],
    });
    expect(result.outcome).toBe('perfect-success');
    expect(result.total).toBe(13);
    expect(result.ppEligible).toBe(true);
  });

  it('classifies all-10s + total < Difficulty as failure', () => {
    const result = actionRoll({
      baseAttribute: 0,
      difficulty: 30,
      manual: [10],
    });
    expect(result.outcome).toBe('failure');
  });

  it('classifies regular success', () => {
    const result = actionRoll({
      baseAttribute: 4,
      skillLevel: 2,
      difficulty: 8,
      manual: [5],
    });
    expect(result.outcome).toBe('success');
    expect(result.total).toBe(11);
  });

  it('flags re-roll eligibility when skill ≥ difficulty AND a die is 1', () => {
    const result = actionRoll({
      baseAttribute: 3,
      skillLevel: 5,
      difficulty: 5,
      manual: [1],
    });
    expect(result.canReroll).toBe(true);
  });

  it('does NOT flag re-roll when skill < difficulty', () => {
    const result = actionRoll({
      baseAttribute: 3,
      skillLevel: 4,
      difficulty: 5,
      manual: [1],
    });
    expect(result.canReroll).toBe(false);
  });

  it('does NOT flag re-roll when no die is 1', () => {
    const result = actionRoll({
      baseAttribute: 0,
      skillLevel: 5,
      difficulty: 5,
      manual: [4],
    });
    expect(result.canReroll).toBe(false);
  });

  it('LUC dice add to total and multiplier reflects total dice', () => {
    const result = actionRoll({
      baseAttribute: 0,
      lucDice: 2,
      manual: [3, 4, 5],
    });
    expect(result.total).toBe(12);
    expect(result.lucDiceUsed).toBe(2);
    expect(result.bonusMultiplier).toBe(3);
  });

  it('total-failure on LUC roll requires every die to be 1', () => {
    const result = actionRoll({
      baseAttribute: 0,
      difficulty: 5,
      lucDice: 2,
      manual: [1, 1, 1],
    });
    expect(result.outcome).toBe('total-failure');
  });

  it('LUC dice with one non-1 die is NOT a total-failure', () => {
    const result = actionRoll({
      baseAttribute: 0,
      difficulty: 5,
      lucDice: 2,
      manual: [1, 1, 2],
    });
    expect(result.outcome).toBe('failure');
  });

  it('throws on negative or non-integer lucDice', () => {
    expect(() => actionRoll({ baseAttribute: 0, lucDice: -1 })).toThrow();
    expect(() => actionRoll({ baseAttribute: 0, lucDice: 1.5 })).toThrow();
  });

  it('manual mode produces identical RollResult to auto with the same dice', () => {
    // Drive auto with a deterministic seed; record dice; replay manually.
    const rng = createRng(99);
    const auto = actionRoll(
      { baseAttribute: 2, skillLevel: 1, difficulty: 8, lucDice: 1 },
      rng,
    );
    const manual = actionRoll({
      baseAttribute: 2,
      skillLevel: 1,
      difficulty: 8,
      lucDice: 1,
      manual: auto.diceRolled,
    });
    expect(manual.diceRolled).toEqual(auto.diceRolled);
    expect(manual.total).toBe(auto.total);
    expect(manual.outcome).toBe(auto.outcome);
    expect(manual.canReroll).toBe(auto.canReroll);
  });
});

describe('applyReroll', () => {
  it('replaces a 1 and re-classifies the outcome', () => {
    const initial = actionRoll({
      baseAttribute: 3,
      skillLevel: 5,
      difficulty: 5,
      manual: [1],
    });
    expect(initial.outcome).toBe('total-failure');
    const next = applyReroll(initial, 0, undefined, 8);
    expect(next.diceRolled).toEqual([8]);
    expect(next.total).toBe(8 + 3 + 5);
    expect(next.outcome).toBe('success');
    expect(next.rerollUsed).toBe(true);
    expect(next.canReroll).toBe(false);
  });

  it('throws when re-roll already used', () => {
    const initial = actionRoll({
      baseAttribute: 0,
      skillLevel: 5,
      difficulty: 5,
      manual: [1],
    });
    const once = applyReroll(initial, 0, undefined, 5);
    expect(() => applyReroll(once, 0, undefined, 5)).toThrow();
  });

  it('throws when re-roll is not eligible', () => {
    const initial = actionRoll({
      baseAttribute: 0,
      skillLevel: 1,
      difficulty: 5,
      manual: [1],
    });
    expect(() => applyReroll(initial, 0)).toThrow(/not eligible/);
  });

  it('throws when chosen die is not a 1', () => {
    const initial = actionRoll({
      baseAttribute: 0,
      skillLevel: 5,
      difficulty: 5,
      manual: [1, 4],
      lucDice: 1,
    });
    expect(() => applyReroll(initial, 1)).toThrow(/not a 1/);
  });
});

describe('ppGainForActionRoll', () => {
  it('gives 10 PP on perfect-success and 5 PP on total-failure', () => {
    const ps = actionRoll({ baseAttribute: 5, difficulty: 8, manual: [10] });
    const tf = actionRoll({ baseAttribute: 0, difficulty: 8, manual: [1] });
    expect(ppGainForActionRoll(ps)).toBe(10);
    expect(ppGainForActionRoll(tf)).toBe(5);
  });

  it('multiplies PP by total dice when LUC was spent', () => {
    const ps = actionRoll({
      baseAttribute: 0,
      difficulty: 8,
      lucDice: 2,
      manual: [10, 10, 10],
    });
    expect(ppGainForActionRoll(ps)).toBe(10 * 3);
  });

  it('returns 0 on regular success / failure', () => {
    const ok = actionRoll({ baseAttribute: 5, difficulty: 8, manual: [5] });
    const ko = actionRoll({ baseAttribute: 0, difficulty: 30, manual: [5] });
    expect(ppGainForActionRoll(ok)).toBe(0);
    expect(ppGainForActionRoll(ko)).toBe(0);
  });
});
