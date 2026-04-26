import { describe, expect, it } from 'vitest';
import {
  rerollExcept,
  rollSixAbilities,
  rollValidSixAbilities,
  validateAbilityRoll,
  pairedSkillForGate,
} from './ability-roll';
import type { Class } from '@/domain/class';

describe('validateAbilityRoll (Rule §03 §1.1)', () => {
  it('passes a balanced spread', () => {
    const result = validateAbilityRoll({
      SEN: 9,
      AGI: 10,
      WIL: 8,
      CON: 11,
      CHA: 9,
      LUC: 12,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects three or more scores below 8', () => {
    const result = validateAbilityRoll({
      SEN: 7,
      AGI: 7,
      WIL: 7,
      CON: 11,
      CHA: 9,
      LUC: 12,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/below 8/);
    }
  });

  it('passes when only two scores are below 8', () => {
    const result = validateAbilityRoll({
      SEN: 7,
      AGI: 7,
      WIL: 9,
      CON: 11,
      CHA: 9,
      LUC: 12,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects when any score is above 13', () => {
    const result = validateAbilityRoll({
      SEN: 9,
      AGI: 10,
      WIL: 14,
      CON: 11,
      CHA: 9,
      LUC: 12,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/14/);
    }
  });

  it('accepts exactly 13', () => {
    const result = validateAbilityRoll({
      SEN: 13,
      AGI: 10,
      WIL: 9,
      CON: 11,
      CHA: 9,
      LUC: 12,
    });
    expect(result.ok).toBe(true);
  });

  it('describes both failure modes when both happen', () => {
    const result = validateAbilityRoll({
      SEN: 7,
      AGI: 7,
      WIL: 7,
      CON: 14,
      CHA: 9,
      LUC: 9,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/below 8/);
      expect(result.reason).toMatch(/above 13/);
    }
  });
});

describe('rollValidSixAbilities', () => {
  it('returns a spread that passes validation', () => {
    for (let i = 0; i < 25; i++) {
      const a = rollValidSixAbilities();
      expect(validateAbilityRoll(a).ok).toBe(true);
    }
  });

  it('returns the safe fallback when attempt cap exhausted', () => {
    const a = rollValidSixAbilities(0);
    expect(a).toEqual({ SEN: 9, AGI: 9, WIL: 9, CON: 9, CHA: 9, LUC: 9 });
  });
});

describe('rollSixAbilities', () => {
  it('produces values in the 3..15 range', () => {
    for (let i = 0; i < 50; i++) {
      const a = rollSixAbilities();
      for (const code of ['SEN', 'AGI', 'WIL', 'CON', 'CHA', 'LUC'] as const) {
        expect(a[code]).toBeGreaterThanOrEqual(3);
        expect(a[code]).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe('rerollExcept', () => {
  it('preserves locked scores and changes only the others', () => {
    const before = {
      SEN: 5,
      AGI: 6,
      WIL: 7,
      CON: 8,
      CHA: 9,
      LUC: 10,
    };
    const keep = new Set<'SEN' | 'AGI' | 'WIL' | 'CON' | 'CHA' | 'LUC'>([
      'SEN',
      'CON',
    ]);
    const after = rerollExcept(before, keep);
    expect(after.SEN).toBe(5);
    expect(after.CON).toBe(8);
    // Other scores should land somewhere in the 3..15 range.
    expect(after.AGI).toBeGreaterThanOrEqual(3);
    expect(after.AGI).toBeLessThanOrEqual(15);
  });
});

describe('pairedSkillForGate', () => {
  const cls: Class = {
    id: 'word-caster',
    name: 'Word-Caster',
    source: 'test',
    description: 'test',
    perks: [],
    gates_with_paired_skills: {
      sun: { paired_skill: 'Astronomy' },
      fire: { paired_skill: 'Pharmacology' },
    },
  };

  it('finds the paired skill for a known gate', () => {
    expect(pairedSkillForGate('sun', cls)).toEqual({
      gate: 'sun',
      pairedSkillName: 'Astronomy',
    });
  });

  it('returns null for an unmapped gate', () => {
    expect(pairedSkillForGate('moon', cls)).toBeNull();
  });

  it('returns null for a class without gate mapping', () => {
    const other: Class = {
      id: 'warrior',
      name: 'Warrior',
      source: 'test',
      description: 'test',
      perks: [],
    };
    expect(pairedSkillForGate('sun', other)).toBeNull();
  });
});
