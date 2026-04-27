import { describe, expect, it } from 'vitest';
import { resolveAttack } from './attack';

const longswordAttack = {
  baseBN: 4,
  weaponBnModifier: 1,
  weaponSkillLevel: 2,
  criticalValue: 9,
  damageFormula: '1D10+3',
  targetDN: 10,
  targetAbsorption: 2,
};

describe('resolveAttack (Rule §08)', () => {
  it('miss when total < target DN', () => {
    const r = resolveAttack({
      ...longswordAttack,
      targetDN: 30,
      manualBn: [3],
      manualDamage: [5],
    });
    expect(r.outcome).toBe('miss');
    expect(r.damageDealt).toBe(0);
    expect(r.damageDice).toEqual([]);
  });

  it('hit when total ≥ target DN, damage minus absorption', () => {
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [5], // 5 + 4 + 1 + 2 = 12 ≥ 10 hit
      manualDamage: [7], // 7 + 3 = 10
    });
    expect(r.outcome).toBe('hit');
    expect(r.damageRollTotal).toBe(10);
    expect(r.damageDealt).toBe(10 - 2);
  });

  it('Critical Hit when dice ≥ critical value AND total ≥ DN', () => {
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [9], // dice 9 ≥ critical 9 AND total 16 ≥ 10
      manualDamage: [7], // 7 + 3 = 10
    });
    expect(r.outcome).toBe('critical-hit');
    expect(r.isCritical).toBe(true);
    // Damage × (BN dice count + 1) = 10 × 2 = 20; minus absorption 2 = 18.
    expect(r.damageDealt).toBe(20 - 2);
    expect(r.ppGain).toBe(0); // crit alone is not perfect success
  });

  it('Crit needs total ≥ DN even if dice qualify', () => {
    const r = resolveAttack({
      ...longswordAttack,
      baseBN: 0,
      weaponBnModifier: 0,
      weaponSkillLevel: 0,
      targetDN: 10,
      manualBn: [9], // total = 9 < DN 10
      manualDamage: [7],
    });
    expect(r.outcome).toBe('miss');
  });

  it('Perfect Success: all 10s + total ≥ DN — crit + PP, no LUC restoration', () => {
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [10],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('perfect-success');
    expect(r.isCritical).toBe(true);
    expect(r.ppGain).toBe(10);
    expect(r.damageDealt).toBe(10 * 2 - 2);
  });

  it('Total Failure: all 1s, no damage, half PP, IN halved next segment', () => {
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [1],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('total-failure');
    expect(r.damageDealt).toBe(0);
    expect(r.damageDice).toEqual([]);
    expect(r.ppGain).toBe(5);
    expect(r.inHalvedNextSegment).toBe(true);
    expect(r.weaponMayBreak).toBe(true);
  });

  it('Crit damage with multiple BN dice (LUC) multiplies by (n + 1)', () => {
    const r = resolveAttack({
      ...longswordAttack,
      lucDice: 1,
      manualBn: [9, 10], // both ≥ crit 9, total = 19 + 7 = 26 ≥ 10
      manualDamage: [7],
    });
    expect(r.outcome).toBe('critical-hit');
    // 2 BN dice → multiplier 3. Damage = 10 × 3 = 30; minus 2 absorption = 28.
    expect(r.damageDealt).toBe(30 - 2);
  });

  it('damage caps at the weapon max when LUC dice are added', () => {
    // 1D10+3 max = 13. Spend 1 damage LUC die → 2 dice; manual [10, 10] → raw 23
    // capped to 13. Crit not applied here (regular hit).
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [5], // hit, total 12 ≥ 10
      damageLucDice: 1,
      manualDamage: [10, 10],
    });
    expect(r.outcome).toBe('hit');
    expect(r.damageRollTotal).toBe(13);
    expect(r.damageDealt).toBe(13 - 2);
  });

  it('absorption never lets damage go below 0', () => {
    const r = resolveAttack({
      ...longswordAttack,
      targetAbsorption: 100,
      manualBn: [5],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('hit');
    expect(r.damageDealt).toBe(0);
  });

  it('flatDamageBonus (Warrior +1) added on a normal hit', () => {
    const r = resolveAttack({
      ...longswordAttack,
      flatDamageBonus: 1,
      manualBn: [5], // hit
      manualDamage: [7], // 7 + 3 = 10 dice; +1 bonus = 11
    });
    expect(r.outcome).toBe('hit');
    expect(r.damageRollTotal).toBe(11);
    expect(r.damageDealt).toBe(11 - 2);
    expect(r.damageBreakdown).toEqual({
      diceTotal: 10,
      flatBonus: 1,
      critMultiplier: 1,
    });
  });

  it('Critical Hit multiplies BOTH dice damage AND the Warrior +1 bonus', () => {
    const r = resolveAttack({
      ...longswordAttack,
      flatDamageBonus: 1,
      manualBn: [9], // crit (dice ≥ 9, total ≥ DN)
      manualDamage: [7], // (10 dice + 1 bonus) × 2 = 22
    });
    expect(r.outcome).toBe('critical-hit');
    expect(r.damageRollTotal).toBe(11); // pre-multiplier
    expect(r.damageDealt).toBe(22 - 2);
    expect(r.damageBreakdown).toEqual({
      diceTotal: 10,
      flatBonus: 1,
      critMultiplier: 2,
    });
  });

  it('Perfect Success scales the flat bonus too', () => {
    const r = resolveAttack({
      ...longswordAttack,
      flatDamageBonus: 1,
      manualBn: [10],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('perfect-success');
    expect(r.damageDealt).toBe(11 * 2 - 2);
    expect(r.damageBreakdown.critMultiplier).toBe(2);
  });

  it('flat bonus is exempt from the weapon-max cap (Rule §06 §1)', () => {
    // 1D10+3 base max = 13. Spend 1 LUC die on damage → 2 dice, manual [10,10] = 23
    // capped to 13. Then +1 Warrior bonus → 14. Crit ×2 = 28. Absorption 0.
    const r = resolveAttack({
      ...longswordAttack,
      targetAbsorption: 0,
      damageLucDice: 1,
      flatDamageBonus: 1,
      manualBn: [9],
      manualDamage: [10, 10],
    });
    expect(r.damageBreakdown.diceTotal).toBe(13); // capped
    expect(r.damageRollTotal).toBe(14); // 13 + 1 bonus
    expect(r.damageDealt).toBe(28);
  });

  it('Total Failure: bonus does not apply (no damage roll)', () => {
    const r = resolveAttack({
      ...longswordAttack,
      flatDamageBonus: 1,
      manualBn: [1],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('total-failure');
    expect(r.damageDealt).toBe(0);
    expect(r.damageBreakdown).toEqual({
      diceTotal: 0,
      flatBonus: 0,
      critMultiplier: 0,
    });
  });

  it('Miss: bonus does not apply (no damage roll)', () => {
    const r = resolveAttack({
      ...longswordAttack,
      targetDN: 30,
      flatDamageBonus: 1,
      manualBn: [3],
      manualDamage: [7],
    });
    expect(r.outcome).toBe('miss');
    expect(r.damageBreakdown.flatBonus).toBe(0);
  });

  it('multiple flat bonuses sum at the call site (forward-compat for techniques)', () => {
    const r = resolveAttack({
      ...longswordAttack,
      flatDamageBonus: 1 + 2, // +1 Warrior, +2 Technique (caller sums)
      manualBn: [5],
      manualDamage: [7],
    });
    expect(r.damageRollTotal).toBe(13); // 10 dice + 3 bonus
    expect(r.damageBreakdown.flatBonus).toBe(3);
  });

  it('omitted flatDamageBonus defaults to 0 (regression guard for non-Warriors)', () => {
    const r = resolveAttack({
      ...longswordAttack,
      manualBn: [9],
      manualDamage: [7],
    });
    // Pre-fix behavior: 10 × 2 - 2 = 18.
    expect(r.damageDealt).toBe(18);
    expect(r.damageBreakdown.flatBonus).toBe(0);
  });

  it('resolves bastard-sword 1H vs 2H damage', () => {
    const oneH = resolveAttack({
      baseBN: 4,
      weaponBnModifier: 0,
      weaponSkillLevel: 0,
      criticalValue: 9,
      damageFormula: '1D10+3(5)',
      bastardGrip: '1H',
      targetDN: 5,
      targetAbsorption: 0,
      manualBn: [6], // hit
      manualDamage: [7],
    });
    expect(oneH.damageRollTotal).toBe(7 + 3);

    const twoH = resolveAttack({
      baseBN: 4,
      weaponBnModifier: 0,
      weaponSkillLevel: 0,
      criticalValue: 9,
      damageFormula: '1D10+3(5)',
      bastardGrip: '2H',
      targetDN: 5,
      targetAbsorption: 0,
      manualBn: [6],
      manualDamage: [7],
    });
    expect(twoH.damageRollTotal).toBe(7 + 5);
  });
});
