import { describe, expect, it } from 'vitest';
import {
  applyLucRestore,
  applyLucSpend,
  applyPpGain,
  skillCheck,
} from './skill-check';
import type { Skill } from '@/domain/skill';
import type { Abilities, Character, SkillEntry } from '@/domain/character';

const longsword: Skill = {
  id: 'longsword',
  name: 'Longsword',
  category: 'combat',
  attribute: 'AGI',
  source: 'test',
};

const negotiation: Skill = {
  id: 'negotiation',
  name: 'Negotiation',
  category: 'adventure-mental',
  attribute: 'CHA',
  source: 'test',
};

const wordCasting: Skill = {
  id: 'word-casting-fire',
  name: 'Word-Casting/Fire',
  category: 'specialized',
  attribute: null,
  source: 'test',
};

const balancedAbilities: Abilities = {
  SEN: 12,
  AGI: 12,
  WIL: 12,
  CON: 12,
  CHA: 12,
  LUC: 9,
};

describe('skillCheck', () => {
  it('uses floor(score/3) of the governing ability as Base', () => {
    // CHA 12 ⇒ Base 4. Skill Lv 2. Manual=5 ⇒ total = 5+4+2 = 11.
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 2, pp: 0 },
      difficulty: 8,
      manual: [5],
    });
    expect(result.roll.baseAttribute).toBe(4);
    expect(result.roll.skillLevel).toBe(2);
    expect(result.roll.total).toBe(11);
    expect(result.roll.outcome).toBe('success');
  });

  it('flags untrained when the character has no skill entry', () => {
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      difficulty: 6,
      manual: [3],
    });
    expect(result.untrained).toBe(true);
    expect(result.roll.skillLevel).toBe(0);
  });

  it('halves PP for untrained skills on perfect-success', () => {
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      difficulty: 5,
      manual: [10],
    });
    expect(result.untrained).toBe(true);
    // Non-Critical PP base = 10 PP; halved = 5.
    expect(result.ppGain).toBe(5);
  });

  it('full PP for trained skills on perfect-success', () => {
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 1, pp: 0 },
      difficulty: 5,
      manual: [10],
    });
    expect(result.untrained).toBe(false);
    expect(result.ppGain).toBe(10);
  });

  it('multiplies PP by total dice when LUC was spent', () => {
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 1, pp: 0 },
      difficulty: 5,
      lucDice: 2,
      manual: [10, 10, 10],
    });
    expect(result.ppGain).toBe(10 * 3);
  });

  it('restores LUC × bonusMultiplier on perfect-success of non-combat skill', () => {
    const result = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 1, pp: 0 },
      difficulty: 5,
      lucDice: 2,
      manual: [10, 10, 10],
    });
    expect(result.lucRestored).toBe(1 * 3);
  });

  it('does NOT restore LUC on perfect-success of a combat skill', () => {
    const result = skillCheck({
      skill: longsword,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'longsword', level: 2, pp: 0 },
      difficulty: 5,
      manual: [10],
    });
    expect(result.roll.outcome).toBe('perfect-success');
    expect(result.lucRestored).toBe(0);
  });

  it('selects PP table by impact', () => {
    const minimal = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 1, pp: 0 },
      difficulty: 5,
      impact: 'minimal',
      manual: [10],
    });
    expect(minimal.ppGain).toBe(5);

    const tremendous = skillCheck({
      skill: negotiation,
      abilities: balancedAbilities,
      skillEntry: { skill_id: 'negotiation', level: 1, pp: 0 },
      difficulty: 5,
      impact: 'tremendous',
      manual: [10],
    });
    expect(tremendous.ppGain).toBe(20);
  });

  it('throws when specialized skill has no abilityOverride', () => {
    expect(() =>
      skillCheck({
        skill: wordCasting,
        abilities: balancedAbilities,
        difficulty: 8,
        manual: [5],
      }),
    ).toThrow(/abilityOverride/);
  });

  it('uses abilityOverride for specialized skills', () => {
    const result = skillCheck({
      skill: wordCasting,
      abilities: balancedAbilities,
      abilityOverride: 'WIL',
      skillEntry: { skill_id: 'word-casting-fire', level: 2, pp: 0 },
      difficulty: 8,
      manual: [5],
    });
    // WIL 12 ⇒ Base 4. Skill Lv 2. Manual=5 ⇒ 5+4+2 = 11.
    expect(result.roll.baseAttribute).toBe(4);
    expect(result.roll.total).toBe(11);
    expect(result.roll.outcome).toBe('success');
  });

  it('rejects LUC as a skill check governing ability', () => {
    expect(() =>
      skillCheck({
        skill: { ...wordCasting },
        abilities: balancedAbilities,
        abilityOverride: 'LUC',
        manual: [5],
      }),
    ).toThrow(/LUC/);
  });
});

describe('applyPpGain', () => {
  function mkChar(skills: SkillEntry[]): Character {
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
      skill_package_id: 'all-rounder',
      equipment_package_id: null,
      appearance_modifier: 0,
      abilities: balancedAbilities,
      skills,
      techniques: [],
      equipment: {
        weapons: [],
        body_armor: null,
        head_armor: null,
        shield: null,
        other: [],
        bastard_sword_grip: '1H',
      },
      custom_items: [],
      golda: 0,
      completion_bonus: 0,
      luc_reserves: 0,
      initial_luc: 9,
      state: {
        physical_damage: 0,
        mental_damage: 0,
        available_luc: 5,
        status: 'fine',
        status_override: false,
        active_effects: [],
        last_recovery_tick: 0,
        current_segment: null,
      },
      portrait_path: null,
      notes_path: null,
      created_at: '',
      updated_at: '',
    };
  }

  it('adds an untrained skill at Level 0 with the awarded PP', () => {
    const char = mkChar([]);
    const next = applyPpGain(char, 'negotiation', 5);
    expect(next).toEqual([{ skill_id: 'negotiation', level: 0, pp: 5 }]);
  });

  it('adds PP to an existing skill entry', () => {
    const char = mkChar([{ skill_id: 'negotiation', level: 2, pp: 30 }]);
    const next = applyPpGain(char, 'negotiation', 10);
    expect(next).toEqual([{ skill_id: 'negotiation', level: 2, pp: 40 }]);
  });

  it('returns the original list when ppGain ≤ 0', () => {
    const char = mkChar([]);
    expect(applyPpGain(char, 'negotiation', 0)).toBe(char.skills);
    expect(applyPpGain(char, 'negotiation', -3)).toBe(char.skills);
  });
});

describe('applyLucRestore', () => {
  it('caps Available LUC at initial_luc', () => {
    const char: Character = {
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
      skill_package_id: 'all-rounder',
      equipment_package_id: null,
      appearance_modifier: 0,
      abilities: balancedAbilities,
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
      custom_items: [],
      golda: 0,
      completion_bonus: 0,
      luc_reserves: 0,
      initial_luc: 9,
      state: {
        physical_damage: 0,
        mental_damage: 0,
        available_luc: 8,
        status: 'fine',
        status_override: false,
        active_effects: [],
        last_recovery_tick: 0,
        current_segment: null,
      },
      portrait_path: null,
      notes_path: null,
      created_at: '',
      updated_at: '',
    };
    expect(applyLucRestore(char, 5)).toBe(9);
  });
});

describe('applyLucSpend', () => {
  function withAvailableLuc(n: number): Character {
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
      skill_package_id: 'all-rounder',
      equipment_package_id: null,
      appearance_modifier: 0,
      abilities: balancedAbilities,
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
      custom_items: [],
      golda: 0,
      completion_bonus: 0,
      luc_reserves: 0,
      initial_luc: 9,
      state: {
        physical_damage: 0,
        mental_damage: 0,
        available_luc: n,
        status: 'fine',
        status_override: false,
        active_effects: [],
        last_recovery_tick: 0,
        current_segment: null,
      },
      portrait_path: null,
      notes_path: null,
      created_at: '',
      updated_at: '',
    };
  }

  it('returns current available_luc when nothing was spent', () => {
    expect(applyLucSpend(withAvailableLuc(5), 0)).toBe(5);
  });

  it('treats negative spend as no-op', () => {
    expect(applyLucSpend(withAvailableLuc(5), -3)).toBe(5);
  });

  it('subtracts spent from available_luc', () => {
    expect(applyLucSpend(withAvailableLuc(5), 2)).toBe(3);
  });

  it('floors at 0 (cannot go negative)', () => {
    expect(applyLucSpend(withAvailableLuc(2), 5)).toBe(0);
  });

  it('composes correctly with applyLucRestore (spend first then restore)', () => {
    const char = withAvailableLuc(5);
    const afterSpend = applyLucSpend(char, 2);
    const charAfterSpend: Character = {
      ...char,
      state: { ...char.state, available_luc: afterSpend },
    };
    expect(afterSpend).toBe(3);
    expect(applyLucRestore(charAfterSpend, 1)).toBe(4);
  });
});
