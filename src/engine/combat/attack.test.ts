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
