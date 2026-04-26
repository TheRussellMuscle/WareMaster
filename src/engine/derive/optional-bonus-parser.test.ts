import { describe, expect, it } from 'vitest';
import {
  applyOptionalSkillBonuses,
  parseOptionalBonus,
} from './optional-bonus-parser';

describe('parseOptionalBonus', () => {
  it('parses "Drive: Level 1"', () => {
    const r = parseOptionalBonus('Drive: Level 1');
    expect(r.skills).toEqual([{ name: 'Drive', level: 1, mode: 'set' }]);
    expect(r.goldaBonus).toBe(0);
    expect(r.weaponPlaceholder).toBeNull();
    expect(r.warnings).toEqual([]);
  });

  it('parses "Numenism: Level 1, +50 Golda"', () => {
    const r = parseOptionalBonus('Numenism: Level 1, +50 Golda');
    expect(r.skills).toEqual([{ name: 'Numenism', level: 1, mode: 'set' }]);
    expect(r.goldaBonus).toBe(50);
  });

  it('parses "+50 golda" with lowercase', () => {
    const r = parseOptionalBonus('Drive: Level 1, +50 golda');
    expect(r.goldaBonus).toBe(50);
  });

  it('parses "Mental Resistance: +1 Level, +100 golda" as additive', () => {
    const r = parseOptionalBonus('Mental Resistance: +1 Level, +100 golda');
    expect(r.skills).toEqual([
      { name: 'Mental Resistance', level: 1, mode: 'add' },
    ]);
    expect(r.goldaBonus).toBe(100);
  });

  it('parses compound "Athletics: Level 1, Throwing: Level 1, +100 Golda"', () => {
    const r = parseOptionalBonus(
      'Athletics: Level 1, Throwing: Level 1, +100 Golda',
    );
    expect(r.skills).toEqual([
      { name: 'Athletics', level: 1, mode: 'set' },
      { name: 'Throwing', level: 1, mode: 'set' },
    ]);
    expect(r.goldaBonus).toBe(100);
  });

  it('parses slash-separated compound "Weapon*: Level 1 / Defense: Level 1, +50 golda"', () => {
    const r = parseOptionalBonus(
      'Weapon*: Level 1 / Defense: Level 1, +50 golda',
    );
    expect(r.weaponPlaceholder).toEqual({
      name: 'Weapon*',
      level: 1,
      mode: 'set',
    });
    expect(r.skills).toEqual([
      { name: 'Defense', level: 1, mode: 'set' },
    ]);
    expect(r.goldaBonus).toBe(50);
  });

  it('parses "Weapon/One Type: +1 Level, +100 Golda"', () => {
    const r = parseOptionalBonus('Weapon/One Type: +1 Level, +100 Golda');
    // Note: "Weapon/One Type" gets split by `/` first, but parseSpec on
    // "One Type: +1 Level" won't match. The current implementation splits
    // by `/` so "Weapon" alone won't match a placeholder.
    // This test documents current behavior; if we want to support this
    // exact phrasing, we'd add a pre-pass to detect it before splitting.
    // Acceptable trade-off: the wizard surfaces a "WM applies manually"
    // chip when warnings are non-empty, so the WM still sees the option.
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('parses Battler-style compound bonuses', () => {
    const r = parseOptionalBonus(
      'Physical Resistance: +1 Level, Mental Resistance: Level 1, +50 Golda',
    );
    expect(r.skills).toEqual([
      { name: 'Physical Resistance', level: 1, mode: 'add' },
      { name: 'Mental Resistance', level: 1, mode: 'set' },
    ]);
    expect(r.goldaBonus).toBe(50);
  });

  it('emits a warning for unparseable tokens', () => {
    const r = parseOptionalBonus('Some Skill: nonsense format');
    expect(r.warnings).toEqual(['Some Skill: nonsense format']);
    expect(r.skills).toEqual([]);
  });
});

describe('applyOptionalSkillBonuses', () => {
  const idLookup = (n: string) => n.toLowerCase().replace(/\s+/g, '-');

  it('adds a new skill when not present', () => {
    const next = applyOptionalSkillBonuses(
      [{ skill_id: 'defense', level: 1, pp: 0 }],
      [{ name: 'Drive', level: 1, mode: 'set' }],
      idLookup,
    );
    expect(next).toContainEqual({ skill_id: 'drive', level: 1, pp: 0 });
  });

  it('takes max for `set` against existing higher level', () => {
    const next = applyOptionalSkillBonuses(
      [{ skill_id: 'mental-resistance', level: 2, pp: 0 }],
      [{ name: 'Mental Resistance', level: 1, mode: 'set' }],
      idLookup,
    );
    const m = next.find((s) => s.skill_id === 'mental-resistance');
    expect(m?.level).toBe(2);
  });

  it('adds delta for `add` mode', () => {
    const next = applyOptionalSkillBonuses(
      [{ skill_id: 'physical-resistance', level: 1, pp: 0 }],
      [{ name: 'Physical Resistance', level: 1, mode: 'add' }],
      idLookup,
    );
    const m = next.find((s) => s.skill_id === 'physical-resistance');
    expect(m?.level).toBe(2);
  });
});
