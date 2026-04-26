import { describe, expect, it } from 'vitest';
import { saveRoll, suggestedSave } from './save-roll';
import type { Abilities } from '@/domain/character';

const abilities: Abilities = {
  SEN: 12,
  AGI: 12,
  WIL: 9,
  CON: 12,
  CHA: 9,
  LUC: 9,
};

describe('saveRoll', () => {
  it('uses WIL for heavy-crossing-wil', () => {
    // WIL 9 ⇒ Base 3. Manual 5 ⇒ total 8.
    const r = saveRoll({
      kind: 'heavy-crossing-wil',
      abilities,
      difficulty: 7,
      manual: [5],
    });
    expect(r.ability).toBe('WIL');
    expect(r.roll.baseAttribute).toBe(3);
    expect(r.roll.total).toBe(8);
    expect(r.passed).toBe(true);
  });

  it('uses CON for heavy-crossing-con', () => {
    const r = saveRoll({
      kind: 'heavy-crossing-con',
      abilities,
      difficulty: 5,
      manual: [3],
    });
    expect(r.ability).toBe('CON');
    expect(r.roll.baseAttribute).toBe(4); // CON 12 ⇒ Base 4
    expect(r.roll.total).toBe(7);
  });

  it('Heavy state action save fails when total < accumulated overflow', () => {
    const r = saveRoll({
      kind: 'heavy-state-action',
      abilities,
      difficulty: 12,
      manual: [3],
    });
    expect(r.passed).toBe(false);
  });

  it('LUC Roll uses all dice as LUC and no Base value', () => {
    // 3 LUC dice, manual [4, 5, 6] → sum 15.
    const r = saveRoll({
      kind: 'luc-roll',
      abilities,
      difficulty: 14,
      lucDice: 3,
      manual: [4, 5, 6],
    });
    expect(r.ability).toBe('LUC');
    expect(r.roll.baseAttribute).toBe(0);
    expect(r.roll.total).toBe(15);
    expect(r.passed).toBe(true);
  });

  it('LUC Roll defaults to 1 die if not specified', () => {
    const r = saveRoll({
      kind: 'luc-roll',
      abilities,
      difficulty: 4,
      manual: [5],
    });
    expect(r.roll.total).toBe(5);
  });

  it('custom save requires an ability', () => {
    expect(() =>
      saveRoll({
        kind: 'custom',
        abilities,
        difficulty: 5,
        manual: [3],
      }),
    ).toThrow(/ability/);
  });

  it('custom save uses provided ability', () => {
    const r = saveRoll({
      kind: 'custom',
      abilities,
      ability: 'SEN',
      difficulty: 5,
      manual: [3],
    });
    expect(r.ability).toBe('SEN');
    expect(r.roll.baseAttribute).toBe(4); // SEN 12 ⇒ Base 4
  });

  it('incap-revive applies AGI + Medicine skill level', () => {
    const r = saveRoll({
      kind: 'incap-revive',
      abilities,
      difficulty: 12,
      skillLevel: 3,
      manual: [5],
    });
    expect(r.ability).toBe('AGI');
    expect(r.roll.baseAttribute).toBe(4);
    expect(r.roll.skillLevel).toBe(3);
    expect(r.roll.total).toBe(5 + 4 + 3);
  });
});

describe('suggestedSave', () => {
  it('returns null when in light damage', () => {
    expect(
      suggestedSave({
        physicalDamage: 5,
        mentalDamage: 3,
        physicalDurability: 12,
        mentalDurability: 9,
      }),
    ).toBeNull();
  });

  it('returns Heavy-state WIL save when physical exceeds Durability', () => {
    const sug = suggestedSave({
      physicalDamage: 18,
      mentalDamage: 0,
      physicalDurability: 12,
      mentalDurability: 9,
    });
    expect(sug).toEqual({
      kind: 'heavy-state-action',
      ability: 'WIL',
      difficulty: 6,
    });
  });

  it('returns Heavy-state WIL save when mental exceeds Durability', () => {
    const sug = suggestedSave({
      physicalDamage: 0,
      mentalDamage: 14,
      physicalDurability: 12,
      mentalDurability: 9,
    });
    expect(sug).toEqual({
      kind: 'heavy-state-action',
      ability: 'WIL',
      difficulty: 5,
    });
  });

  it('prefers the larger overflow when both tracks are Heavy', () => {
    const sug = suggestedSave({
      physicalDamage: 20,
      mentalDamage: 12,
      physicalDurability: 12,
      mentalDurability: 9,
    });
    // Phys overflow 8, Mental overflow 3 → Phys WIL save.
    expect(sug?.difficulty).toBe(8);
  });
});
