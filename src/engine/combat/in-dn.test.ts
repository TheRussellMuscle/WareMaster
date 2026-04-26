import { describe, expect, it } from 'vitest';
import { applyAbsorptionModifier, rollInDn } from './in-dn';

describe('rollInDn (Rule §08)', () => {
  it('computes IN and DN from the same dice with different bases', () => {
    const r = rollInDn({ baseIN: 4, baseDN: 7, manual: [6] });
    expect(r.inValue).toBe(4 + 6);
    expect(r.dnValue).toBe(7 + 6);
    expect(r.absorptionModifier).toBe(1);
    expect(r.defensePpGain).toBe(0);
  });

  it('Perfect Success (all 10s) doubles absorption and grants Defense PP', () => {
    const r = rollInDn({ baseIN: 4, baseDN: 7, manual: [10] });
    expect(r.absorptionModifier).toBe(2);
    expect(r.defensePpGain).toBe(10);
    expect(r.roll.outcome).toBe('perfect-success');
  });

  it('Total Failure (all 1s) halves absorption and grants half Defense PP', () => {
    const r = rollInDn({ baseIN: 4, baseDN: 7, manual: [1] });
    expect(r.absorptionModifier).toBe(0.5);
    expect(r.defensePpGain).toBe(5);
    expect(r.roll.outcome).toBe('total-failure');
  });

  it('LUC dice multiply Defense PP gain', () => {
    const r = rollInDn({
      baseIN: 4,
      baseDN: 7,
      lucDice: 2,
      manual: [10, 10, 10],
    });
    expect(r.absorptionModifier).toBe(2);
    expect(r.defensePpGain).toBe(10 * 3);
  });

  it('Total Failure with LUC dice requires every die to be 1', () => {
    const r = rollInDn({
      baseIN: 4,
      baseDN: 7,
      lucDice: 1,
      manual: [1, 5],
    });
    expect(r.absorptionModifier).toBe(1);
    expect(r.defensePpGain).toBe(0);
  });
});

describe('applyAbsorptionModifier', () => {
  it('×2 on Perfect Success', () => {
    expect(applyAbsorptionModifier(7, 2)).toBe(14);
  });

  it('floor(÷2) on Total Failure', () => {
    expect(applyAbsorptionModifier(7, 0.5)).toBe(3);
    expect(applyAbsorptionModifier(8, 0.5)).toBe(4);
    expect(applyAbsorptionModifier(0, 0.5)).toBe(0);
  });

  it('×1 on regular outcome', () => {
    expect(applyAbsorptionModifier(7, 1)).toBe(7);
  });
});
