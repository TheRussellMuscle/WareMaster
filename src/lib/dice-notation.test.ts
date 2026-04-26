import { describe, expect, it } from 'vitest';
import {
  parseBastardDiceFormula,
  parseDiceFormula,
  resolveDamageFormula,
} from './dice-notation';

describe('parseDiceFormula', () => {
  it('parses basic notation', () => {
    expect(parseDiceFormula('1D10')).toEqual({
      dice: 1,
      faces: 10,
      modifier: 0,
      min: 1,
      max: 10,
    });
  });

  it('parses positive modifier', () => {
    expect(parseDiceFormula('1D10+3')).toEqual({
      dice: 1,
      faces: 10,
      modifier: 3,
      min: 4,
      max: 13,
    });
  });

  it('parses negative modifier', () => {
    expect(parseDiceFormula('1D10-7')).toEqual({
      dice: 1,
      faces: 10,
      modifier: -7,
      min: -6,
      max: 3,
    });
  });

  it('parses multi-dice', () => {
    expect(parseDiceFormula('5D5+80')).toEqual({
      dice: 5,
      faces: 5,
      modifier: 80,
      min: 85,
      max: 105,
    });
  });

  it('is case-insensitive', () => {
    expect(parseDiceFormula('1d10+3')).toEqual(parseDiceFormula('1D10+3'));
  });

  it('strips whitespace', () => {
    expect(parseDiceFormula(' 1 D 10 + 3 ')).toEqual(parseDiceFormula('1D10+3'));
  });

  it('throws on empty input', () => {
    expect(() => parseDiceFormula('')).toThrow();
  });

  it('throws on garbage', () => {
    expect(() => parseDiceFormula('garbage')).toThrow();
    expect(() => parseDiceFormula('D10')).toThrow();
    expect(() => parseDiceFormula('1D')).toThrow();
  });

  it('throws when given bastard-sword notation', () => {
    expect(() => parseDiceFormula('1D10+3(5)')).toThrow(/bastard/);
  });
});

describe('parseBastardDiceFormula', () => {
  it('returns both grip variants', () => {
    const result = parseBastardDiceFormula('1D10+3(5)');
    expect(result.oneHanded).toEqual({
      dice: 1,
      faces: 10,
      modifier: 3,
      min: 4,
      max: 13,
    });
    expect(result.twoHanded).toEqual({
      dice: 1,
      faces: 10,
      modifier: 5,
      min: 6,
      max: 15,
    });
  });

  it('throws on regular notation', () => {
    expect(() => parseBastardDiceFormula('1D10+3')).toThrow();
  });
});

describe('resolveDamageFormula', () => {
  it('resolves regular notation without grip', () => {
    expect(resolveDamageFormula('1D10+3')).toEqual({
      dice: 1,
      faces: 10,
      modifier: 3,
      min: 4,
      max: 13,
    });
  });

  it('resolves bastard 1H', () => {
    expect(resolveDamageFormula('1D10+3(5)', '1H').modifier).toBe(3);
  });

  it('resolves bastard 2H', () => {
    expect(resolveDamageFormula('1D10+3(5)', '2H').modifier).toBe(5);
  });

  it('throws on bastard without grip', () => {
    expect(() => resolveDamageFormula('1D10+3(5)')).toThrow(/grip/);
  });
});
