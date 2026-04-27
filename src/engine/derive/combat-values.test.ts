import { describe, expect, it } from 'vitest';
import { deriveCombatValues } from './combat-values';
import type { Character } from '@/domain/character';
import type { ClassId } from '@/domain/class';

function mkCharacter(classId: ClassId): Character {
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
    class_id: classId,
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
      current_segment: null,
    },
    custom_items: [],
    portrait_path: null,
    notes_path: null,
    created_at: '',
    updated_at: '',
  };
}

describe('deriveCombatValues — Warrior bonuses', () => {
  it('Warrior gets +1 absorption AND +1 damage bonus', () => {
    const d = deriveCombatValues(mkCharacter('warrior'), null);
    expect(d.warriorAbsorptionBonus).toBe(1);
    expect(d.warriorDamageBonus).toBe(1);
    expect(d.totalAbsorption).toBe(1); // no armor + warrior bonus
  });

  it.each<ClassId>(['word-caster', 'spiritualist', 'tradesfolk'])(
    'non-Warrior class %s gets no warrior bonuses',
    (classId) => {
      const d = deriveCombatValues(mkCharacter(classId), null);
      expect(d.warriorAbsorptionBonus).toBe(0);
      expect(d.warriorDamageBonus).toBe(0);
      expect(d.totalAbsorption).toBe(0);
    },
  );
});
