import { describe, expect, it } from 'vitest';
import { deriveStatus, effectiveStatus } from './status';
import type { Character } from '@/domain/character';
import type { DerivedCombatValues } from './combat-values';

function mkCharacter(overrides: Partial<Character['state']> = {}): Character {
  return {
    schema_version: 1,
    id: 'cha_test',
    campaign_id: 'cmp_test',
    name: 'Test',
    age: null,
    gender: '',
    title: '',
    homeland: '',
    current_home: '',
    family_relationships: '',
    personality_notes: '',
    ryude_name: '',
    class_id: 'warrior',
    memory_points_spent: 0,
    spiritualist_doctrine: '',
    spiritualist_restrictions: '',
    spiritualist_special_implements: '',
    skill_package_id: 'battler',
    equipment_package_id: null,
    appearance_modifier: 0,
    abilities: { SEN: 9, AGI: 9, WIL: 9, CON: 10, CHA: 9, LUC: 9 },
    skills: [],
    techniques: [],
    equipment: {
      weapons: [],
      body_armor: null,
      head_armor: null,
      shield: null,
      other: [],
      bastard_sword_grip: '1H',
    },
    golda: 0,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: 9,
    state: {
      physical_damage: 0,
      mental_damage: 0,
      available_luc: 9,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
      ...overrides,
    },
    portrait_path: null,
    notes_path: null,
    created_at: '',
    updated_at: '',
  };
}

const derived: Pick<DerivedCombatValues, 'physicalDurability' | 'mentalDurability'> = {
  physicalDurability: 10,
  mentalDurability: 10,
};

describe('deriveStatus (Rule §09)', () => {
  it('returns fine at zero damage', () => {
    expect(deriveStatus(mkCharacter(), derived)).toBe('fine');
  });

  it('returns fine when damage equals durability (Light cap)', () => {
    expect(
      deriveStatus(mkCharacter({ physical_damage: 10 }), derived),
    ).toBe('fine');
  });

  it('returns heavy-physical when phys damage > durability', () => {
    expect(
      deriveStatus(mkCharacter({ physical_damage: 11 }), derived),
    ).toBe('heavy-physical');
  });

  it('returns heavy-mental when mental damage > durability', () => {
    expect(
      deriveStatus(mkCharacter({ mental_damage: 11 }), derived),
    ).toBe('heavy-mental');
  });

  it('returns incap-physical at 2x + 1 phys damage', () => {
    expect(
      deriveStatus(mkCharacter({ physical_damage: 21 }), derived),
    ).toBe('incap-physical');
  });

  it('returns incap-mental at 2x + 1 mental damage', () => {
    expect(
      deriveStatus(mkCharacter({ mental_damage: 21 }), derived),
    ).toBe('incap-mental');
  });

  it('returns dead at 3x phys damage', () => {
    expect(
      deriveStatus(mkCharacter({ physical_damage: 30 }), derived),
    ).toBe('dead');
  });

  it('returns insane at 3x mental damage', () => {
    expect(
      deriveStatus(mkCharacter({ mental_damage: 30 }), derived),
    ).toBe('insane');
  });

  it('prefers death over incap when both phys and mental are extreme', () => {
    expect(
      deriveStatus(
        mkCharacter({ physical_damage: 30, mental_damage: 22 }),
        derived,
      ),
    ).toBe('dead');
  });
});

describe('effectiveStatus', () => {
  it('returns derived status when no override', () => {
    expect(
      effectiveStatus(mkCharacter({ physical_damage: 11 }), derived),
    ).toBe('heavy-physical');
  });

  it('returns stored status verbatim when override is set', () => {
    expect(
      effectiveStatus(
        mkCharacter({
          physical_damage: 0,
          status: 'heavy-mental',
          status_override: true,
        }),
        derived,
      ),
    ).toBe('heavy-mental');
  });
});
