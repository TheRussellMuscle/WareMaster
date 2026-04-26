import { describe, expect, it } from 'vitest';
import {
  detectPlaceholders,
  resolveSkillPackage,
  applyOptionalWeaponBonus,
} from './skill-resolution';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

function stubCatalog(): ReferenceCatalog {
  return {
    classes: { classes: [] },
    skills: {
      skills: [
        {
          id: 'longsword',
          name: 'Longsword',
          category: 'combat',
          attribute: 'AGI',
          source: 'test',
        },
        {
          id: 'dagger',
          name: 'Dagger',
          category: 'combat',
          attribute: 'AGI',
          source: 'test',
        },
        {
          id: 'defense',
          name: 'Defense',
          category: 'combat',
          attribute: 'AGI',
          source: 'test',
        },
        {
          id: 'riding',
          name: 'Riding',
          category: 'adventure-physical',
          attribute: 'AGI',
          source: 'test',
        },
        {
          id: 'physical-resistance',
          name: 'Physical Resistance',
          category: 'adventure-physical',
          attribute: 'CON',
          source: 'test',
        },
        {
          id: 'astronomy',
          name: 'Astronomy',
          category: 'adventure-mental',
          attribute: 'SEN',
          source: 'test',
        },
        {
          id: 'word-casting',
          name: 'Word-Casting',
          category: 'specialized',
          attribute: null,
          source: 'test',
        },
      ],
    },
    weapons: {
      weapons: [
        {
          id: 'longsword',
          name: 'Longsword',
          source: 'test',
          category: 'swords',
          hands: 1,
          critical_value: 8,
          bn_modifier: { melee: 0, charge: -2, range: null },
          damage_value: { melee: '1D10', ranged: null },
          price_golda: 25,
        },
        {
          id: 'dagger',
          name: 'Dagger',
          source: 'test',
          category: 'daggers',
          hands: 1,
          critical_value: 8,
          bn_modifier: { melee: 3, charge: 0, range: 1 },
          damage_value: { melee: '1D5-1', ranged: '1D5-2' },
          price_golda: 10,
        },
      ],
    },
    armor: [],
    generalGoods: {
      starter_kit: { description: 'test', items: [] },
      goods: [],
    },
    beastiary: { monsters: [] },
    ryudeUnits: { ryude_units: [] },
    ryudeEquipment: { ryude_weapons: [], ryude_armor: [] },
    tables: {} as ReferenceCatalog['tables'],
    techniques: {
      wordCasting: {},
      numeticArts: { discipline: 'numetic-arts', techniques: [] },
      invocations: { discipline: 'invocation', techniques: [] },
    },
  };
}

describe('detectPlaceholders', () => {
  it('finds Weapon* placeholders', () => {
    const slots = detectPlaceholders([
      { name: 'Weapon*', level: 2 },
      { name: 'Defense', level: 1 },
    ]);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.kind).toBe('weapon');
    expect(slots[0]?.level).toBe(2);
    expect(slots[0]?.rawName).toBe('Weapon*');
  });

  it('finds Weapon/One Type placeholders (alternate spelling)', () => {
    const slots = detectPlaceholders([
      { name: 'Weapon/One Type', level: 2 },
    ]);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.rawName).toBe('Weapon/One Type');
  });

  it('returns empty when no placeholders present', () => {
    const slots = detectPlaceholders([
      { name: 'Defense', level: 1 },
      { name: 'Riding', level: 2 },
    ]);
    expect(slots).toEqual([]);
  });
});

describe('resolveSkillPackage', () => {
  const catalog = stubCatalog();

  it('resolves a Battler-style package with all level allocated to one weapon', () => {
    const result = resolveSkillPackage(
      [
        { name: 'Weapon*', level: 2 },
        { name: 'Defense', level: 1 },
        { name: 'Riding', level: 2 },
        { name: 'Physical Resistance', level: 1 },
      ],
      {
        'pkg:weapon:0': [{ specificId: 'longsword', level: 2 }],
      },
      catalog,
    );
    expect(result.errors).toEqual([]);
    expect(result.skills).toContainEqual({ skill_id: 'longsword', level: 2, pp: 0 });
    expect(result.skills).toContainEqual({ skill_id: 'defense', level: 1, pp: 0 });
    expect(result.skills).toContainEqual({ skill_id: 'riding', level: 2, pp: 0 });
    expect(result.skills).toContainEqual({
      skill_id: 'physical-resistance',
      level: 1,
      pp: 0,
    });
    expect(result.skills.find((s) => s.skill_id.startsWith('weapon'))).toBeUndefined();
  });

  it('resolves a split allocation across two weapons', () => {
    const result = resolveSkillPackage(
      [{ name: 'Weapon/One Type', level: 2 }],
      {
        'pkg:weapon:0': [
          { specificId: 'longsword', level: 1 },
          { specificId: 'dagger', level: 1 },
        ],
      },
      catalog,
    );
    expect(result.errors).toEqual([]);
    expect(result.skills).toContainEqual({ skill_id: 'longsword', level: 1, pp: 0 });
    expect(result.skills).toContainEqual({ skill_id: 'dagger', level: 1, pp: 0 });
  });

  it('errors when allocation does not sum to placeholder level', () => {
    const result = resolveSkillPackage(
      [{ name: 'Weapon*', level: 2 }],
      {
        'pkg:weapon:0': [{ specificId: 'longsword', level: 1 }],
      },
      catalog,
    );
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/Lv 2/);
  });

  it('errors when no allocation provided', () => {
    const result = resolveSkillPackage(
      [{ name: 'Weapon*', level: 2 }],
      {},
      catalog,
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown weapon ids', () => {
    const result = resolveSkillPackage(
      [{ name: 'Weapon*', level: 2 }],
      {
        'pkg:weapon:0': [{ specificId: 'plasma-rifle', level: 2 }],
      },
      catalog,
    );
    expect(result.errors.some((e) => e.includes('plasma-rifle'))).toBe(true);
  });

  it('appends extra skills (Word-Caster paired) at the requested level', () => {
    const result = resolveSkillPackage(
      [
        { name: 'Riding', level: 1 },
        { name: 'Mental Resistance', level: 1 },
      ],
      {},
      catalog,
      [
        { name: 'Word-Casting', level: 2 },
        { name: 'Astronomy', level: 2 },
      ],
    );
    expect(result.skills).toContainEqual({ skill_id: 'word-casting', level: 2, pp: 0 });
    expect(result.skills).toContainEqual({ skill_id: 'astronomy', level: 2, pp: 0 });
  });

  it('does not double-add when extra skill is already in package at higher level', () => {
    const result = resolveSkillPackage(
      [{ name: 'Astronomy', level: 3 }],
      {},
      catalog,
      [{ name: 'Astronomy', level: 2 }],
    );
    const astro = result.skills.find((s) => s.skill_id === 'astronomy');
    expect(astro?.level).toBe(3);
  });
});

describe('applyOptionalWeaponBonus', () => {
  it('adds the bonus to an existing weapon skill', () => {
    const next = applyOptionalWeaponBonus(
      [{ skill_id: 'longsword', level: 2, pp: 0 }],
      { specificId: 'longsword', level: 1 },
    );
    expect(next).toContainEqual({ skill_id: 'longsword', level: 3, pp: 0 });
  });

  it('appends a new skill when the weapon is not yet present', () => {
    const next = applyOptionalWeaponBonus(
      [{ skill_id: 'defense', level: 1, pp: 0 }],
      { specificId: 'dagger', level: 1 },
    );
    expect(next).toContainEqual({ skill_id: 'dagger', level: 1, pp: 0 });
  });

  it('is a no-op when bonus is null', () => {
    const skills = [{ skill_id: 'longsword', level: 2, pp: 0 }];
    expect(applyOptionalWeaponBonus(skills, null)).toEqual(skills);
  });
});
